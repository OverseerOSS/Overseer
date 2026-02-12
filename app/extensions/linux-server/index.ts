import { MonitoringExtension, ServiceInfo, ServiceStatus } from "../types";
import { Client } from "ssh2";
import {
  decryptPrivateKey,
} from "@/lib/ssh-keys";
import { LinuxServerConfig } from "./types";

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

function parseCPUUsage(output: string): number | null {
  try {
    const lines = output.trim().split('\n');
    if (lines.length < 2) return null;
    const parse = (line: string) => {
      const parts = line.replace(/\s+/g, ' ').split(' ');
      if (parts[0] !== 'cpu') return null;
      const val = (idx: number) => parseInt(parts[idx], 10) || 0;
      return { user: val(1), nice: val(2), system: val(3), idle: val(4), iowait: val(5), irq: val(6), softirq: val(7), steal: val(8) };
    };
    const stat1 = parse(lines[0]);
    const stat2 = parse(lines[1]);
    if (!stat1 || !stat2) return null;
    const getActive = (s: any) => s.user + s.nice + s.system + s.irq + s.softirq + s.steal;
    const getTotal = (s: any) => s.user + s.nice + s.system + s.idle + s.iowait + s.irq + s.softirq + s.steal;
    const totalDelta = getTotal(stat2) - getTotal(stat1);
    const activeDelta = getActive(stat2) - getActive(stat1);
    if (totalDelta <= 0) return null;
    return Math.max(0, Math.min(100, (activeDelta / totalDelta) * 100));
  } catch { return null; }
}

function parseRAMUsage(output: string): { total: number; used: number; details: any } | null {
  try {
    const metrics: Record<string, number> = {};
    const lines = output.split('\n');
    for (const line of lines) {
      const parts = line.split(':');
      if (parts.length < 2) continue;
      const key = parts[0].trim();
      const val = parseInt(parts[1].trim().split(/\s+/)[0], 10);
      if (!isNaN(val)) metrics[key] = val;
    }
    const totalKB = metrics['MemTotal'] || 0;
    if (totalKB <= 0) return null;
    
    const free = metrics['MemFree'] || 0;
    const buffers = metrics['Buffers'] || 0;
    const cached = metrics['Cached'] || 0;
    const sreclaimable = metrics['SReclaimable'] || 0;
    const shmem = metrics['Shmem'] || 0;
    const availKB = metrics['MemAvailable'] !== undefined ? metrics['MemAvailable'] : (free + buffers + cached + sreclaimable);
    
    // used = total - free - buffers - cache
    const cache = cached + sreclaimable;
    const usedKB = totalKB - free - buffers - cache;

    return {
      total: totalKB / 1024,
      used: Math.max(0, usedKB / 1024),
      details: {
        free: free / 1024,
        buffers: buffers / 1024,
        cached: cache / 1024,
        shared: shmem / 1024,
        available: availKB / 1024,
        usagePercent: totalKB > 0 ? (usedKB / totalKB) * 100 : 0
      }
    };
  } catch { return null; }
}

function parseSystemInfo(output: string): { loadAvg: string[]; uptime: string } | null {
  try {
    const lines = output.trim().split('\n');
    // Expecting /proc/loadavg (first line) and uptime (second line)
    if (lines.length < 2) return null;
    
    const loadParts = lines[0].split(/\s+/);
    const loadAvg = [loadParts[0], loadParts[1], loadParts[2]];
    
    let uptime = lines[1].trim();
    // Clean up uptime output (strip prefix/suffix if needed, but raw is okay for htop-like feel)
    if (uptime.toLowerCase().includes('up')) {
      const match = uptime.match(/up\s+([^,]+)/);
      if (match) uptime = match[1];
    }

    return { loadAvg, uptime };
  } catch { return null; }
}

function parseNetworkUsage(output: string): number | null {
  try {
    const sections = output.split('===SEP===');
    if (sections.length < 2) return null;
    const parseBytes = (data: string) => {
      let total = 0;
      const lines = data.trim().split('\n');
      for (const line of lines) {
        const match = line.trim().match(/^([^:]+):\s*(\d+)/);
        if (match && match[1] !== 'lo') total += parseInt(match[2], 10);
      }
      return total;
    };
    const delta = parseBytes(sections[1]) - parseBytes(sections[0]);
    return delta < 0 ? 0 : Math.round(delta / 0.5);
  } catch { return null; }
}

export const linuxServerExtension: MonitoringExtension = {
  id: "linux-server",
  name: "Linux Server Monitoring",
  description: "Monitor CPU and RAM usage on remote Linux servers via SSH",
  configSchema: [
    { key: "host", label: "Server IP or Hostname", type: "text", required: true, scope: "monitor" },
    { key: "port", label: "SSH Port", type: "number", defaultValue: 22, scope: "monitor" },
    { key: "enableCpu", label: "Monitor CPU", type: "checkbox", defaultValue: true, scope: "global" },
    { key: "enableRam", label: "Monitor RAM", type: "checkbox", defaultValue: true, scope: "global" },
    { key: "enableNet", label: "Monitor Network", type: "checkbox", defaultValue: true, scope: "global" },
  ],
  fetchStatus: async (config: Record<string, any>): Promise<ServiceInfo[]> => {
    const { host, port = 22, enableCpu, enableRam, enableNet, encryptedPrivateKey } = config as LinuxServerConfig;
    if (!encryptedPrivateKey) return [{ id: "system", name: "Server Metrics", type: "linux-server", status: "error", details: { error: "No SSH key" } }];
    try {
      const privateKey = decryptPrivateKey(encryptedPrivateKey);
      const metrics: Record<string, any> = {};
      const commands: string[] = [];
      const types: string[] = [];
      if (enableCpu) { commands.push('s1=$(cat /proc/stat | head -n1); sleep 0.5; s2=$(cat /proc/stat | head -n1); echo "$s1"; echo "$s2"'); types.push('cpu'); }
      if (enableRam) { commands.push('cat /proc/meminfo'); types.push('ram'); }
      if (enableNet) { commands.push('d1=$(grep ":" /proc/net/dev); sleep 0.5; d2=$(grep ":" /proc/net/dev); echo "$d1"; echo "===SEP==="; echo "$d2"'); types.push('net'); }
      
      // Always get basic system info for that "htop" feel
      commands.push('cat /proc/loadavg; uptime');
      types.push('system_info');

      if (commands.length > 0) {
        const outputs = await executeSSHCommands(host, port, privateKey, commands, 5000);
        outputs.forEach((out, i) => {
          const type = types[i];
          if (type === 'cpu') metrics.cpuUsage = parseCPUUsage(out);
          else if (type === 'ram') {
            const ram = parseRAMUsage(out);
            if (ram) { 
              metrics.ramTotal = ram.total; 
              metrics.ramUsed = ram.used; 
              Object.assign(metrics, ram.details);
            }
          }
          else if (type === 'net') metrics.netRx = parseNetworkUsage(out);
          else if (type === 'system_info') {
            const sys = parseSystemInfo(out);
            if (sys) {
              metrics.loadAvg = sys.loadAvg.join(', ');
              metrics.uptime = sys.uptime;
            }
          }
        });
      }
      return [{ id: "system", name: "Server Metrics", type: "linux-server", status: "running", details: metrics }];
    } catch (e: any) {
      return [{ id: "system", name: "Server Status", type: "linux-server", status: "error", details: { error: e.message } }];
    }
  }
};
