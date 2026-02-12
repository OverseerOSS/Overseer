import { MonitoringExtension, ServiceInfo, ServiceStatus } from "../types";
import { encryptCredential, decryptCredential } from "@/lib/credentials";
import { DokployConfig } from "./types";

export const dokployExtension: MonitoringExtension = {
  id: "dokploy",
  name: "Dokploy Monitoring",
  description: "Monitor applications and databases managed by Dokploy",
  displayOptions: {
    hideStatusCards: true,
  },
  configSchema: [
    {
      key: "baseUrl",
      label: "Dokploy URL",
      type: "url",
      defaultValue: "http://localhost:3000",
      required: true,
      description:
        "The base URL of your Dokploy instance (e.g., http://192.168.1.10:3000)",
      scope: "global",
      category: "Connection",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      description: "API Key generated in Dokploy settings",
      encrypt: true,
      scope: "global",
      category: "Connection",
    },
    {
      key: "showProject",
      label: "Show Project Name",
      type: "checkbox",
      defaultValue: true,
      scope: "global",
      category: "Display",
    },
    {
      key: "showEnvironment",
      label: "Show Environment",
      type: "checkbox",
      defaultValue: true,
      scope: "global",
      category: "Display",
    },
    {
      key: "showType",
      label: "Show Service Type",
      type: "checkbox",
      defaultValue: true,
      scope: "global",
      category: "Display",
    },
    {
      key: "showImage",
      label: "Show Image Info",
      type: "checkbox",
      defaultValue: true,
      scope: "global",
      category: "Display",
    },
    {
      key: "showPort",
      label: "Show Port",
      type: "checkbox",
      defaultValue: true,
      scope: "global",
      category: "Display",
    },
    {
      key: "showNetwork",
      label: "Show Network Stats",
      type: "checkbox",
      defaultValue: true,
      scope: "global",
      category: "Display",
    },
    {
      key: "excludedServices",
      label: "Excluded Services",
      type: "text",
      description: "Comma-separated list of service names to hide (e.g. 'mongodb, redis-cache')",
      scope: "global",
      category: "Display",
    }
  ],
  
  // Encrypt API key before saving to database
  prepareConfig: async (config: Record<string, any>) => {
    if (config.apiKey) {
      config.encrypted_apiKey = encryptCredential(
        config.apiKey,
        "dokploy-apiKey"
      );
      delete config.apiKey; // Remove plaintext
    }
    
    return { config };
  },
  
  fetchStatus: async (config: Record<string, any>): Promise<ServiceInfo[]> => {
    const { 
      baseUrl, 
      encrypted_apiKey, 
      apiKey: legacyApiKey,
      showProject = true,
      showEnvironment = true,
      showType = true,
      showImage = true,
      showPort = true,
      showNetwork = true,
      excludedServices = ""
    } = config as DokployConfig & { apiKey?: string } & Record<string, any>;

    const displayConfig = { showProject, showEnvironment, showType, showImage, showPort, showNetwork };
    const excludedList = (excludedServices as string)
      .split(",")
      .map(s => s.trim().toLowerCase())
      .filter(s => s.length > 0);
    
    // Validate required configuration
    if (!baseUrl) {
      throw new Error("Dokploy URL is not configured");
    }
    
    // Handle both new encrypted and legacy plaintext API keys
    let apiKey: string;
    if (encrypted_apiKey) {
      try {
        apiKey = decryptCredential(encrypted_apiKey);
      } catch (error) {
        throw new Error("Failed to decrypt API key. Please reconfigure this monitor.");
      }
    } else if (legacyApiKey) {
      // Legacy support for old monitors with plaintext keys
      apiKey = legacyApiKey;
    } else {
      throw new Error("API key is not configured. Please reconfigure this monitor.");
    }


    // Ensure protocol exists
    let cleanUrl = baseUrl.trim().replace(/\/$/, "");
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = `https://${cleanUrl}`;
    }

    const projectsUrl = `${cleanUrl}/api/project.all`;
    // Fallback/alternative tRPC URL for projects just in case
    const projectsTrpcUrl = `${cleanUrl}/api/trpc/project.all?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%7D%7D%7D`;
    const metricsTokenUrl = `${cleanUrl}/api/trpc/user.getMetricsToken?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%7D%7D%7D`;
    
    console.log(`[Dokploy] Fetching status from: ${projectsUrl}`);

    try {
      const headers = {
        "x-api-key": apiKey,
        accept: "application/json",
      };

      // Fetch projects
      let projectsResponse = await fetch(projectsUrl, {
        headers,
        cache: "no-store",
      });

      let projects = [];
      if (projectsResponse.ok) {
        projects = await projectsResponse.json();
      } else {
        // Try TRPC fallback if direct API fails
        projectsResponse = await fetch(projectsTrpcUrl, { headers, cache: "no-store" });
        if (projectsResponse.ok) {
          projects = await projectsResponse.json();
        }
      }

      // Handle tRPC response wrapping if present
      if (projects && !Array.isArray(projects) && (projects as any).result?.data?.json) {
        projects = (projects as any).result.data.json;
      }
      
      // Some tRPC responses might be an array with one element
      if (Array.isArray(projects) && projects.length === 1 && projects[0].result?.data?.json) {
         projects = projects[0].result.data.json;
      }

      if (!Array.isArray(projects)) {
        console.error("[Dokploy] Expected array of projects, got:", typeof projects, projects);
        return [];
      }

      // Try to fetch metrics token (best effort)
      let metricsToken = "metrics"; // Default
      try {
        const tokenResp = await fetch(metricsTokenUrl, { headers, cache: "no-store" });
        if (tokenResp.ok) {
           const tokenJson = await tokenResp.json();
           // Expecting [{"result":{"data":{"json":"some-token"}}}]
           const token = tokenJson?.[0]?.result?.data?.json;
           if (typeof token === 'string') {
             metricsToken = token;
           }
        }
      } catch (err) {
        console.warn("[Dokploy] Failed to fetch metrics token, using default");
      }

      const services: ServiceInfo[] = [];

      // Helper to map status
      const mapStatus = (status: string): ServiceStatus => {
        const lower = status?.toLowerCase() || "unknown"; // Handle null/undefined
        
        if (["running", "done", "healthy", "active"].includes(lower)) return "running";
        if (["stopped", "exited", "created", "paused", "idle", "inactive"].includes(lower)) return "stopped";
        if (["error", "dead", "restarting", "crashed", "failed"].includes(lower)) return "error";
        
        if (lower !== "unknown") {
          console.log(`[Dokploy] Unmapped status encountered: "${status}"`);
        }
        return "unknown"; // Fallback for specific unmapped states
      };


      // Helper to fetch container metrics
      const fetchMetrics = async (appName: string): Promise<any | undefined> => {
        // Construct tRPC input for user.getContainerMetrics
        // Input: { url: "...", token: "...", dataPoints: "1", appName: "..." }
        const input = {
          "0": {
            "json": {
              "url": "http://localhost:3001/metrics", // Internal monitoring URL
              "token": metricsToken,
              "dataPoints": "1",
              "appName": appName
            }
          }
        };
        const encodedInput = encodeURIComponent(JSON.stringify(input));
        const url = `${cleanUrl}/api/trpc/user.getContainerMetrics?batch=1&input=${encodedInput}`;
        
        try {
          const res = await fetch(url, { headers, cache: "no-store" });
          if (!res.ok) return undefined;
          
          const json = await res.json();
          // tRPC batch response: [{ result: { data: { json: [...] } } }]
          // Sometimes it might not be a batch or differ slightly
          let metricsArr = json?.[0]?.result?.data?.json;
          if (!metricsArr && json?.result?.data?.json) {
            metricsArr = json.result.data.json;
          }
          
          if (Array.isArray(metricsArr) && metricsArr.length > 0) {
            const latest = metricsArr[metricsArr.length - 1];
            if (latest?.Network) {
              const toBytes = (val: number, unit: string = "") => {
                  const u = unit.toLowerCase();
                  if (u.startsWith('k')) return val * 1024;
                  if (u.startsWith('m')) return val * 1024 * 1024;
                  if (u.startsWith('g')) return val * 1024 * 1024 * 1024;
                  if (u.startsWith('t')) return val * 1024 * 1024 * 1024 * 1024;
                  return val;
              };

              return {
                cpu: latest.CPU,
                memory: {
                  used: toBytes(latest.Memory?.used || 0, latest.Memory?.unit),
                  total: toBytes(latest.Memory?.total || 0, latest.Memory?.unit),
                  percent: latest.Memory?.percent
                },
                network: {
                  input: toBytes(latest.Network?.input || 0, latest.Network?.inputUnit),
                  output: toBytes(latest.Network?.output || 0, latest.Network?.outputUnit)
                }
              };
            }
          }
        } catch (e) {
          // Ignore metrics fetch errors
        }
        return undefined;
      };

      // Traverse all projects
      for (const project of projects) {
        // NOTE: Newer Dokploy versions nest resources under "environments"
        // If "environments" array exists and is not empty, we iterate it. 
        // Else we look at project root (for backward compat).
        let resourceContainers = [project];
        if (Array.isArray(project.environments) && project.environments.length > 0) {
          resourceContainers = project.environments;
        }

        for (const container of resourceContainers) {
          // Parse Applications
          const appList = container.applications || container.application;
          if (appList && Array.isArray(appList)) {
            for (const app of appList) {
              if (excludedList.includes(app.name.toLowerCase())) continue;

              const status = mapStatus(app.applicationStatus || app.status);
              let metrics = undefined;
              let serviceMetrics = undefined;
              if (status === "running" && app.appName) {
                 metrics = await fetchMetrics(app.appName);
                 if (metrics) {
                   serviceMetrics = {
                     cpu: metrics.cpu,
                     ram: metrics.memory?.percent,
                     ramUsed: metrics.memory?.used,
                     ramTotal: metrics.memory?.total,
                     networkIn: metrics.network?.input,
                     networkOut: metrics.network?.output
                   };
                 }
              }

              services.push({
                id: app.applicationId || app.id,
                name: app.name,
                type: "application",
                status,
                startTime: app.createdAt,
                metrics: serviceMetrics,
                details: {
                  ...displayConfig,
                  projectId: project.projectId,
                  projectName: project.name,
                  envName: container.name, // "production" etc
                  image: app.dockerImage,
                  appName: app.appName, 
                  metrics
                },
              });
            }
          }

          // Parse Databases
          const databaseTypes = [
            { key: "postgresql", label: "postgresql" },
            { key: "postgresqls", label: "postgresql" },
            { key: "mysql", label: "mysql" },
            { key: "mysqls", label: "mysql" },
            { key: "mariadb", label: "mariadb" },
            { key: "mariadbs", label: "mariadb" },
            { key: "mongodb", label: "mongodb" },
            { key: "mongodbs", label: "mongodb" },
            { key: "redis", label: "redis" },
            { key: "redises", label: "redis" },
          ];

          for (const { key, label } of databaseTypes) {
            const dbList = (container as any)[key] as any[];
            if (!dbList || !Array.isArray(dbList)) continue;

            for (const db of dbList) {
              if (excludedList.includes(db.name.toLowerCase())) continue;

              const status = mapStatus(db.applicationStatus || db.status);
              let metrics = undefined;
              let serviceMetrics = undefined;

              if (status === "running" && db.appName) {
                metrics = await fetchMetrics(db.appName);
                if (metrics) {
                  serviceMetrics = {
                    cpu: metrics.cpu,
                    ram: metrics.memory?.percent,
                    ramUsed: metrics.memory?.used,
                    ramTotal: metrics.memory?.total,
                    networkIn: metrics.network?.input,
                    networkOut: metrics.network?.output,
                  };
                }
              }

              services.push({
                id: (db as any)[`${key}Id`] || (db as any)[`${label}Id`] || db.id,
                name: db.name,
                type: label,
                status,
                startTime: db.createdAt,
                metrics: serviceMetrics,
                details: {
                  ...displayConfig,
                  projectId: project.projectId,
                  projectName: project.name,
                  envName: container.name,
                  image: db.dockerImage,
                  port: db.externalPort,
                  appName: db.appName,
                  metrics,
                },
              });
            }
          }

          // Parse Compose
          const composeList = container.compose || container.composes || container.composeStacks;
          if (composeList && Array.isArray(composeList)) {
            for (const compose of composeList) {
              if (excludedList.includes(compose.name.toLowerCase())) continue;

              // Debug logging for compose status issues
              if (!compose.applicationStatus && !compose.status && !compose.composeStatus) {
                console.log(`[Dokploy] Compose service missing status:`, JSON.stringify(compose, null, 2));
              }

              const status = mapStatus(
                  compose.applicationStatus || 
                  compose.status || 
                  compose.composeStatus || 
                  "unknown"
              );

              // Compose metrics are tricky as it might be multiple containers.
              // For now we skip or try using main appName
              let metrics = undefined;
              let serviceMetrics = undefined;
              if (status === "running" && compose.appName) {
                   metrics = await fetchMetrics(compose.appName);
                   if (metrics) {
                      serviceMetrics = {
                        cpu: metrics.cpu,
                        ram: metrics.memory?.percent,
                        ramUsed: metrics.memory?.used,
                        ramTotal: metrics.memory?.total,
                        networkIn: metrics.network?.input,
                        networkOut: metrics.network?.output
                      };
                   }
              }

              services.push({
                id: compose.composeId || compose.id,
                name: compose.name,
                type: "compose",
                // Check multiple generic status fields + specific compose fields
                status,
                startTime: compose.createdAt,
                metrics: serviceMetrics,
                details: {
                  ...displayConfig,
                  projectId: project.projectId,
                  projectName: project.name,
                  envName: container.name,
                  // If it's a compose stack, it might have a list of services inside
                  serviceCount: compose.services?.length,
                  appName: compose.appName,
                  metrics
                },
              });
            }
          }
        }
      }

      // Deduplicate by ID to avoid doubles from plural/singular variants
      const seen = new Set();
      return services.filter(s => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      })
    } catch (error) {
      console.error("Dokploy extension error:", error);
      // Return a single error service indicating the failure, or throw.
      // For UI resilience, we might return empty or specific error item.
      // But throwing allows the UI to show the error state for the extension.
      throw error;
    }
  },
};
