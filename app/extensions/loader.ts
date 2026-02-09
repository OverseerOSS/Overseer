import "server-only";
import fs from "fs";
import path from "path";
import { MonitoringExtension } from "./types";

// This loader is used to dynamically load extensions from the filesystem
// preventing the need to hardcode them in a list.

const EXTENSIONS_DIR = path.join(process.cwd(), "app/extensions");

export async function loadExtensions(): Promise<MonitoringExtension[]> {
  const extensions: MonitoringExtension[] = [];

  if (!fs.existsSync(EXTENSIONS_DIR)) {
    console.warn("Extensions directory not found:", EXTENSIONS_DIR);
    return extensions;
  }

  const items = fs.readdirSync(EXTENSIONS_DIR, { withFileTypes: true });

  for (const item of items) {
    if (item.isDirectory()) {
      // Skip hidden folders or node_modules if any
      if (item.name.startsWith(".") || item.name === "node_modules") continue;

      try {
        // Dynamic import. 
        // We assume the extension entry point is index.ts or index.js
        // import() with a template string hints webpack to bundle these modules.
        const mod = await import(`./${item.name}/index`);
        
        let found = false;
        // Look for an export that looks like a MonitoringExtension
        for (const key in mod) {
            const exported = mod[key];
            if (isValidExtension(exported)) {
                extensions.push(exported);
                found = true;
                break; // One extension per folder?
            }
        }
        
        if (!found) {
            // Check default export
            if (isValidExtension(mod.default)) {
                extensions.push(mod.default);
            }
        }
        
      } catch (err) {
        // Only log errors for directories that look like they should have code but failed
        // Ignroe directories without index.ts
        // console.error(`Failed to load extension from ${item.name}:`, err); 
      }
    }
  }
  
  return extensions;
}

function isValidExtension(obj: any): obj is MonitoringExtension {
    return (
        obj && 
        typeof obj.id === 'string' &&
        typeof obj.name === 'string' &&
        typeof obj.fetchStatus === 'function'
    );
}

export async function getExtension(id: string): Promise<MonitoringExtension | undefined> {
    const all = await loadExtensions();
    return all.find(e => e.id === id);
}
