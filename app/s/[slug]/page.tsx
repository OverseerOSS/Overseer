import { getStatusPageBySlug, fetchMonitorStatus, getMonitorUptimeHistory, getMonitorHistory, getTheme } from "../../actions";
import { notFound } from "next/navigation";
import { Clock } from "lucide-react";
import StatusPageContent from "./components/StatusPageContent";
import { ThemeSync } from "@/app/components/ThemeSync";

export const dynamic = "force-dynamic";

export default async function PublicStatusPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const statusPage = await getStatusPageBySlug(slug);
  const theme = await getTheme();

  if (!statusPage) {
    notFound();
  }

  // Fetch statuses and history for all monitors attached to this status page
  const displayItems = (await Promise.all(
    statusPage.monitors.map(async (monitor: any) => {
      try {
        const [statusResult, history, graphMetrics] = await Promise.all([
            fetchMonitorStatus(monitor.id),
            getMonitorUptimeHistory(monitor.id, 30),
            statusPage.showMetrics ? getMonitorHistory(monitor.id, 50) : Promise.resolve([])
        ]);
        
        let services: any[] = [];
        if (statusResult.success && statusResult.data) {
           services = statusResult.data;
        }

        // Apply filtering from config if it exists
        const monitorConfig = (statusPage.config as any)?.monitors?.[monitor.id];
        if (monitorConfig?.includedServices?.length > 0) {
           services = services.filter((s: any) => 
             monitorConfig.includedServices.includes(s.id) || 
             monitorConfig.includedServices.includes(s.name)
           );
        }

        // Transform services into display items
        return services.map((s: any, idx: number) => {
          // Use monitor name as the primary display name for standard monitors
          const displayName = monitor.name || s.name;
          
          return {
            id: `${monitor.id}-${s.id || idx}`,
            monitorId: monitor.id,
            type: monitor.type,
            serviceId: s.id,
            name: displayName,
            status: s.status === "running" ? "operational" : s.status === "degraded" ? "degraded" : "outage",
            history: history,
            service: s,
            fullHistory: graphMetrics.map(m => ({
               timestamp: m.timestamp,
               data: Array.isArray(m.data) ? m.data.find((d: any) => d.id === s.id || d.name === s.name) : null
            })).filter(h => h.data)
          };
        });
      } catch (err) {
        return [{ 
            id: monitor.id, 
            monitorId: monitor.id,
            type: monitor.type,
            name: monitor.name, 
            status: "outage", 
            history: Array.from({ length: 30 }).map((_, i) => ({ date: '', status: 'operational' })),
            service: { id: 'unknown', name: monitor.name, status: 'failed' },
            fullHistory: []
        }];
      }
    })
  )).flat();

  const overallStatus = displayItems.every((m: any) => m.status === "operational")
    ? "operational"
    : displayItems.some((m: any) => m.status === "outage")
    ? "outage"
    : "degraded";

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-black dark:text-white font-sans selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black transition-colors duration-300">
      <ThemeSync theme={theme} />
      {/* Background Pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]" 
           style={{ backgroundImage: `radial-gradient(var(--foreground) 1px, transparent 1px)`, backgroundSize: '24px 24px' }} />

      {/* Header */}
      <div className="border-b-2 border-black dark:border-white bg-white dark:bg-[#0a0a0a] sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-10 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-xs font-black uppercase tracking-[0.2em]">{statusPage.title} Status</span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              overallStatus === 'operational' ? 'bg-green-500' :
              overallStatus === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40">Live</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-10 py-16">
        {/* Page Title */}
        <div className="mb-16 border-l-4 border-black dark:border-white pl-8 py-2">
            <h1 className="text-6xl font-black text-black dark:text-white uppercase tracking-tighter mb-2 leading-none">
              {statusPage.title}
            </h1>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-black/40">
              {statusPage.description || "Experimental Status Monitoring"}
            </p>
        </div>

        {/* Global Status Banner - Only show if banner is enabled AND there is an issue */}
        {statusPage.showBanner && overallStatus !== 'operational' && (
          <div className={`mb-16 p-4 border-2 border-black font-black uppercase tracking-widest text-xs text-white text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
            overallStatus === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
          }`}>
             {overallStatus === 'degraded' ? 'Partial System Outage' : 'Major System Outage'}
          </div>
        )}

        <StatusPageContent initialItems={displayItems} statusPage={statusPage} />
      </main>
    </div>
  );
}
