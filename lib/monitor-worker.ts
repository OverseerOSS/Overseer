import { db } from "./db";
import { fetchCoreStatus } from "./monitoring/core-engine";
import { sendDiscordNotification } from "./notifications/discord";
import { isDemoMode } from "./settings";

let isPolling = false;
const lastRunCache: Record<string, number> = {};

export async function pollAllMonitors() {
  // If we are in demo mode, we don't handle background polling for DB monitors
  if (isPolling || isDemoMode()) return;
  isPolling = true;

  try {
    const monitors = await db.serviceMonitor.findMany({
      where: { active: true },
      include: { notificationChannels: true }
    });

    const now = Date.now();
    const dueMonitors = monitors.filter(m => {
      const lastRun = lastRunCache[m.id] || 0;
      // If we've never run it, or it's due based on its interval
      if (now - lastRun >= (m.interval || 60) * 1000) {
        lastRunCache[m.id] = now;
        return true;
      }
      return false;
    });

    if (dueMonitors.length === 0) {
      isPolling = false;
      return;
    }

    await Promise.allSettled(
      dueMonitors.map(async (monitor) => {
        try {
          // Core engine monitor (Built-in monitoring)
          const config = monitor.config ? JSON.parse(monitor.config) : {};
          const data = await fetchCoreStatus(monitor.type, { 
            alias: monitor.name, // Use monitor name as default alias
            ...config, 
            url: monitor.url, 
            method: monitor.method 
          });

          if (!data) return;

          // Update last status and save metric
          const latestStatus = data[0]?.status === 'running' ? 'operational' : data[0]?.status === 'degraded' ? 'degraded' : 'outage';
          const previousStatus = monitor.lastStatus;

          // Detect status change for notifications
          if (previousStatus !== latestStatus && previousStatus !== 'unknown') {
            for (const channel of monitor.notificationChannels) {
               if (channel.active && channel.type === 'discord') {
                 const channelConfig = JSON.parse(channel.config);
                 if (channelConfig.webhookUrl) {
                   await sendDiscordNotification(
                     channelConfig.webhookUrl, 
                     monitor.name, 
                     latestStatus,
                     data[0].details?.error || `Status changed from ${previousStatus} to ${latestStatus}`
                   );
                 }
               }
            }
          }
          
          await Promise.all([
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
          ]);
        } catch (err) {
          console.error(`Background poll failed for monitor ${monitor.id}:`, err);
        }
      })
    );
  } catch (err) {
    console.error("Background monitoring loop failed:", err);
  } finally {
    isPolling = false;
  }
}

export function startBackgroundMonitoring(intervalMs: number = 60000) {
  console.log(`[Overseer] Starting background monitoring (interval: ${intervalMs}ms)`);
  
  // Run once immediately
  pollAllMonitors();

  // Schedule periodic runs
  const interval = setInterval(pollAllMonitors, intervalMs);

  return () => clearInterval(interval);
}
