import { MonitoringExtension, ServiceInfo, ServiceStatus } from "../types";
import { Client } from "ssh2";
import {
  decryptPrivateKey,
  generateKeyPair,
  encryptPrivateKey,
} from "@/lib/ssh-keys";
import { LinuxServerConfig } from "./types";

/**
 * Execute multiple commands on a remote Linux server via SSH in a single connection.
 * Commands are executed in parallel for maximum speed.
 */
async function executeSSHCommands(
  host: string,
  port: number,
  privateKey: string,
  commands: string[],
  timeoutMs = 10000
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    const outputs: string[] = new Array(commands.length).fill("");
    let completed = 0;
    let hasTimedOut = false;

    const timeout = setTimeout(() => {
      hasTimedOut = true;
      conn.end();
      reject(new Error("SSH connection timeout"));
    }, timeoutMs);

    const checkComplete = () => {
      if (completed === commands.length && !hasTimedOut) {
        clearTimeout(timeout);
        conn.end();
        resolve(outputs);
      }
    };

    conn.on("ready", () => {
      // Execute all commands in parallel
      commands.forEach((command, index) => {
        let output = "";

        conn.exec(command, (err, stream) => {
          if (err) {
            outputs[index] = "";
            completed++;
            checkComplete();
            return;
          }

          stream.on("data", (data: Buffer) => {
            output += data.toString();
          });

          stream.stderr.on("data", (data: Buffer) => {
            output += data.toString();
          });

          stream.on("close", () => {
            outputs[index] = output.trim();
            completed++;
            checkComplete();
          });
        });
      });
    });

    conn.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    conn.connect({
      host,
      port,
      username: "root",
      privateKey: Buffer.from(privateKey, "utf8"),
      readyTimeout: timeoutMs,
      algorithms: {
        serverHostKey: ["ssh-ed25519", "ssh-rsa"],
      },
    });
  });
}

/**
 * Parse CPU usage from two /proc/stat snapshots.
 * Returns percentage (0-100) or null if parsing fails.
 * Format: Two lines, each "cpu user nice system idle ..."
 */
function parseCPUUsage(output: string): number | null {
  try {
    const lines = output.trim().split('\n');
    if (lines.length < 2) return null;
    
    const parse = (line: string) => {
      // Parse all fields: user, nice, system, idle, iowait, irq, softirq, steal
      const parts = line.replace(/\s+/g, ' ').split(' ');
      if (parts[0] !== 'cpu') return null;
      
      const val = (idx: number) => parseInt(parts[idx], 10) || 0;
      
      return {
        user: val(1),
        nice: val(2),
        system: val(3),
        idle: val(4),
        iowait: val(5),
        irq: val(6),
        softirq: val(7),
        steal: val(8),
      };
    };
    
    const stat1 = parse(lines[0]);
    const stat2 = parse(lines[1]);
    
    if (!stat1 || !stat2) return null;
    
    const getActive = (s: NonNullable<ReturnType<typeof parse>>) => 
      s.user + s.nice + s.system + s.irq + s.softirq + s.steal;
      
    const getTotal = (s: NonNullable<ReturnType<typeof parse>>) => 
      s.user + s.nice + s.system + s.idle + s.iowait + s.irq + s.softirq + s.steal;
    
    const total1 = getTotal(stat1);
    const total2 = getTotal(stat2);
    const active1 = getActive(stat1);
    const active2 = getActive(stat2);
    
    const totalDelta = total2 - total1;
    const activeDelta = active2 - active1;
    
    if (totalDelta === 0) return null;
    const usage = (activeDelta / totalDelta) * 100;
    return usage >= 0 && usage <= 100 ? Math.round(usage * 10) / 10 : null;
  } catch {
    return null;
  }
}

/**
 * Parse RAM usage from /proc/meminfo output.
 * Returns { total, used } in MB or null if parsing fails.
 * Format: "MemTotal: 16384000 kB\nMemAvailable: 8192000 kB"
 */
function parseRAMUsage(output: string): { total: number; used: number } | null {
  try {
    const lines = output.split('\n');
    let totalKB = 0;
    let availableKB = 0;

    for (const line of lines) {
      if (line.startsWith('MemTotal:')) {
        totalKB = parseInt(line.split(/\s+/)[1], 10);
      } else if (line.startsWith('MemAvailable:')) {
        availableKB = parseInt(line.split(/\s+/)[1], 10);
      }
    }

    if (totalKB > 0 && availableKB >= 0) {
      const totalMB = Math.round(totalKB / 1024);
      const usedMB = Math.round((totalKB - availableKB) / 1024);
      return { total: totalMB, used: usedMB };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Parse Network usage from /proc/net/dev output.
 * Returns bytes/sec of incoming traffic (sum of all non-lo interfaces).
 */
function parseNetworkUsage(output: string): number | null {
  try {
    const [part1, part2] = output.split('===SEP===');
    if (!part1 || !part2) return null;

    const parseBytes = (data: string) => {
      let total = 0;
      const lines = data.trim().split('\n');
      for (const line of lines) {
        // Format: "   eth0: 12345 ..." or "eth0:12345..."
        // Regex captures interface name and first number (RX bytes)
        const match = line.trim().match(/^([^:]+):\s*(\d+)/);
        if (match) {
          const iface = match[1];
          const bytes = parseInt(match[2], 10);
          // Ignore loopback
          if (iface !== 'lo' && !isNaN(bytes)) {
            total += bytes;
          }
        }
      }
      return total;
    };

    const bytes1 = parseBytes(part1);
    const bytes2 = parseBytes(part2);

    // Calculate rate over 0.5s
    const delta = bytes2 - bytes1;
    // Handle wrap-around or errors by ignoring negative values
    if (delta < 0) return null;

    // Convert 0.5s delta to B/s
    return Math.round(delta / 0.5);
  } catch {
    return null;
  }
}

export const linuxServerExtension: MonitoringExtension = {
  id: "linux-server",
  name: "Linux Server Monitoring",
  description: "Monitor CPU and RAM usage on remote Linux servers via SSH",
  configSchema: [
    {
      key: "host",
      label: "Server IP or Hostname",
      type: "text",
      required: true,
      description: "IP address or hostname of the Linux server",
      scope: "monitor",
    },
    {
      key: "port",
      label: "SSH Port",
      type: "number",
      defaultValue: 22,
      description: "SSH port (default: 22)",
      scope: "monitor",
    },
    {
      key: "enableCpu",
      label: "Monitor CPU Usage",
      type: "checkbox",
      defaultValue: true,
      description: "Collect CPU usage percentage",
      scope: "global",
    },
    {
      key: "enableRam",
      label: "Monitor RAM Usage",
      type: "checkbox",
      defaultValue: true,
      description: "Collect memory usage statistics",
      scope: "global",
    },
    {
      key: "enableNet",
      label: "Monitor Incoming Traffic",
      type: "checkbox",
      defaultValue: true,
      description: "Collect incoming network traffic rate",
      scope: "global",
    },
  ],
  fetchStatus: async (config: Record<string, any>): Promise<ServiceInfo[]> => {
    const {
      host,
      port = 22,
      enableCpu,
      enableRam,
      enableNet,
      encryptedPrivateKey,
    } = config as LinuxServerConfig;

    if (!encryptedPrivateKey) {
      return [
        {
          id: "system",
          name: "Server Status",
          type: "linux-server",
          status: "error",
          details: { error: "No SSH key configured" },
        },
      ];
    }

    try {
      // Decrypt the private key
      const privateKey = decryptPrivateKey(encryptedPrivateKey);

      const metrics: Record<string, any> = {};
      let hasError = false;

      // Build command list based on enabled metrics
      // Using direct /proc reads for maximum speed (no shell overhead)
      const commands: string[] = [];
      const commandTypes: ('cpu' | 'ram' | 'net')[] = [];

      if (enableCpu) {
        // Sample CPU usage with two /proc/stat reads (0.5s apart) for more accurate updates
        commands.push('s1=$(cat /proc/stat | head -n1); sleep 0.5; s2=$(cat /proc/stat | head -n1); echo "$s1"; echo "$s2"');
        commandTypes.push('cpu');
      }

      if (enableRam) {
        // Read /proc/meminfo directly and extract MemTotal and MemAvailable
        commands.push('awk \'/MemTotal|MemAvailable/ {print $1, $2}\' /proc/meminfo');
        commandTypes.push('ram');
      }

      if (enableNet) {
        // Measure network traffic over 0.5s
        commands.push('d1=$(grep ":" /proc/net/dev); sleep 0.5; d2=$(grep ":" /proc/net/dev); echo "$d1"; echo "===SEP==="; echo "$d2"');
        commandTypes.push('net');
      }

      // Execute all commands in a single SSH connection (now in parallel!)
      if (commands.length > 0) {
        try {
          const outputs = await executeSSHCommands(host, port, privateKey, commands, 5000);

          // Process results
          outputs.forEach((output, index) => {
            const type = commandTypes[index];
            
            if (type === 'cpu') {
              const cpuUsage = parseCPUUsage(output);
              if (cpuUsage !== null) {
                metrics.cpuUsage = cpuUsage;
              } else {
                metrics.cpuError = "Unable to parse CPU metrics";
              }
            } else if (type === 'ram') {
              const ramUsage = parseRAMUsage(output);
              if (ramUsage) {
                metrics.ramTotal = ramUsage.total;
                metrics.ramUsed = ramUsage.used;
              } else {
                metrics.ramError = "Unable to parse RAM metrics";
              }
            } else if (type === 'net') {
              const netUsage = parseNetworkUsage(output);
              if (netUsage !== null) {
                metrics.netRx = netUsage;
              } else {
                metrics.netError = "Unable to parse network metrics";
              }
            }
          });
        } catch (err: any) {
          hasError = true;
          if (enableCpu) metrics.cpuError = err.message;
          if (enableRam) metrics.ramError = err.message;
          if (enableNet) metrics.netError = err.message;
        }
      }

      // Determine overall status
      let status: ServiceStatus = "running";
      if (hasError) {
        status = Object.keys(metrics).some((k) => k.includes("Usage"))
          ? "running"
          : "error";
      }

      return [
        {
          id: "system",
          name: "Server Metrics",
          type: "linux-server",
          status,
          details: metrics,
        },
      ];
    } catch (error: any) {
      // Handle connection-level errors with specific messages
      let errorMsg = error.message;

      if (error.code === "ECONNREFUSED") {
        errorMsg =
          "Connection refused. Check server is running and SSH port is open.";
      } else if (
        error.message.includes(
          "All configured authentication methods failed"
        )
      ) {
        errorMsg =
          "Authentication failed. Have you added the public key to ~/.ssh/authorized_keys?";
      } else if (error.message.includes("timeout")) {
        errorMsg = "Connection timeout. Check network connectivity.";
      } else if (error.message.includes("Host key verification failed")) {
        errorMsg =
          "Host key verification failed. This is a new or changed server.";
      }

      return [
        {
          id: "system",
          name: "Server Status",
          type: "linux-server",
          status: "error",
          details: { error: errorMsg },
        },
      ];
    }
  },

  // Lifecycle hook: Prepare config before saving (generate SSH keys)
  prepareConfig: async (config: Record<string, any>) => {
    const keyPair = generateKeyPair();
    config.publicKey = keyPair.publicKey;
    config.encryptedPrivateKey = encryptPrivateKey(keyPair.privateKey);
    config.keyVersion = 1;

    return {
      config,
      metadata: {
        publicKey: keyPair.publicKey, // Return to display in UI
      },
    };
  },

  // Lifecycle hook: Test SSH connection
  testConnection: async (config: Record<string, any>) => {
    const { host, port = 22, encryptedPrivateKey } = config as LinuxServerConfig;

    if (!encryptedPrivateKey) {
      return {
        success: false,
        error: "No SSH key configured",
      };
    }

    try {
      const privateKey = decryptPrivateKey(encryptedPrivateKey);
      const [uptime] = await executeSSHCommands(
        host,
        port,
        privateKey,
        ["uptime"],
        5000
      );

      return {
        success: true,
        message: `Connection successful! Server uptime: ${uptime}`,
      };
    } catch (error: any) {
      let errorMsg = error.message;

      if (error.code === "ECONNREFUSED") {
        errorMsg =
          "Connection refused. Check server is running and SSH port is open.";
      } else if (
        error.message.includes(
          "All configured authentication methods failed"
        )
      ) {
        errorMsg =
          "Authentication failed. Have you added the public key to ~/.ssh/authorized_keys?";
      } else if (error.message.includes("timeout")) {
        errorMsg = "Connection timeout. Check network connectivity.";
      }

      return {
        success: false,
        error: errorMsg,
      };
    }
  },
};
