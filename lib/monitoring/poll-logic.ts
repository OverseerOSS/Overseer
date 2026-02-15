import { db } from "@/lib/db";
import { fetchCoreStatus } from "./core-engine";
import { ServiceInfo } from "./types";

export async function pollMonitor(monitorId: string): Promise<{ success: boolean; data?: ServiceInfo[]; error?: string }> {
  try {
    const monitor = await db.serviceMonitor.findUnique({
      where: { id: monitorId },
    });
    if (!monitor) return { success: false, error: "Monitor not found" };

    const config = monitor.config ? JSON.parse(monitor.config) : {};
    const data = await fetchCoreStatus(monitor.type, { 
      ...config, 
      url: monitor.url, 
      method: monitor.method 
    });

    if (!data) return { success: false, error: "No data returned" };

    // Update last status and save metric (background)
    const latestStatus = data[0]?.status === 'running' ? 'operational' : data[0]?.status === 'degraded' ? 'degraded' : 'outage';
    
    Promise.all([
      db.serviceMonitor.update({
        where: { id: monitor.id },
        data: { lastStatus: latestStatus }
      }),
      db.metric.create({
        data: {
          monitorId: monitor.id,
          data: JSON.stringify(data),
        },
      })
    ]).catch(err => {
        if (err.code === 'P2003') return;
        console.error("Failed to update status/save metrics:", err);
    });

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
