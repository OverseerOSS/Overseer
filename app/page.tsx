"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  addServiceMonitor,
  deleteServiceMonitor,
  getDashboardData,
  getServiceMonitors,
  logout,
  getGlobalConfig,
  fetchMonitorStatus,
  getMonitorHistory,
  checkDatabaseReady
} from "./actions";
import { ExtensionMetadata } from "./extensions/types";
import { getExtensionCard, getExtensionSetupComponent } from "./extensions/registry";
import { Sidebar } from "./components/Sidebar";
import { StatusCards } from "./components/StatusCards";
import { ChevronRight, Plus, X } from "lucide-react";
import Link from "next/link";

interface Monitor {
  id: string;
  name: string;
  extensionId: string;
  config: string;
}

interface ServiceInfo {
  id: string;
  name: string;
  type: string;
  status: "running" | "degraded" | "failed" | string;
  [key: string]: any;
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
  const [installedExtensions, setInstalledExtensions] = useState<string[]>([]);
  const [allExtensions, setAllExtensions] = useState<ExtensionMetadata[]>([]);
  const [selectedMonitorId, setSelectedMonitorId] = useState<string | null>(null);
  const [monitorData, setMonitorData] = useState<ServiceInfo[] | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [creationMetadata, setCreationMetadata] = useState<any>(null);
  const [selectedExtId, setSelectedExtId] = useState("");
  const [newMonitorName, setNewMonitorName] = useState("");
  const [newMonitorConfig, setNewMonitorConfig] = useState<Record<string, any>>({});
  const [globalConfig, setGlobalConfig] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

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
    // 1. Check DB Health
    checkDatabaseReady().then(status => {
      if (!status.ready && status.error === 'setup_required') {
         logout(); // Redirect to login -> setup
         return;
      }
      
      // 2. Load Data if ready
      loadDashboard();
    });
  }, []); // Only run once on mount

  const loadDashboard = async () => {
    try {
        const data = await getDashboardData();
        
        if (data.monitors) {
          setMonitors(data.monitors);
          if (data.monitors.length > 0 && !selectedMonitorId) {
            setSelectedMonitorId(data.monitors[0].id);
          }
        }
        
        setInstalledExtensions(data.installedExtensions);
        setAllExtensions(data.allExtensions);
        setOrgName(data.orgName);
    } catch (err) { 
      console.error(err); 
    }
  };

  /*
  useEffect(() => {
    // Moved to manual call
  }, [selectedMonitorId]);
  */



  // Stream monitor data and live history
  useEffect(() => {
    if (!selectedMonitorId) {
      setMonitorData(null);
      setHistoryData([]);
      return;
    }

    let isSubscribed = true;

    // 1. Initial history fetch to populate graphs
    getMonitorHistory(selectedMonitorId, 50).then(history => {
      if (isSubscribed) {
        setHistoryData(history);
        if (history.length > 0 && !monitorData) {
           setMonitorData(history[history.length - 1].data);
        }
      }
    });

    // 2. Setup SSE for live updates
    const eventSource = new EventSource(`/api/monitors/${selectedMonitorId}/stream`);

    const handleUpdate = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.data && isSubscribed) {
          const newData = payload.data;
          setMonitorData(newData);
          
          // Add to rolling history
          setHistoryData(prev => {
            const newHistoryPoint = {
              timestamp: new Date().toISOString(),
              data: newData
            };
            const updated = [...prev, newHistoryPoint];
            return updated.slice(-100); // Keep last 100 points
          });
        }
      } catch (err) {
        // Silently handle
      }
    };

    eventSource.addEventListener('update', handleUpdate as any);

    eventSource.onerror = (err) => {
      console.warn("SSE connection interrupted, reconnecting...");
    };

    return () => {
      isSubscribed = false;
      eventSource.removeEventListener('update', handleUpdate as any);
      eventSource.close();
    };
  }, [selectedMonitorId]); // Combined history and live data dependency

  // Load global config when extension changes
  useEffect(() => {
    if (selectedExtId) {
      const loadConfig = async () => {
        const config = await getGlobalConfig(selectedExtId);
        setGlobalConfig(config);
      };
      loadConfig();
    }
  }, [selectedExtId]);

  const handleAddMonitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExtId || !newMonitorName) return;

    setIsSubmitting(true);
    setError("");

    const ext = allExtensions.find(e => e.id === selectedExtId);
    const finalConfig = { ...newMonitorConfig };

    if (ext) {
      ext.configSchema.forEach(field => {
        const userValue = finalConfig[field.key];
        const hasGlobal = !!globalConfig[field.key];

        if (userValue === undefined || userValue === "") {
          if (hasGlobal) {
            delete finalConfig[field.key];
          } else if (field.defaultValue !== undefined) {
            finalConfig[field.key] = field.defaultValue;
          }
        }
      });
    }

    const result = await addServiceMonitor(
      selectedExtId,
      newMonitorName,
      finalConfig
    );

    setIsSubmitting(false);

    if (result.success) {
      if (result.metadata) {
        setCreationMetadata({
          ...result.metadata,
          monitorName: newMonitorName,
          extensionId: selectedExtId
        });
      } else {
        setIsAddModalOpen(false);
      }
      
      setNewMonitorName("");
      setNewMonitorConfig({});
      setSelectedExtId("");
      setError("");
      
      // Reload monitors
      const monitorsList = await getServiceMonitors();
      setMonitors(monitorsList);
    } else {
      setError(result.error || "Failed to add monitor");
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteServiceMonitor(id);
    if (result.success) {
      setDeleteTargetId(null);
      const monitorsList = await getServiceMonitors();
      setMonitors(monitorsList);
      if (selectedMonitorId === id) {
        setSelectedMonitorId(monitorsList[0]?.id || null);
      }
    }
  };

  const selectedMonitor = useMemo(
    () => monitors.find(m => m.id === selectedMonitorId),
    [monitors, selectedMonitorId]
  );

  const availableExtensions = useMemo(
    () => allExtensions.filter(e => installedExtensions.includes(e.id)),
    [allExtensions, installedExtensions]
  );

  const selectedExtensionDef = useMemo(
    () => allExtensions.find(e => e.id === selectedExtId),
    [allExtensions, selectedExtId]
  );

  const ExtensionCard = useMemo(
    () => selectedMonitor ? getExtensionCard(selectedMonitor.extensionId) : null,
    [selectedMonitor]
  );

  const SetupComponent = useMemo(
    () => creationMetadata ? getExtensionSetupComponent(creationMetadata.extensionId) : null,
    [creationMetadata]
  );

  const selectedExtensionMetadata = useMemo(() => {
    if (!selectedMonitor) return null;
    return allExtensions.find(e => e.id === selectedMonitor.extensionId);
  }, [selectedMonitor, allExtensions]);

  // Calculate metrics from monitor data
  const metrics = useMemo(() => {
    if (!monitorData || monitorData.length === 0) {
      return {};
    }

    return {};
  }, [monitorData]);

  return (
    <div className="flex h-screen bg-white">
      <Sidebar
        monitors={monitors}
        orgName={orgName}
        selectedMonitorId={selectedMonitorId || undefined}
        onLogout={logout}
        onDeleteMonitor={(id) => setDeleteTargetId(id)}
      />

      {/* Main Content */}
      <div className="flex-1 ml-64 flex flex-col overflow-hidden bg-white">
        {/* Header */}
        <header className="border-b-2 border-black bg-white sticky top-0 z-10">
          <div className="px-10 py-6 flex items-center justify-between">
            {/* Breadcrumb */}
            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-black">
              <Link href="/" className="hover:line-through transition-all">Dashboard</Link>
              <div className="w-2 h-2 bg-black rotate-45" />
              <Link href={`/?monitor=${selectedMonitorId}`} className="font-bold truncate max-w-[200px]">
                {selectedMonitor?.name || "Monitor"}
              </Link>
              <div className="w-1.5 h-1.5 bg-black/20" />
              <span className="opacity-40 font-bold">Analytics</span>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-3 px-8 py-4 bg-black text-white font-black uppercase tracking-widest text-xs hover:bg-white hover:text-black border-2 border-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            >
              <Plus className="w-5 h-5 stroke-[3]" />
              Add Monitor
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-white">
          <div className="p-10 max-w-7xl mx-auto">
            {/* Title */}
            <div className="mb-12 border-l-4 border-black pl-8 py-2">
              <h1 className="text-6xl font-bold text-black uppercase tracking-tighter mb-2 leading-none">
                {selectedMonitor?.name || "Overseer Dashboard"}
              </h1>
              {selectedMonitor && (
                <div className="flex items-center gap-4">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-black/40">
                    Extension: <span className="text-black/80">{selectedMonitor.extensionId}</span>
                  </p>
                  <div className="w-1.5 h-1.5 bg-black/20" />
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-black/40">
                    ID: <span className="text-black/80">{selectedMonitor.id}</span>
                  </p>
                </div>
              )}
            </div>

            {monitors.length === 0 ? (
              <div className="bg-white border-2 border-black p-20 text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <p className="text-2xl font-bold uppercase tracking-tighter mb-10 text-black">No monitors configured yet.</p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-4 px-10 py-5 border-2 border-black bg-black text-white font-bold uppercase tracking-widest text-lg hover:bg-white hover:text-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                >
                  <Plus className="w-6 h-6" />
                  Add Your First Monitor
                </button>
              </div>
            ) : (
              <>
                {/* Status Cards & Charts */}
                {!selectedExtensionMetadata?.displayOptions?.hideStatusCards && (
                  <>
                    <StatusCards
                      lastChecked="Just now"
                    />
                  </>
                )}

                {/* Resources List */}
                {selectedMonitor && (
                   <div className="mt-20">
                     <div className="flex items-center justify-between mb-10 border-b-2 border-black pb-4">
                        <h2 className="text-4xl font-bold text-black uppercase tracking-tighter flex items-center gap-4">
                           Resources
                           {monitorData && (
                             <span className="bg-black text-white text-xs px-3 py-1 font-bold">
                               {monitorData.length}
                             </span>
                           )}
                        </h2>
                     </div>

                     {!monitorData ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                           {[1, 2, 3].map(i => (
                             <div key={i} className="h-48 bg-white border-2 border-black animate-pulse shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]" />
                           ))}
                        </div>
                     ) : monitorData.length === 0 ? (
                        <div className="bg-white border-2 border-black p-16 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                           <p className="text-black font-bold uppercase tracking-widest opacity-50">No resources discovered for this monitor.</p>
                        </div>
                     ) : (
                        <div className={`grid gap-8 ${
                           monitorData.length === 1 ? 'grid-cols-1' : 
                           monitorData.length === 2 ? 'grid-cols-1 lg:grid-cols-2' : 
                           'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                        }`}>
                           {monitorData.map(service => (
                             <div key={service.id} className="bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex flex-col hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all">
                                <div className="px-5 py-4 border-b-2 border-black flex items-center justify-between bg-white">
                                   <div className="flex items-center gap-3">
                                      <div className={`w-3 h-3 border-2 border-black ${
                                         service.status === 'running' ? 'bg-green-500' :
                                         service.status === 'degraded' ? 'bg-yellow-500' :
                                         'bg-red-500'
                                      }`} />
                                      <span className="font-bold text-black uppercase tracking-tighter text-lg truncate max-w-[180px]" title={service.name}>
                                        {service.name}
                                      </span>
                                   </div>
                                   <span className="text-[10px] font-bold uppercase tracking-widest text-black opacity-50">
                                      {service.type}
                                   </span>
                                </div>
                                <div className="p-6 flex-1">
                                   {ExtensionCard && (
                                     <ExtensionCard 
                                       service={service as any} 
                                       history={historyData.map(h => ({
                                          timestamp: h.timestamp,
                                          data: h.data.find((s: any) => s.id === service.id)
                                       })).filter(h => h.data)} 
                                     />
                                   )}
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

      {/* Add Monitor Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white border-2 border-black max-w-xl w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="px-8 py-8 border-b-2 border-black flex items-center justify-between bg-black text-white">
              <div>
                <h3 className="text-3xl font-bold uppercase tracking-tighter">
                  {creationMetadata ? "Monitor Created" : "Add Monitor"}
                </h3>
                <p className="text-[10px] uppercase font-bold tracking-widest opacity-60 mt-2">
                  {creationMetadata ? "Action required to complete setup" : "Deploy new monitoring endpoint"}
                </p>
              </div>
              <button
                onClick={() => { setIsAddModalOpen(false); setCreationMetadata(null); }}
                className="p-2 border-2 border-white hover:bg-white hover:text-black transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {creationMetadata ? (
              <div className="p-8 space-y-8">
                {SetupComponent && (
                  <div className="space-y-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-black/60">
                      Some extensions may require additional setup.
                    </p>
                    <SetupComponent metadata={creationMetadata} />
                  </div>
                )}

                <div className="bg-amber-50 border-2 border-black p-4 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                  Make sure you have <span className="underline">root</span> or a user with correct permissions. The connection will be tested on the next refresh.
                </div>

                <button
                  onClick={() => { setIsAddModalOpen(false); setCreationMetadata(null); }}
                  className="w-full py-4 bg-black text-white border-2 border-black font-bold uppercase tracking-widest text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-white hover:text-black transition-all active:translate-x-1 active:translate-y-1 active:shadow-none"
                >
                  GOT IT, CLOSE
                </button>
              </div>
            ) : (
              <form onSubmit={handleAddMonitor} className="p-8 space-y-8">
                {/* Monitor Name */}
                <div>
                  <label className="block text-xs font-bold mb-3 uppercase tracking-widest text-black">Monitor Name</label>
                  <input
                    type="text"
                    value={newMonitorName}
                    onChange={e => setNewMonitorName(e.target.value)}
                    className="w-full px-5 py-4 bg-white border-2 border-black font-bold uppercase tracking-widest text-sm focus:outline-none focus:bg-black focus:text-white transition-colors"
                    placeholder="E.G. PRODUCTION API"
                    required
                  />
                </div>

                {/* Extension Type */}
                <div>
                  <label className="block text-xs font-bold mb-3 uppercase tracking-widest text-black">Extension</label>
                  <select
                    value={selectedExtId}
                    onChange={e => setSelectedExtId(e.target.value)}
                    className="w-full px-5 py-4 border-2 border-black font-bold uppercase tracking-widest text-sm focus:outline-none bg-white font-bold"
                    required
                  >
                    <option value="">SELECT AN EXTENSION...</option>
                    {allExtensions.map(ext => (
                      <option key={ext.id} value={ext.id}>
                        {ext.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Configuration Fields */}
                {selectedExtensionDef && (
                  <div className="space-y-6 pt-8 border-t-2 border-black">
                    <h4 className="text-sm font-bold uppercase tracking-widest bg-black text-white px-3 py-1 inline-block">Configuration</h4>
                    {selectedExtensionDef.configSchema
                      .filter(f => f.scope !== "global")
                      .map(field => (
                        <div key={field.key}>
                          {field.type === "checkbox" ? (
                            <label className="flex items-center gap-4 cursor-pointer group">
                              <div className="relative">
                                <input
                                  type="checkbox"
                                  checked={newMonitorConfig[field.key] || false}
                                  onChange={e =>
                                    setNewMonitorConfig(prev => ({
                                      ...prev,
                                      [field.key]: e.target.checked,
                                    }))
                                  }
                                  className="sr-only"
                                />
                                <div className={`w-6 h-6 border-2 border-black transition-all ${newMonitorConfig[field.key] ? 'bg-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white'}`}>
                                  {newMonitorConfig[field.key] && (
                                    <div className="flex items-center justify-center h-full">
                                      <div className="w-2.5 h-2.5 bg-white" />
                                    </div>
                                  )}
                                </div>
                              </div>
                              <span className="text-xs font-bold uppercase tracking-widest">{field.label}</span>
                            </label>
                          ) : (
                            <>
                              <label className="block text-xs font-bold mb-2 uppercase tracking-widest text-black">
                                {field.label}
                                {field.required && <span className="text-red-500 ml-1 font-bold">*</span>}
                              </label>
                              <input
                                type={field.type === "password" ? "password" : "text"}
                                value={newMonitorConfig[field.key] || ""}
                                onChange={e =>
                                  setNewMonitorConfig(prev => ({
                                    ...prev,
                                    [field.key]: e.target.value,
                                  }))
                                }
                                className="w-full px-4 py-3 border-2 border-black bg-white font-bold uppercase tracking-widest text-xs focus:bg-black focus:text-white transition-colors"
                                placeholder={String(field.defaultValue || "").toUpperCase()}
                                required={field.required}
                              />
                              {field.description && (
                                <p className="text-[10px] text-black font-bold uppercase tracking-widest mt-2 opacity-50">{field.description}</p>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                  </div>
                )}

                {error && (
                  <div className="p-4 bg-red-500 border-2 border-black text-white text-xs font-bold uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    {error}
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-4 pt-8 border-t-2 border-black">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 px-4 py-4 border-2 border-black font-bold uppercase tracking-widest text-sm hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-4 border-2 border-black bg-black text-white font-bold uppercase tracking-widest text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-white hover:text-black transition-all disabled:opacity-50 disabled:grayscale active:translate-x-1 active:translate-y-1 active:shadow-none"
                  >
                    {isSubmitting ? "CREATING..." : "CREATE MONITOR"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white border-2 border-black max-w-sm w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="px-8 py-8 border-b-2 border-black bg-black text-white">
              <h3 className="text-2xl font-bold uppercase tracking-tighter">Delete Monitor?</h3>
            </div>
            <div className="px-8 py-8">
              <p className="text-black font-bold uppercase tracking-widest text-xs opacity-60">This action cannot be undone. All history will be lost.</p>
            </div>
            <div className="px-8 py-6 border-t-2 border-black flex gap-4">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="flex-1 px-4 py-4 border-2 border-black font-bold uppercase tracking-widest text-xs hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteTargetId)}
                className="flex-1 px-4 py-4 border-2 border-black bg-red-500 text-white font-bold uppercase tracking-widest text-xs hover:bg-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
