"use server";

import { getInstalledExtensions } from "../actions";

export interface MarketplacePlugin {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  url: string;
  icon?: string;
  isInstalled?: boolean;
}

export async function fetchMarketplacePlugins(): Promise<MarketplacePlugin[]> {
  try {
    // 1. Fetch directory listing from GitHub
    // Using unauthenticated request (rate limits apply, 60/hr)
    const res = await fetch("https://api.github.com/repos/OverseerOSS/plugins/contents", {
      next: { revalidate: 3600 }, // Cache for 1 hour
      headers: {
        "Accept": "application/vnd.github+json",
        "User-Agent": "Overseer-App"
      }
    });
    
    if (!res.ok) {
        console.error("GitHub API Error", res.status, res.statusText);
        return [];
    }
    
    const items = await res.json();
    if (!Array.isArray(items)) return [];

    const dirs = items.filter((i: any) => i.type === "dir" && !i.name.startsWith("."));
    
    // 2. Get local installed plugins to mark status
    const installedIds = await getInstalledExtensions();

    // 3. Build plugin list
    const plugins: MarketplacePlugin[] = [];

    // Parallel fetch for metadata (package.json)
    // We limit to 5 parallel requests to be nice to API
    const chunks = [];
    const chunkSize = 5;
    for (let i = 0; i < dirs.length; i += chunkSize) {
        chunks.push(dirs.slice(i, i + chunkSize));
    }

    for (const chunk of chunks) {
        const promises = chunk.map(async (d: any) => {
            try {
                // Fetch package.json from raw connection
                const pkgRes = await fetch(`https://raw.githubusercontent.com/OverseerOSS/plugins/main/${d.name}/package.json`, {
                    next: { revalidate: 3600 }
                });
                
                let metadata = {
                    name: d.name,
                    description: "Community plugin for Overseer",
                    version: "1.0.0",
                    author: "Unknown"
                };

                if (pkgRes.ok) {
                    const pkg = await pkgRes.json();
                    metadata = {
                        name: pkg.displayName || pkg.name || d.name,
                        description: pkg.description || metadata.description,
                        version: pkg.version || metadata.version,
                        author: pkg.author || metadata.author
                    };
                }

                return {
                    id: d.name,
                    name: metadata.name,
                    description: metadata.description,
                    author: metadata.author,
                    version: metadata.version,
                    url: d.html_url,
                    isInstalled: installedIds.includes(d.name)
                };
            } catch (e) {
                // Fallback if fetch fails
                return {
                    id: d.name,
                    name: d.name,
                    description: "Community plugin",
                    author: "OverseerOSS",
                    version: "0.0.1",
                    url: d.html_url,
                    isInstalled: installedIds.includes(d.name)
                };
            }
        });

        const results = await Promise.all(promises);
        plugins.push(...results);
    }
    
    return plugins;
  } catch (err) {
    console.error("Failed to fetch marketplace plugins:", err);
    return [];
  }
}
