import "server-only";
import { MonitoringExtension } from "./types";

// Static import of extensions would go here
// import * as Dokploy from "./dokploy"; 
// import * as LinuxServer from "./linux-server";

export async function loadExtensions(): Promise<MonitoringExtension[]> {
  const extensions: MonitoringExtension[] = [];

  // Manual registration to avoid dynamic import issues in Next.js
  /*
  if (isValidExtension(Dokploy.default)) extensions.push(Dokploy.default);
  if (isValidExtension(LinuxServer.default)) extensions.push(LinuxServer.default);
  */
  
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
