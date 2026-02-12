import "server-only";
import { MonitoringExtension } from "./types";
import fs from "fs";
import path from "path";

/**
 * Automatically loads all extensions from the app/extensions directory.
 * Each subdirectory is treated as a potential extension.
 */
let cachedExtensions: MonitoringExtension[] | null = null;

export async function loadExtensions(): Promise<MonitoringExtension[]> {
  if (cachedExtensions) return cachedExtensions;
  
  const extensions: MonitoringExtension[] = [];
  const extensionsDir = path.join(process.cwd(), "app", "extensions");

  try {
    // Read all items in the extensions directory
    const items = fs.readdirSync(extensionsDir, { withFileTypes: true });
    
    for (const item of items) {
      // Only process directories (excluding certain names if needed)
      if (item.isDirectory()) {
        const extensionId = item.name;
        
        try {
          // Dynamic import of the extension index file.
          // In Next.js with Turbopack/Webpack, we need to be careful with dynamic paths, 
          // but relative imports with template literals usually work within the same directory.
          const module = await import(`./${extensionId}/index`).catch(() => 
            import(`./${extensionId}`)
          );
          
          // Find the export that matches the MonitoringExtension interface.
          // We check default export, specific named export, and finally any export.
          const ext = 
            module.default || 
            module[`${extensionId}Extension`] || 
            Object.values(module).find(v => isValidExtension(v));
          
          if (isValidExtension(ext)) {
            // Ensure the extension ID matches the folder name if not set
            if (!ext.id) ext.id = extensionId;
            extensions.push(ext);
            console.log(`[Loader] Successfully loaded extension: ${ext.name} (${ext.id})`);
          }
        } catch (err) {
          // It's normal for some folders to not be extensions (like component folders)
          // so we only log if it looks like an extension directory but failed.
          if (fs.existsSync(path.join(extensionsDir, extensionId, "index.ts")) || 
              fs.existsSync(path.join(extensionsDir, extensionId, "manifest.json"))) {
            console.error(`[Loader] Error loading extension in "${extensionId}":`, err);
          }
        }
      }
    }
  } catch (err) {
    console.error("[Loader] Failed to scan extensions directory:", err);
  }
  
  cachedExtensions = extensions;
  return extensions;
}

export async function getExtension(id: string): Promise<MonitoringExtension | undefined> {
  const extensions = await loadExtensions();
  return extensions.find((e) => e.id === id);
}

function isValidExtension(obj: any): obj is MonitoringExtension {
  return (
    obj &&
    typeof obj.id === "string" &&
    typeof obj.name === "string" &&
    typeof obj.fetchStatus === "function"
  );
}
