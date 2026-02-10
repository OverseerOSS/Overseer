import { MonitoringExtension, ServiceInfo, ServiceStatus } from "../types";
import { encryptCredential, decryptCredential } from "@/lib/credentials";
import { DokployConfig } from "./types";

export const dokployExtension: MonitoringExtension = {
  id: "dokploy",
  name: "Dokploy Monitoring",
  description: "Monitor applications and databases managed by Dokploy",
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
    const metricsTokenUrl = `${cleanUrl}/api/trpc/user.getMetricsToken?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%7D%7D%7D`;
    
    console.log(`[Dokploy] Fetching status from: ${projectsUrl}`);

    try {
      const headers = {
        "x-api-key": apiKey,
        accept: "application/json",
      };

      // Fetch projects
      const response = await fetch(projectsUrl, {
        headers,
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch from Dokploy: ${response.status} ${response.statusText}`
        );
      }

      const projects = await response.json();

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
      const fetchMetrics = async (appName: string): Promise<{ network: { input: number; output: number } } | undefined> => {
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
          const metricsArr = json?.[0]?.result?.data?.json;
          
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
                network: {
                  input: toBytes(latest.Network.input || 0, latest.Network.inputUnit),
                  output: toBytes(latest.Network.output || 0, latest.Network.outputUnit)
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
        // If "environments" array exists, we iterate it. Else we look at project root (for backward compat).
        let resourceContainers = [project];
        if (project.environments) {
          resourceContainers = project.environments;
        }

        for (const container of resourceContainers) {
          // Parse Applications
          if (container.applications) {
            for (const app of container.applications) {
              if (excludedList.includes(app.name.toLowerCase())) continue;

              const status = mapStatus(app.applicationStatus || app.status);
              let metrics = undefined;
              if (status === "running" && app.appName) {
                 metrics = await fetchMetrics(app.appName);
              }

              services.push({
                id: app.applicationId || app.id,
                name: app.name,
                type: "application",
                status,
                startTime: app.createdAt,
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

          // Parse Databases (MySQL, Postgres, Redis, Mongo, MariaDB)
          const dbTypes = ["mysql", "postgres", "redis", "mongo", "mariadb"];
          for (const dbType of dbTypes) {
            if (container[dbType]) {
              for (const db of container[dbType]) {
                if (excludedList.includes(db.name.toLowerCase())) continue;

                const status = mapStatus(db.applicationStatus || db.status);
                let metrics = undefined;
                if (status === "running" && db.appName) {
                   metrics = await fetchMetrics(db.appName);
                }

                services.push({
                  id: db[`${dbType}Id`] || db.id,
                  name: db.name,
                  type: dbType,
                  status,
                  startTime: db.createdAt,
                  details: {
                    ...displayConfig,
                    projectId: project.projectId,
                    projectName: project.name,
                    envName: container.name,
                    image: db.dockerImage,
                    port: db.externalPort,
                    appName: db.appName,
                     metrics
                  },
                });
              }
            }
          }

          // Parse Compose
          if (container.compose) {
            for (const compose of container.compose) {
              if (excludedList.includes(compose.name.toLowerCase())) continue;

              // Debug logging for compose status issues
              if (!compose.applicationStatus && !compose.status) {
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
              if (status === "running" && compose.appName) {
                   metrics = await fetchMetrics(compose.appName);
              }

              services.push({
                id: compose.composeId || compose.id,
                name: compose.name,
                type: "compose",
                // Check multiple generic status fields + specific compose fields
                status,
                startTime: compose.createdAt,
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

      return services;
    } catch (error) {
      console.error("Dokploy extension error:", error);
      // Return a single error service indicating the failure, or throw.
      // For UI resilience, we might return empty or specific error item.
      // But throwing allows the UI to show the error state for the extension.
      throw error;
    }
  },
};
