import { getStatusPageBySlug, fetchMonitorStatus, getMonitorUptimeHistory, getMonitorHistory } from "../../actions";
import { notFound } from "next/navigation";
import { CheckCircle2, AlertCircle, XCircle, Clock } from "lucide-react";
import { MetricGraph } from "../../components/MetricGraph";

export const dynamic = "force-dynamic";

export default async function PublicStatusPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const statusPage = await getStatusPageBySlug(slug);

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
        return services.map((s: any) => {
          // Extract service-specific metrics from history
          let serviceCpuSeries: number[] = [];
          let serviceRamSeries: number[] = [];
          let serviceNetInSeries: number[] = [];
          let serviceNetOutSeries: number[] = [];

          if (statusPage.showMetrics && graphMetrics.length > 0) {
            graphMetrics.forEach(m => {
              const serviceData = m.data.find((d: any) => d.id === s.id || d.name === s.name);
              if (serviceData && serviceData.metrics) {
                serviceCpuSeries.push(serviceData.metrics.cpu || 0);
                serviceRamSeries.push(serviceData.metrics.ram || 0);
                serviceNetInSeries.push(serviceData.metrics.networkIn || 0);
                serviceNetOutSeries.push(serviceData.metrics.networkOut || 0);
              } else {
                serviceCpuSeries.push(0);
                serviceRamSeries.push(0);
                serviceNetInSeries.push(0);
                serviceNetOutSeries.push(0);
              }
            });
          }

          return {
            id: `${monitor.id}-${s.id}`,
            monitorId: monitor.id,
            name: s.name,
            status: s.status === "running" ? "operational" : s.status === "degraded" ? "degraded" : "outage",
            history: history,
            cpuSeries: statusPage.showCpu ? serviceCpuSeries : [],
            ramSeries: statusPage.showRam ? serviceRamSeries : [],
            netInSeries: statusPage.showNetwork ? serviceNetInSeries : [],
            netOutSeries: statusPage.showNetwork ? serviceNetOutSeries : []
          };
        });
      } catch (err) {
        return [{ 
            id: monitor.id, 
            monitorId: monitor.id,
            name: monitor.name, 
            status: "outage", 
            history: Array.from({ length: 30 }).map((_, i) => ({ date: '', status: 'operational' })),
            cpuSeries: [],
            ramSeries: []
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
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
      {/* Background Pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" 
           style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      {/* Header */}
      <div className="border-b-2 border-black bg-white sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-10 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-black font-black text-xl">
                  {statusPage.title.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-xs font-black uppercase tracking-[0.2em]">Overseer Status</span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">Live Monitoring</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-10 py-16">
        {/* Page Title */}
        <div className="mb-16 border-l-4 border-black pl-8 py-2">
            <h1 className="text-6xl font-black text-black uppercase tracking-tighter mb-2 leading-none">
              {statusPage.title}
            </h1>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-black/40">
              {statusPage.description || "Experimental Status Monitoring"}
            </p>
        </div>

        {/* Hero Overall Status */}
        <div className={`mb-20 p-10 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row items-center justify-between gap-8 ${
          overallStatus === 'operational' ? 'bg-green-400' : 
          overallStatus === 'degraded' ? 'bg-yellow-400' : 'bg-red-400'
        }`}>
          <div className="flex items-center gap-6">
            <div className="p-4 bg-white border-4 border-black">
              {overallStatus === 'operational' ? <CheckCircle2 className="w-10 h-10" /> : 
               overallStatus === 'degraded' ? <AlertCircle className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
            </div>
            <div>
              <h2 className="text-4xl font-black uppercase tracking-tighter leading-none mb-2">
                {overallStatus === 'operational' ? 'All Systems Operational' : 
                 overallStatus === 'degraded' ? 'Partial Degradation' : 'Major System Outage'}
              </h2>
              <p className="text-xs font-bold uppercase tracking-widest opacity-80">
                lastchecked: {new Date().toLocaleTimeString().toUpperCase()}
              </p>
            </div>
          </div>
        </div>

        {/* Monitors List */}
        <div className="space-y-12">
            <div className="flex items-center justify-between border-b-2 border-black pb-4">
              <h2 className="text-3xl font-black uppercase tracking-tighter">Systems</h2>
              <span className="bg-black text-white text-[10px] px-3 py-1 font-bold uppercase tracking-widest">
                {statusPage.monitors.length} Monitors
              </span>
            </div>

            <div className="grid gap-8">
              {displayItems.map((item: any) => (
                <div key={item.id} className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-8">
                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                      <div className="flex flex-col gap-2">
                         <div className="flex items-center gap-3">
                            <h3 className="text-2xl font-black uppercase tracking-tighter">{item.name}</h3>
                            <div className={`w-3 h-3 border-2 border-black ${
                              item.status === 'operational' ? 'bg-green-500' : 
                              item.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                            }`} />
                         </div>
                         <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">System Monitor Endpoint</span>
                      </div>

                      {/* Uptime History Layout (BetterStack style) */}
                      <div className="flex-1 flex flex-col gap-3">
                         <div className="flex justify-between items-end mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Uptime (Last 30 Days)</span>
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${
                                item.history.every((h: any) => h.status === 'operational' || h.status === 'no-data') ? 'text-green-600' : 'text-yellow-600'
                            }`}>
                                {(() => {
                                  const relevantDays = item.history.filter((h: any) => h.status !== 'no-data');
                                  if (relevantDays.length === 0) return "100.0";
                                  const operationalDays = relevantDays.filter((h: any) => h.status === 'operational').length;
                                  return ((operationalDays / relevantDays.length) * 100).toFixed(1);
                                })()}% Uptime
                            </span>
                         </div>
                         <div className="flex gap-1 h-8">
                            {item.history.map((h: any, i: number) => (
                              <div 
                                key={i} 
                                className={`flex-1 border border-black/10 transition-all cursor-crosshair hover:scale-y-125 hover:z-10 ${
                                    h.status === 'operational' ? 'bg-green-500/30' : 
                                    h.status === 'degraded' ? 'bg-yellow-500' : 
                                    h.status === 'outage' ? 'bg-red-500' : 'bg-black/5'
                                } ${i === item.history.length - 1 ? (item.status === 'operational' ? 'bg-green-500' : 'bg-red-500') : ''}`} 
                                title={`${h.date}: ${h.status.toUpperCase()}`}
                              />
                            ))}
                         </div>
                         <div className="flex justify-between px-1">
                            <span className="text-[8px] font-bold uppercase tracking-widest opacity-20">30D Ago</span>
                            <span className="text-[8px] font-bold uppercase tracking-widest opacity-20 text-right">
                                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
                            </span>
                         </div>
                      </div>

                      <div className="flex items-center gap-4 border-l-2 border-black/10 pl-8 min-w-[140px]">
                         <div className="text-right w-full">
                           <div className={`text-xs font-black uppercase tracking-widest ${
                             item.status === 'operational' ? 'text-green-600' : 
                             item.status === 'degraded' ? 'text-yellow-600' : 'text-red-600'
                           }`}>
                             {item.status === 'operational' ? 'Operational' : 
                              item.status === 'degraded' ? 'Degraded' : 'Major Outage'}
                           </div>
                           <div className="text-[8px] font-bold uppercase tracking-widest opacity-20 mt-1 flex items-center justify-end gap-1">
                             <Clock className="w-2 h-2" />
                             Polled Just Now
                           </div>
                         </div>
                      </div>
                   </div>

                   {statusPage.showMetrics && (item.cpuSeries.length > 0 || item.ramSeries.length > 0 || item.netInSeries.length > 0) && (
                     <div className="mt-10 pt-8 border-t-2 border-black/5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {item.cpuSeries.length > 0 && (
                          <div className="space-y-2">
                             <MetricGraph 
                               data={item.cpuSeries} 
                               label="CPU %" 
                               color="#000000" 
                               height={60}
                             />
                          </div>
                        )}
                        {item.ramSeries.length > 0 && (
                          <div className="space-y-2">
                             <MetricGraph 
                               data={item.ramSeries} 
                               label="RAM %" 
                               color="#000000" 
                               height={60}
                             />
                          </div>
                        )}
                        {item.netInSeries.length > 0 && (
                          <div className="space-y-2">
                             <MetricGraph 
                               data={item.netInSeries} 
                               label="TRAFFIC IN" 
                               unit="B/s"
                               color="#000000" 
                               max={Math.max(...item.netInSeries, 1024)}
                               height={60}
                             />
                          </div>
                        )}
                        {item.netOutSeries.length > 0 && (
                          <div className="space-y-2">
                             <MetricGraph 
                               data={item.netOutSeries} 
                               label="TRAFFIC OUT" 
                               unit="B/s"
                               color="#000000" 
                               max={Math.max(...item.netOutSeries, 1024)}
                               height={60}
                             />
                          </div>
                        )}
                     </div>
                   )}
                </div>
              ))}
            </div>
        </div>

        {/* Footer */}
        <footer className="mt-32 pt-16 border-t-2 border-black flex flex-col items-center gap-8">
            <div className="w-12 h-12 border-2 border-black flex items-center justify-center rotate-45 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <div className="w-2 h-2 bg-black -rotate-45" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-black/40">
                Overseer Infrastructure Monitoring
            </p>
            <div className="flex gap-10">
              <div className="w-1 h-1 bg-black/20" />
              <div className="w-1 h-1 bg-black/20" />
              <div className="w-1 h-1 bg-black/20" />
            </div>
        </footer>
      </main>
    </div>
  );
}

