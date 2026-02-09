"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  addServiceMonitor,
  deleteServiceMonitor,
  getServiceMonitors,
  getInstalledExtensions,
  getAvailableExtensionsMetadata,
  logout,
  getGlobalConfig,
  fetchMonitorStatus,
  getMonitorHistory,
  getStatusPagesList,
  getOrganizationName,
  checkDatabaseReady
} from "./actions";
import { ExtensionMetadata } from "./extensions/types";
import { Sidebar } from "./components/Sidebar";
import { StatusCards } from "./components/StatusCards";
import { MetricsGrid } from "./components/MetricsGrid";
import { UptimeChart } from "./components/UptimeChart";
import { LatencyChart } from "./components/LatencyChart";
import { ChevronRight, Plus, X } from "lucide-react";

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
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [statusPages, setStatusPages] = useState<any[]>([]);
  const [orgName, setOrgName] = useState("Overseer");
  const [installedExtensions, setInstalledExtensions] = useState<string[]>([]);
  const [allExtensions, setAllExtensions] = useState<ExtensionMetadata[]>([]);
  const [selectedMonitorId, setSelectedMonitorId] = useState<string | null>(null);
  const [monitorData, setMonitorData] = useState<ServiceInfo[] | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedExtId, setSelectedExtId] = useState("");
  const [newMonitorName, setNewMonitorName] = useState("");
  const [newMonitorConfig, setNewMonitorConfig] = useState<Record<string, any>>({});
  const [globalConfig, setGlobalConfig] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

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
        const monitorsList = await getServiceMonitors();
        if (monitorsList) {
          setMonitors(monitorsList);
          if (monitorsList.length > 0 && !selectedMonitorId) {
            setSelectedMonitorId(monitorsList[0].id);
          }
        }
    } catch (err) { console.error(err); }

    try {
      const [installed, available, pages, name] = await Promise.all([
        getInstalledExtensions().catch(() => []),
        getAvailableExtensionsMetadata().catch(() => []),
        getStatusPagesList().catch(() => []), 
        getOrganizationName().catch(() => "Overseer")
      ]);
      
      setInstalledExtensions(installed);
      setAllExtensions(available);
      setStatusPages(pages);
      setOrgName(name);
    } catch (e) { console.error(e); }
  };

  /*
  useEffect(() => {
    // Moved to manual call
  }, [selectedMonitorId]);
  */



  // Fetch monitor data when selection changes
  useEffect(() => {
    const fetchData = async () => {
      if (selectedMonitorId) {
        const result = await fetchMonitorStatus(selectedMonitorId);
        if (result.success && result.data) {
          setMonitorData(result.data);
        }
      }
    };

    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [selectedMonitorId]);

  // Fetch monitor history when selection changes
  useEffect(() => {
    const fetchHistory = async () => {
      if (selectedMonitorId) {
        // Fetch up to 50 data points for charts
        const history = await getMonitorHistory(selectedMonitorId, 50);
        setHistoryData(history);
      } else {
        setHistoryData([]);
      }
    };
    
    fetchHistory();
  }, [selectedMonitorId]);

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
      setIsAddModalOpen(false);
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

  // Calculate metrics from monitor data
  const metrics = useMemo(() => {
    if (!monitorData || monitorData.length === 0) {
      return {
        uptime: 100,
        degraded: 0,
        failing: 0,
        requests: 0,
        p50: "0 ms",
        p75: "0 ms",
        p90: "0 ms",
        p95: "0 ms",
        p99: "0 ms",
      };
    }

    const running = monitorData.filter(d => d.status === "running").length;
    const degraded = monitorData.filter(d => d.status === "degraded").length;
    const failing = monitorData.filter(d => d.status === "failed").length;
    const total = monitorData.length;

    return {
      uptime: total > 0 ? (running / total) * 100 : 0,
      degraded,
      failing,
      requests: 0,
      p50: "--",
      p75: "--",
      p90: "--",
      p95: "--",
      p99: "--",
    };
  }, [monitorData]);

  // Process history data for charts
  const uptimeData = useMemo(() => {
    if (!historyData || historyData.length === 0) return [];

    return historyData.map((entry: any) => {
      const services = entry.data || [];
      const total = services.length;
      
      let success = 0;
      if (total > 0) {
        const running = services.filter((s: any) => s.status === "running").length;
        success = Math.round((running / total) * 100);
      }

      return {
        time: new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        success,
        error: 100 - success
      };
    });
  }, [historyData]);

  const latencyData = useMemo(() => {
    // Return empty array or placeholder if we don't have latency data yet
    if (!historyData || historyData.length === 0) return [];
    
    // For now, map to 0s to keep chart rendering without error
    // In future: Extract latency from ServiceInfo details if available
    return historyData.map((entry: any) => ({
      time: new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      p50: 0,
      p95: 0,
      p99: 0
    }));
  }, [historyData]);

  return (
    <div className="flex h-screen bg-white">
      {/*tatusPages={statusPages}
        s Sidebar */}
      <Sidebar
        monitors={monitors}
        statusPages={statusPages}
        orgName={orgName}
        selectedMonitorId={selectedMonitorId || undefined}
        onLogout={logout}
      />

      {/* Main Content */}
      <div className="flex-1 ml-64 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-gray-200 bg-white">
          <div className="px-8 py-4 flex items-center justify-between">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <a href="#" className="hover:text-gray-900">Monitors</a>
              <ChevronRight className="w-4 h-4" />
              <a href="#" className="hover:text-gray-900">{selectedMonitor?.name || "Monitor"}</a>
              <ChevronRight className="w-4 h-4" />
              <span className="text-gray-900 font-medium">Overview</span>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Monitor
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-50">
          <div className="p-8">
            {/* Title */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-1">
                {selectedMonitor?.name || "Select a Monitor"}
              </h1>
              {selectedMonitor && (
                <p className="text-gray-600">Extension: {selectedMonitor.extensionId}</p>
              )}
            </div>

            {monitors.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <p className="text-gray-600 mb-6">No monitors configured yet.</p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Your First Monitor
                </button>
              </div>
            ) : (
              <>
                {/* Status Cards */}
                <StatusCards
                  uptime={metrics.uptime}
                  degraded={metrics.degraded}
                  failing={metrics.failing}
                  requests={metrics.requests}
                  lastChecked="Just now"
                />

                {/* Metrics Grid */}
                <MetricsGrid
                  p50={metrics.p50}
                  p75={metrics.p75}
                  p90={metrics.p90}
                  p95={metrics.p95}
                  p99={metrics.p99}
                  changes={{
                    p50: 0,
                    p75: 0,
                    p90: 0,
                    p95: 0,
                    p99: 0,
                  }}
                />

                {/* Uptime Chart */}
                <UptimeChart data={uptimeData} />

                {/* Latency Chart */}
                <LatencyChart data={latencyData} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add Monitor Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-gray-200 max-w-lg w-full shadow-2xl">
            <div className="px-6 py-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Add Monitor</h3>
                <p className="text-sm text-gray-600 mt-1">Create a new service monitor</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMonitor} className="p-6 space-y-6">
              {/* Monitor Name */}
              <div>
                <label className="block text-sm font-semibold mb-2">Monitor Name</label>
                <input
                  type="text"
                  value={newMonitorName}
                  onChange={e => setNewMonitorName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Production API"
                  required
                />
              </div>

              {/* Extension Type */}
              <div>
                <label className="block text-sm font-semibold mb-2">Extension</label>
                <select
                  value={selectedExtId}
                  onChange={e => setSelectedExtId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select an extension...</option>
                  {availableExtensions.map(ext => (
                    <option key={ext.id} value={ext.id}>
                      {ext.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Configuration Fields */}
              {selectedExtensionDef && (
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold uppercase tracking-wide">Configuration</h4>
                  {selectedExtensionDef.configSchema
                    .filter(f => f.scope !== "global")
                    .map(field => (
                      <div key={field.key}>
                        {field.type === "checkbox" ? (
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={newMonitorConfig[field.key] || false}
                              onChange={e =>
                                setNewMonitorConfig(prev => ({
                                  ...prev,
                                  [field.key]: e.target.checked,
                                }))
                              }
                              className="w-4 h-4 rounded"
                            />
                            <span className="text-sm font-medium">{field.label}</span>
                          </label>
                        ) : (
                          <>
                            <label className="block text-sm font-medium mb-1">
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
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
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder={String(field.defaultValue || "")}
                              required={field.required}
                            />
                            {field.description && (
                              <p className="text-xs text-gray-600 mt-1">{field.description}</p>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Create Monitor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-gray-200 max-w-sm w-full shadow-2xl">
            <div className="px-6 py-6 border-b border-gray-200">
              <h3 className="text-lg font-bold">Delete Monitor?</h3>
            </div>
            <div className="px-6 py-6">
              <p className="text-gray-600">This action cannot be undone.</p>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteTargetId)}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700"
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
