import "server-only";
import { MonitoringExtension } from "./types";

// Static import of extensions
import { dokployExtension } from "./dokploy"; 
import { linuxServerExtension } from "./linux-server";

export async function loadExtensions(): Promise<MonitoringExtension[]> {
  const extensions: MonitoringExtension[] = [];

  // Manual registration to avoid dynamic import issues in Next.js
  if (isValidExtension(dokployExtension)) extensions.push(dokployExtension);
  if (isValidExtension(linuxServerExtension)) extensions.push(linuxServerExtension);
  
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
