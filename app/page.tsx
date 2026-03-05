"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  addServiceMonitor,
  deleteServiceMonitor,
  getDashboardData,
  getServiceMonitors,
  logout,
  getMonitorHistory,
  checkDatabaseReady,
  getMonitorUptimeStats,
  updateServiceMonitor,
  probeMonitor,
  updateMonitorNotificationChannels,
  getIsDemoMode
} from "./actions";
import { ServiceInfo, MonitorMetadata } from "@/lib/monitoring/types";
import { GenericMonitorCard } from "./components/GenericMonitorCard";
import { Sidebar } from "./components/Sidebar";
import { StatusCards } from "./components/StatusCards";
import { Plus, X, Zap, Bell } from "lucide-react";
import Link from "next/link";
import { getDemoMonitors, saveDemoMonitors, getDemoOrgName, saveDemoOrgName, fetchDemoMonitorStatus } from "@/lib/demo-client";

interface Monitor {
  id: string;
  name: string;
  type: string;
  config: string;
  url?: string | null;
  method?: string | null;
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading Overseer...</div>}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const monitorIdParam = searchParams.get("monitor");

  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [orgName, setOrgName] = useState("Overseer");
  const [monitorTypes, setMonitorTypes] = useState<MonitorMetadata[]>([]);
  const [notificationChannels, setNotificationChannels] = useState<any[]>([]);
  const [selectedMonitorId, setSelectedMonitorId] = useState<string | null>(null);
  const [monitorData, setMonitorData] = useState<ServiceInfo[] | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [uptimeStats, setUptimeStats] = useState<{ uptime24h: number; uptime30d: number } | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [newMonitorName, setNewMonitorName] = useState("");
  const [newMonitorConfig, setNewMonitorConfig] = useState<Record<string, any>>({});
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProbing, setIsProbing] = useState(false);
  const [error, setError] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [editingMonitorId, setEditingMonitorId] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const handleProbe = async () => {
    const url = newMonitorConfig.url;
    if (!url) {
      setError("Enter a URL first to auto-probe");
      return;
    }

    setIsProbing(true);
    setError("");
    
    try {
      const result = await probeMonitor(url);
      if (result.success && result.suggestions) {
        setNewMonitorConfig(prev => ({
          ...prev,
          ...result.suggestions
        }));
        // If name is empty, suggest one from the URL
        if (!newMonitorName) {
            try {
                const hostname = new URL(result.suggestions.url).hostname;
                setNewMonitorName(hostname.toUpperCase());
            } catch {}
        }
      } else {
        setError(result.error || "Probe failed. Check the URL and try again.");
      }
    } catch (err: any) {
      setError("An error occurred during probing.");
    } finally {
      setIsProbing(false);
    }
  };

  // Sync selected monitor from URL
  useEffect(() => {
    if (monitorIdParam) {
      setSelectedMonitorId(monitorIdParam);
    } else if (monitors.length > 0 && !selectedMonitorId) {
      setSelectedMonitorId(monitors[0].id);
    }
  }, [monitorIdParam, monitors, selectedMonitorId]);

  // Load initial data
  useEffect(() => {
    checkDatabaseReady().then(status => {
      if (!status.ready && status.error === 'setup_required') {
         logout();
         return;
      }
      loadDashboard();
    });
  }, []);

  const loadDashboard = async () => {
    try {
        const demoMode = await getIsDemoMode();
        setIsDemo(demoMode);

        const data = await getDashboardData();
        setMonitorTypes(data.monitorTypes);
        setNotificationChannels(data.notificationChannels);

        if (demoMode) {
          const mons = getDemoMonitors();
          setMonitors(mons as any);
          setOrgName(getDemoOrgName());
          if (mons.length > 0 && !selectedMonitorId) {
            setSelectedMonitorId(mons[0].id);
          }
        } else {
          if (data.monitors) {
            setMonitors(data.monitors as any);
            if (data.monitors.length > 0 && !selectedMonitorId) {
              setSelectedMonitorId(data.monitors[0].id);
            }
          }
          setOrgName(data.orgName);
        }
    } catch (err) { 
      console.error(err); 
    }
  };

  // Stream monitor data and live history
  useEffect(() => {
    if (!selectedMonitorId) {
      setMonitorData(null);
      setHistoryData([]);
      setUptimeStats(null);
      return;
    }

    let isSubscribed = true;

    if (isDemo) {
      const selected = monitors.find(m => m.id === selectedMonitorId);
      if (!selected) {
        setMonitorData(null);
        setHistoryData([]);
        return;
      }

      const runDemoCheck = async () => {
        try {
          const data = await fetchDemoMonitorStatus(selected);
          if (!isSubscribed) return;
          setMonitorData(data);
          setHistoryData(prev => {
            const point = {
              timestamp: new Date().toISOString(),
              data
            };
            return [...prev, point].slice(-100);
          });
        } catch {
          // Keep UI responsive in demo mode even if a fetch fails.
        }
      };

      runDemoCheck();
      const timer = setInterval(runDemoCheck, 5000);

      return () => {
        isSubscribed = false;
        clearInterval(timer);
      };
    }

    getMonitorUptimeStats(selectedMonitorId).then(stats => {
      if (isSubscribed) setUptimeStats(stats);
    });

    getMonitorHistory(selectedMonitorId, 100).then(history => {
      if (isSubscribed) {
        setHistoryData(history);
        if (history.length > 0 && !monitorData) {
           setMonitorData(history[history.length - 1].data);
        }
      }
    });

    const eventSource = new EventSource(`/api/monitors/${selectedMonitorId}/stream`);

    const handleUpdate = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.data && isSubscribed) {
          const newData = payload.data;
          setMonitorData(newData);
          setHistoryData(prev => {
            const newHistoryPoint = {
              timestamp: new Date().toISOString(),
              data: newData
            };
            const updated = [...prev, newHistoryPoint];
            return updated.slice(-100);
          });
        }
      } catch (err) {}
    };

    eventSource.addEventListener('update', handleUpdate as any);
    eventSource.onerror = () => {
      console.warn("SSE connection interrupted, reconnecting...");
    };

    return () => {
      isSubscribed = false;
      eventSource.removeEventListener('update', handleUpdate as any);
      eventSource.close();
    };
  }, [selectedMonitorId, isDemo, monitors]);

  const handleAddMonitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTypeId || !newMonitorName) return;

    setIsSubmitting(true);
    setError("");

    const monitorType = monitorTypes.find(t => t.id === selectedTypeId);
    const finalConfig = { ...newMonitorConfig };

    if (monitorType) {
      monitorType.configSchema.forEach(field => {
        const userValue = finalConfig[field.key];
        if ((userValue === undefined || userValue === "") && field.defaultValue !== undefined) {
          finalConfig[field.key] = field.defaultValue;
        }
      });
    }

    let result;
    if (isDemo) {
      if (editingMonitorId) {
        setMonitors(prev => {
          const updated = prev.map(m => m.id === editingMonitorId ? { ...m, name: newMonitorName, config: JSON.stringify(finalConfig), url: finalConfig.url || null, method: finalConfig.method || "GET" } : m);
          saveDemoMonitors(updated);
          return updated;
        });
        result = { success: true };
      } else {
        const newMon = {
          id: Math.random().toString(36).substr(2, 9),
          name: newMonitorName,
          type: selectedTypeId,
          config: JSON.stringify(finalConfig),
          url: finalConfig.url || null,
          method: finalConfig.method || "GET",
          interval: 60
        };
        setMonitors(prev => {
          const updated = [...prev, newMon];
          saveDemoMonitors(updated);
          return updated;
        });
        if (!selectedMonitorId) setSelectedMonitorId(newMon.id);
        result = { success: true, monitor: newMon };
      }
    } else {
      if (editingMonitorId) {
        result = await updateServiceMonitor(editingMonitorId, newMonitorName, finalConfig);
      } else {
        result = await addServiceMonitor(selectedTypeId, newMonitorName, finalConfig);
      }
      
      if (result.success && result.monitor) {
        await updateMonitorNotificationChannels(result.monitor.id, selectedChannelIds);
      }
    }

    setIsSubmitting(false);

    if (result.success) {
      setIsAddModalOpen(false);
      setEditingMonitorId(null);
      setNewMonitorName("");
      setNewMonitorConfig({});
      setSelectedTypeId("");
      setSelectedChannelIds([]);
      setError("");
      if (!isDemo) {
        const monitorsList = await getServiceMonitors();
        setMonitors(monitorsList as any);
      }
    } else {
      setError(result.error || "Failed to save monitor");
    }
  };

  const handleDelete = async (id: string) => {
    if (isDemo) {
      setMonitors(prev => {
        const updated = prev.filter(m => m.id !== id);
        saveDemoMonitors(updated);
        if (selectedMonitorId === id) {
          setSelectedMonitorId(updated[0]?.id || null);
        }
        return updated;
      });
      setDeleteTargetId(null);
      return;
    }
    const result = await deleteServiceMonitor(id);
    if (result.success) {
      setDeleteTargetId(null);
      const monitorsList = await getServiceMonitors();
      setMonitors(monitorsList as any);
      if (selectedMonitorId === id) {
        setSelectedMonitorId(monitorsList[0]?.id || null);
      }
    }
  };

  const selectedMonitor = useMemo(
    () => monitors.find(m => m.id === selectedMonitorId),
    [monitors, selectedMonitorId]
  );

  const selectedTypeDefinition = useMemo(
    () => monitorTypes.find(t => t.id === selectedTypeId),
    [monitorTypes, selectedTypeId]
  );

  return (
    <div className="flex h-screen bg-white dark:bg-[#0a0a0a] transition-colors duration-300">
      <Sidebar
        monitors={monitors}
        orgName={orgName}
        selectedMonitorId={selectedMonitorId || undefined}
        onLogout={logout}
        onDeleteMonitor={(id) => setDeleteTargetId(id)}
        onEditMonitor={(id) => {
          const m = monitors.find(x => x.id === id);
          if (m) {
            setEditingMonitorId(id);
            setNewMonitorName(m.name);
            setSelectedTypeId(m.type);
            setNewMonitorConfig(JSON.parse(m.config));
            
            // Find which channels this monitor belongs to
            const linkedChannels = notificationChannels
              .filter(c => c.monitors.some((mon: any) => mon.id === id))
              .map(c => c.id);
            setSelectedChannelIds(linkedChannels);
            
            setIsAddModalOpen(true);
          }
        }}
        isDemo={isDemo}
      />

      <div className="flex-1 ml-64 flex flex-col overflow-hidden bg-white dark:bg-[#0a0a0a]">
        <header className="border-b-2 border-black dark:border-white bg-white dark:bg-[#0a0a0a] sticky top-0 z-10">
          <div className="px-10 py-6 flex items-center justify-between">
            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-black dark:text-white">
              <Link href="/" className="hover:line-through transition-all">Dashboard</Link>
              <div className="w-2 h-2 bg-black dark:bg-white rotate-45" />
              <Link href={`/?monitor=${selectedMonitorId}`} className="font-bold truncate max-w-[200px]">
                {selectedMonitor?.name || "Monitor"}
              </Link>
              <div className="w-1.5 h-1.5 bg-black/20 dark:bg-white/20" />
              <span className="opacity-40 font-bold">Analytics</span>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-3 px-8 py-4 bg-black dark:bg-white text-white dark:text-black font-black uppercase tracking-widest text-xs hover:bg-white dark:hover:bg-black hover:text-black dark:hover:text-white border-2 border-black dark:border-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
            >
              <Plus className="w-5 h-5 stroke-[3]" />
              Add Monitor
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-white dark:bg-[#0a0a0a]">
          <div className="p-10 max-w-7xl mx-auto">
            <div className="mb-12 border-l-4 border-black dark:border-white pl-8 py-2">
              <h1 className="text-6xl font-bold text-black dark:text-white uppercase tracking-tighter mb-2 leading-none">
                {selectedMonitor?.name || "Overseer Dashboard"}
              </h1>
              {selectedMonitor && (
                <div className="flex items-center gap-4">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-black/40 dark:text-white/40">
                    Type: <span className="text-black/80">{selectedMonitor.type}</span>
                  </p>
                  <div className="w-1.5 h-1.5 bg-black/20" />
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-black/40">
                    ID: <span className="text-black/80">{selectedMonitor.id}</span>
                  </p>
                </div>
              )}
            </div>

            {monitors.length === 0 ? (
              <div className="bg-white dark:bg-black border-2 border-black dark:border-white p-20 text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] transition-colors">
                <p className="text-2xl font-bold uppercase tracking-tighter mb-10 text-black dark:text-white">No monitors configured yet.</p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-4 px-10 py-5 border-2 border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-bold uppercase tracking-widest text-lg hover:bg-white dark:hover:bg-black hover:text-black dark:hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                >
                  <Plus className="w-6 h-6" />
                  Add Your First Monitor
                </button>
              </div>
            ) : (
              <>
                <StatusCards lastChecked="Just now" />

                {selectedMonitor && (
                   <div className="mt-20">
                     <div className="flex items-center justify-between mb-10 border-b-2 border-black dark:border-white pb-4 transition-colors">
                        <h2 className="text-4xl font-bold text-black dark:text-white uppercase tracking-tighter flex items-center gap-4">
                           Resources
                           {monitorData && (
                             <span className="bg-black dark:bg-white text-white dark:text-black text-xs px-3 py-1 font-bold">
                               {monitorData.length}
                             </span>
                           )}
                        </h2>
                     </div>

                     {!monitorData ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                           {[1, 2, 3].map(i => (
                             <div key={i} className="h-48 bg-white dark:bg-black border-2 border-black dark:border-white animate-pulse shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)]" />
                           ))}
                        </div>
                     ) : monitorData.length === 0 ? (
                        <div className="bg-white dark:bg-black border-2 border-black dark:border-white p-16 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-colors">
                           <p className="text-black dark:text-white font-bold uppercase tracking-widest opacity-50">No resources discovered for this monitor.</p>
                        </div>
                     ) : (
                        <div className={`grid gap-8 ${
                           monitorData.length === 1 ? 'grid-cols-1' : 
                           monitorData.length === 2 ? 'grid-cols-1 lg:grid-cols-2' : 
                           'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                        }`}>
                           {monitorData.map((service, index) => (
                             <div key={service.id || `service-${index}`} className="bg-white dark:bg-black border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] flex flex-col hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] transition-all">
                                <div className="px-5 py-4 border-b-2 border-black dark:border-white flex items-center justify-between bg-white dark:bg-black">
                                   <div className="flex items-center gap-3">
                                      <div className={`w-3 h-3 border-2 border-black dark:border-white ${
                                         service.status === 'running' ? 'bg-green-500' :
                                         service.status === 'degraded' ? 'bg-yellow-500' :
                                         'bg-red-500'
                                      }`} />
                                      <span className="font-bold text-black dark:text-white uppercase tracking-tighter text-lg truncate max-w-[180px]" title={service.name}>
                                        {service.name}
                                      </span>
                                   </div>
                                   <span className="text-[10px] font-bold uppercase tracking-widest text-black dark:text-white opacity-50">
                                      {service.type}
                                   </span>
                                </div>
                                <div className="p-6 flex-1">
                                   <GenericMonitorCard 
                                     service={service} 
                                     history={historyData.map(h => ({
                                        timestamp: h.timestamp,
                                        data: Array.isArray(h.data) ? h.data.find((s: any) => s.id === service.id) : null
                                     })).filter(h => h.data)} 
                                     uptimeStats={uptimeStats}
                                   />
                                </div>
                             </div>
                           ))}
                        </div>
                     )}
                   </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 dark:bg-white/10 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white dark:bg-black border-2 border-black dark:border-white max-w-xl w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
            <div className="px-8 py-8 border-b-2 border-black dark:border-white flex items-center justify-between bg-black dark:bg-white text-white dark:text-black">
              <div>
                <h3 className="text-3xl font-bold uppercase tracking-tighter">{editingMonitorId ? 'Edit Monitor' : 'Add Monitor'}</h3>
                <p className="text-[10px] uppercase font-bold tracking-widest opacity-60 mt-2">{editingMonitorId ? 'Update monitor configuration' : 'Deploy new monitoring endpoint'}</p>
              </div>
              <button onClick={() => { setIsAddModalOpen(false); setEditingMonitorId(null); }} className="p-2 border-2 border-white dark:border-black hover:bg-white dark:hover:bg-black hover:text-black dark:hover:text-white transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddMonitor} className="p-8 space-y-8">
              <div>
                <label className="block text-xs font-bold mb-3 uppercase tracking-widest text-black dark:text-white">Monitor Name</label>
                <input
                  type="text"
                  value={newMonitorName}
                  onChange={e => setNewMonitorName(e.target.value)}
                  className="w-full px-5 py-4 bg-white dark:bg-black border-2 border-black dark:border-white font-bold uppercase tracking-widest text-sm focus:outline-none focus:bg-black dark:focus:bg-white focus:text-white dark:focus:text-black transition-colors text-black dark:text-white"
                  placeholder="E.G. PRODUCTION API"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-3 uppercase tracking-widest text-black dark:text-white">Monitor Type</label>
                <select
                  value={selectedTypeId}
                  onChange={e => setSelectedTypeId(e.target.value)}
                  className="w-full px-5 py-4 border-2 border-black dark:border-white font-bold uppercase tracking-widest text-sm focus:outline-none bg-white dark:bg-black text-black dark:text-white"
                  required
                >
                  <option value="">SELECT A TYPE...</option>
                  {monitorTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>

              {selectedTypeDefinition && (
                <div className="space-y-6 pt-6 border-t-2 border-black dark:border-white">
                  <h4 className="text-sm font-bold uppercase tracking-widest bg-black dark:bg-white text-white dark:text-black px-3 py-1 inline-block">Configuration</h4>
                  {selectedTypeDefinition.configSchema.map(field => (
                    <div key={field.key}>
                      {field.type === "checkbox" ? (
                        <label className="flex items-center gap-4 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={newMonitorConfig[field.key] || false}
                            onChange={e => setNewMonitorConfig(prev => ({ ...prev, [field.key]: e.target.checked }))}
                            className="sr-only"
                          />
                          <div className={`w-6 h-6 border-2 border-black dark:border-white transition-all ${newMonitorConfig[field.key] ? 'bg-black dark:bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]' : 'bg-white dark:bg-black'}`}>
                            {newMonitorConfig[field.key] && <div className="flex items-center justify-center h-full"><div className="w-2.5 h-2.5 bg-white dark:bg-black" /></div>}
                          </div>
                          <span className="text-xs font-bold uppercase tracking-widest text-black dark:text-white">{field.label}</span>
                        </label>
                      ) : (
                        <>
                          <label className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-black dark:text-white">{field.label}{field.required && <span className="text-red-500 ml-1 font-bold">*</span>}</span>
                            {field.key === "url" && (
                              <button
                                type="button"
                                onClick={handleProbe}
                                disabled={isProbing}
                                className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 px-2 py-1 bg-black dark:bg-white text-white dark:text-black hover:bg-white dark:hover:bg-black hover:text-black dark:hover:text-white border border-black dark:border-white transition-all disabled:opacity-50"
                              >
                                {isProbing ? (
                                  <div className="w-3 h-3 border-2 border-white/30 dark:border-black/30 border-t-white dark:border-t-black animate-spin rounded-full" />
                                ) : (
                                  <Zap className="w-3 h-3" />
                                )}
                                {isProbing ? "Probing..." : "Auto-Config"}
                              </button>
                            )}
                          </label>
                          <input
                            type={field.type === "password" ? "password" : "text"}
                            value={newMonitorConfig[field.key] || ""}
                            onChange={e => setNewMonitorConfig(prev => ({ ...prev, [field.key]: e.target.value }))}
                            className="w-full px-4 py-3 border-2 border-black dark:border-white bg-white dark:bg-black font-bold uppercase tracking-widest text-xs focus:bg-black dark:focus:bg-white focus:text-white dark:focus:text-black transition-colors text-black dark:text-white"
                            placeholder={String(field.defaultValue || "").toUpperCase()}
                            required={field.required}
                          />
                          {field.description && <p className="text-[10px] text-black dark:text-white font-bold uppercase tracking-widest mt-2 opacity-50">{field.description}</p>}
                        </>
                      )}
                    </div>
                  ))}

                  {/* Notification Channels Selection */}
                  <div className="pt-6 border-t-2 border-dashed border-black/20 dark:border-white/20">
                    <label className="block text-xs font-bold mb-4 uppercase tracking-widest text-black dark:text-white flex items-center gap-2">
                       <Bell className="w-4 h-4" /> Notifications
                    </label>
                    {notificationChannels.length === 0 ? (
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">No channels configured. Add them in Settings.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        {notificationChannels.map(channel => (
                          <label key={channel.id} className="flex items-center gap-3 p-3 border-2 border-black dark:border-white hover:bg-black group hover:text-white cursor-pointer transition-all">
                            <input
                              type="checkbox"
                              checked={selectedChannelIds.includes(channel.id)}
                              onChange={e => {
                                if (e.target.checked) setSelectedChannelIds(prev => [...prev, channel.id]);
                                else setSelectedChannelIds(prev => prev.filter(id => id !== channel.id));
                              }}
                              className="sr-only"
                            />
                            <div className={`w-5 h-5 border-2 border-black dark:border-white group-hover:border-white bg-white dark:bg-black transition-all flex items-center justify-center`}>
                               {selectedChannelIds.includes(channel.id) && <div className="w-2.5 h-2.5 bg-black dark:bg-white" />}
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest">{channel.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {error && <div className="p-4 bg-red-500 border-2 border-black dark:border-white text-white font-bold uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">{error}</div>}

              <div className="flex gap-4 pt-8 border-t-2 border-black dark:border-white">
                <button type="button" onClick={() => { setIsAddModalOpen(false); setEditingMonitorId(null); }} className="flex-1 px-4 py-4 border-2 border-black dark:border-white font-bold uppercase tracking-widest text-sm hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] text-black dark:text-white">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-4 border-2 border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-bold uppercase tracking-widest text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:bg-white dark:hover:bg-black hover:text-black dark:hover:text-white transition-all disabled:opacity-50">
                  {isSubmitting ? "SAVING..." : (editingMonitorId ? "UPDATE MONITOR" : "CREATE MONITOR")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTargetId && (
        <div className="fixed inset-0 bg-black/60 dark:bg-white/10 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white dark:bg-black border-2 border-black dark:border-white max-w-sm w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
            <div className="px-8 py-8 border-b-2 border-black dark:border-white bg-black dark:bg-white text-white dark:text-black">
              <h3 className="text-2xl font-bold uppercase tracking-tighter">Delete Monitor?</h3>
            </div>
            <div className="px-8 py-8"><p className="text-black dark:text-white font-bold uppercase tracking-widest text-xs opacity-60">This action cannot be undone. All history will be lost.</p></div>
            <div className="px-8 py-6 border-t-2 border-black dark:border-white flex gap-4">
              <button onClick={() => setDeleteTargetId(null)} className="flex-1 px-4 py-4 border-2 border-black dark:border-white font-bold uppercase tracking-widest text-xs hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] text-black dark:text-white">Cancel</button>
              <button onClick={() => handleDelete(deleteTargetId)} className="flex-1 px-4 py-4 border-2 border-black dark:border-white bg-red-500 text-white font-bold uppercase tracking-widest text-xs hover:bg-black dark:hover:bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
