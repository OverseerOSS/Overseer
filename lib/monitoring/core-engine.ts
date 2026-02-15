import { ServiceInfo, MonitorMetadata } from "./types";
import https from 'https';
import { Client } from 'ssh2';

export async function fetchCoreStatus(type: string, config: any): Promise<ServiceInfo[]> {
  switch (type) {
    case 'http':
    case 'https':
      return await fetchHttpStatus(config);
    case 'ping':
      return await fetchPingStatus(config);
    case 'ssh':
      return await fetchSshStatus(config);
    default:
      return [];
  }
}

export async function getAvailableMonitorTypes(): Promise<MonitorMetadata[]> {
  return [
    {
      id: "http",
      name: "HTTP/S",
      description: "Monitor any website or endpoint via HTTP/S requests.",
      configSchema: [
        { key: "url", label: "Endpoint URL", type: "text", required: true, placeholder: "https://example.com" },
        { key: "alias", label: "Display Alias", type: "text", placeholder: "Friendly name for this resource" },
        { key: "method", label: "Request Method", type: "text", defaultValue: "GET" },
        { key: "expectedStatus", label: "Expected Status Code", type: "number", defaultValue: 200 },
        { key: "timeout", label: "Timeout (ms)", type: "number", defaultValue: 10000 },
        { key: "interval", label: "Ping Interval (s)", type: "number", placeholder: "Default from settings" },
        { key: "ignoreTls", label: "Ignore TLS/SSL Errors", type: "checkbox", defaultValue: false },
        { key: "advancedSsl", label: "Advanced SSL Monitoring", type: "checkbox", defaultValue: false }
      ]
    },
    {
        id: "ping",
        name: "Ping (ICMP)",
        description: "Check connectivity to a host via ICMP echo requests.",
        configSchema: [
          { key: "url", label: "Hostname / IP", type: "text", required: true, placeholder: "1.1.1.1" },
          { key: "alias", label: "Display Alias", type: "text", placeholder: "Friendly name for this resource" },
          { key: "interval", label: "Ping Interval (s)", type: "number", placeholder: "Default from settings" }
        ]
      },
      {
        id: "ssh",
        name: "SSH Server",
        description: "Monitor remote Linux server metrics (CPU, RAM, Disk) via SSH.",
        configSchema: [
          { key: "host", label: "Hostname / IP", type: "text", required: true, placeholder: "1.2.3.4" },        { key: "alias", label: "Display Alias", type: "text", placeholder: "Friendly name for this server" },          { key: "port", label: "Port", type: "number", defaultValue: 22 },
          { key: "username", label: "Username", type: "text", required: true, defaultValue: "root" },
          { key: "authMethod", label: "Auth Method", type: "select", options: ["password", "key"], defaultValue: "password" },
          { key: "password", label: "Password", type: "password" },
          { key: "privateKey", label: "Private Key (PEM)", type: "textarea" },
          { key: "interval", label: "Poll Interval (s)", type: "number", placeholder: "Default from settings" }
        ]
      }
  ];
}

async function getSslInfo(url: string): Promise<{ 
  expiresAt: string | null; 
  daysRemaining: number | null;
  issuedAt: string | null;
  issuer: string | null;
  subject: string | null;
  email: string | null;
  bits: number | null;
  protocol: string | null;
}> {
  if (!url.startsWith('https://')) return { expiresAt: null, daysRemaining: null, issuedAt: null, issuer: null, subject: null, email: null, bits: null, protocol: null };
  
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        method: 'HEAD',
        agent: false,
        rejectUnauthorized: false
      };

      const req = https.request(options, (res) => {
        const socket = res.socket as any;
        const cert = socket.getPeerCertificate();
        if (cert && cert.valid_to) {
          const expiresAt = new Date(cert.valid_to);
          const issuedAt = new Date(cert.valid_from);
          const now = new Date();
          const daysRemaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 3600 * 24)));
          
          resolve({
            expiresAt: expiresAt.toISOString(),
            issuedAt: issuedAt.toISOString(),
            daysRemaining,
            issuer: cert.issuer?.O || cert.issuer?.CN || JSON.stringify(cert.issuer),
            subject: cert.subject?.CN || JSON.stringify(cert.subject),
            email: cert.subject?.emailAddress || null,
            bits: socket.getCipher()?.bits,
            protocol: socket.getProtocol()
          });
        } else {
          resolve({ expiresAt: null, daysRemaining: null, issuedAt: null, issuer: null, subject: null, email: null, bits: null, protocol: null });
        }
        res.destroy();
      });

      req.on('error', () => resolve({ expiresAt: null, daysRemaining: null, issuedAt: null, issuer: null, subject: null, email: null, bits: null, protocol: null }));
      req.setTimeout(5000, () => {
        req.destroy();
        resolve({ expiresAt: null, daysRemaining: null, issuedAt: null, issuer: null, subject: null, email: null, bits: null, protocol: null });
      });
      req.end();
    } catch {
      resolve({ expiresAt: null, daysRemaining: null, issuedAt: null, issuer: null, subject: null, email: null, bits: null, protocol: null });
    }
  });
}

async function fetchHttpStatus(config: any): Promise<ServiceInfo[]> {
  const { url, method = "GET", expectedStatus = 200, timeout = 10000, alias } = config;
  
  if (!url) return [];

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const [response, sslInfo] = await Promise.all([
      fetch(url, {
        method: method as string,
        signal: controller.signal,
        cache: "no-store",
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Overseer/1.0'
        },
        redirect: 'follow'
      }),
      getSslInfo(url)
    ]);
    
    clearTimeout(timeoutId);
    const latency = Date.now() - start;

    const isOperational = response.status === Number(expectedStatus);

    return [{
      id: "endpoint",
      name: alias || url,
      type: "http",
      status: isOperational ? "running" : "degraded",
      metrics: {
        latency,
        status: response.status
      },
      details: {
        url,
        method,
        latency: `${latency}ms`,
        statusCode: response.status,
        statusText: response.statusText,
        checkTime: new Date().toISOString(),
        sslExp: sslInfo.expiresAt,
        sslDays: sslInfo.daysRemaining,
        sslIssuedAt: sslInfo.issuedAt,
        sslEmail: sslInfo.email,
        sslIssuer: sslInfo.issuer,
        sslSubject: sslInfo.subject,
        sslBits: sslInfo.bits,
        sslProtocol: sslInfo.protocol,
        advancedSsl: config.advancedSsl || false
      }
    }];
  } catch (error: any) {
    const latency = Date.now() - start;
    return [{
      id: "endpoint",
      name: alias || url,
      type: "http",
      status: "error",
      metrics: {
          latency
      },
      details: {
        url,
        error: error.name === 'AbortError' ? 'Timeout' : error.message || "Request failed",
        latency: `${latency}ms`
      }
    }];
  }
}

async function fetchPingStatus(config: any): Promise<ServiceInfo[]> {
    const { url, alias } = config;
    if (!url) return [];

    const start = Date.now();
    try {
        const response = await fetch(`https://${url}`, { method: 'HEAD', mode: 'no-cors' });
        const latency = Date.now() - start;
        return [{
            id: "host",
            name: alias || url,
            type: "ping",
            status: "running",
            metrics: { latency },
            details: { host: url, latency: `${latency}ms` }
        }];
    } catch (e) {
        return [{
            id: "host",
            name: alias || url,
            type: "ping",
            status: "error",
            metrics: { latency: 0 },
            details: { host: url, error: "Host unreachable" }
        }];
    }
}

async function fetchSshStatus(config: any): Promise<ServiceInfo[]> {
    const { host, alias, port = 22, username, authMethod, password, privateKey } = config;
    if (!host || !username) return [];

    return new Promise((resolve) => {
        const conn = new Client();
        conn.on('ready', () => {
            const results: Record<string, any> = {};
            const commands = {
                cpu: "top -bn1 | grep 'Cpu(s)' | sed 's/.*, *\\([0-9.]*\\)%* id.*/\\1/' | awk '{print 100 - $1}'",
                ram: "free -m | awk 'NR==2{printf \"%.2f\", $3*100/$2 }'",
                disk: "df -h / | awk 'NR==2{print $5}' | sed 's/%//'"
            };

            const promises = Object.entries(commands).map(([key, cmd]) => {
                return new Promise<void>((res) => {
                    conn.exec(cmd, (err, stream) => {
                        if (err) {
                            results[key] = 0;
                            return res();
                        }
                        let output = '';
                        stream.on('data', (data: Buffer) => { output += data.toString(); });
                        stream.on('close', () => {
                            results[key] = parseFloat(output.trim()) || 0;
                            res();
                        });
                    });
                });
            });

            Promise.all(promises).then(() => {
                conn.end();
                resolve([{
                    id: "ssh-host",
                    name: alias || host,
                    type: "ssh",
                    status: "running",
                    metrics: results,
                    details: {
                        host,
                        username,
                        ...results,
                        lastCheck: new Date().toISOString()
                    }
                }]);
            });
        }).on('error', (err) => {
            resolve([{
                id: "ssh-host",
                name: alias || "ssh",
                status: "error",
                details: { host, error: err.message }
            }]);
        }).connect({
            host,
            port,
            username,
            password: authMethod === 'password' ? password : undefined,
            privateKey: authMethod === 'key' ? privateKey : undefined,
            timeout: 10000
        });
    });
}
