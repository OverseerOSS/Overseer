"use client";

import { useEffect, useState } from "react";
import { 
  getStatusPages, 
  getServiceMonitors, 
  createStatusPage, 
  updateStatusPage, 
  deleteStatusPage,
  logout,
  getTheme
} from "../actions";
import { Sidebar } from "../components/Sidebar";
import { ThemeSync } from "../components/ThemeSync";
import { 
  Settings, 
  Plus, 
  ChevronRight, 
  Eye, 
  Save, 
  Trash2, 
  Layout, 
  BarChart2, 
  Monitor,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  ChevronDown
} from "lucide-react";

export default function StatusPagesManager() {
  const [statusPages, setStatusPages] = useState<any[]>([]);
  const [monitors, setMonitors] = useState<any[]>([]);
  const [selectedPage, setSelectedPage] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [theme, setTheme] = useState<string>("light");

  useEffect(() => {
    async function loadData() {
      try {
        const [pages, mons, currentTheme] = await Promise.all([
          getStatusPages(),
          getServiceMonitors(),
          getTheme()
        ]);
        setStatusPages(pages);
        setMonitors(mons);
        setTheme(currentTheme);
      } catch (err) {
        console.error("Failed to load status pages:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleCreateNew = () => {
    const newPage = {
      name: "New Status Page",
      slug: "new-status-" + Math.floor(Math.random() * 1000),
      description: "Service operational status",
      monitorIds: [],
      showMetrics: true,
      showHistory: true,
      showBanner: true,
      showRecentHistory: true,
      customCss: "",
      theme: "light",
      footerText: "Overseer Monitoring"
    };
    setSelectedPage(newPage);
  };

  const handleSave = async (data: any) => {
    setIsSaving(true);
    try {
      if (data.id) {
        await updateStatusPage(data.id, data);
      } else {
        await createStatusPage(data);
      }
      const updatedPages = await getStatusPages();
      setStatusPages(updatedPages);
      setSelectedPage(null);
    } catch (err) {
      console.error("Failed to save status page:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this status page?")) return;
    try {
      await deleteStatusPage(id);
      setStatusPages(statusPages.filter(p => p.id !== id));
      setSelectedPage(null);
    } catch (err) {
      console.error("Failed to delete status page:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex bg-white dark:bg-[#0a0a0a] min-h-screen">
        <Sidebar monitors={[]} onLogout={logout} />
        <div className="flex-1 p-8 text-black dark:text-white">Loading Status Pages...</div>
      </div>
    );
  }

  return (
    <div className="flex bg-white dark:bg-[#0a0a0a] min-h-screen font-sans selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
      <ThemeSync theme={theme} />
      <Sidebar monitors={monitors} onLogout={logout} />
      
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Header */}
          <div className="flex justify-between items-end border-b-4 border-black dark:border-white pb-8">
            <div className="space-y-2">
              <h1 className="text-7xl font-black uppercase tracking-tighter leading-none italic text-black dark:text-white">Visibility.</h1>
              <p className="text-sm font-bold uppercase tracking-widest text-black/40 dark:text-white/40 italic">Public status pages & customer transparency.</p>
            </div>
            <button 
              onClick={handleCreateNew}
              className="flex items-center gap-3 bg-black dark:bg-white text-white dark:text-black px-8 py-4 font-black uppercase tracking-widest text-xs hover:bg-white dark:hover:bg-black hover:text-black dark:hover:text-white border-4 border-black dark:border-white transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              <Plus className="w-5 h-5" /> Deploy New Page
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h2 className="text-2xl font-black uppercase tracking-tight text-black dark:text-white">Active Deployments</h2>
              {statusPages.length === 0 ? (
                <div className="border-4 border-black dark:border-white border-dashed p-12 text-center space-y-4">
                  <Layout className="w-12 h-12 mx-auto text-black/20 dark:text-white/20" />
                  <p className="font-bold uppercase tracking-widest text-xs text-black/40 dark:text-white/40">No status pages deployed.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {statusPages.map((page) => (
                    <div 
                      key={page.id}
                      onClick={() => setSelectedPage(page)}
                      className={`group cursor-pointer border-4 border-black dark:border-white p-6 transition-all hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black ${selectedPage?.id === page.id ? 'bg-black dark:bg-white text-white dark:text-black translate-x-1 translate-y-1 shadow-none' : 'bg-white dark:bg-black text-black dark:text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]'}`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1">
                          <h3 className="text-xl font-black uppercase">{page.name}</h3>
                          <p className="text-[10px] font-bold tracking-widest opacity-60">/{page.slug}</p>
                        </div>
                        <div className="flex gap-2">
                          <a 
                            href={`/s/${page.slug}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2 border-2 border-current hover:bg-white dark:hover:bg-black hover:text-black dark:hover:text-white transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                          <Monitor className="w-4 h-4" /> {page.monitorIds?.length || 0} Nodes
                        </div>
                        {page.showMetrics && (
                          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                            <BarChart2 className="w-4 h-4" /> Metrics Enabled
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              {selectedPage ? (
                <StatusPageSettings 
                  page={selectedPage} 
                  monitors={monitors}
                  onSave={handleSave}
                  onDelete={handleDelete}
                  isSaving={isSaving}
                />
              ) : (
                <div className="sticky top-8 border-4 border-black dark:border-white bg-white dark:bg-black p-12 flex flex-col items-center justify-center text-center space-y-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.05)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.05)]">
                  <div className="w-20 h-20 border-4 border-black dark:border-white rotate-45 flex items-center justify-center">
                    <Settings className="w-10 h-10 -rotate-45 text-black/20 dark:text-white/20" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black uppercase tracking-tight text-black dark:text-white">Configuration Hub</h3>
                    <p className="max-w-[240px] text-[10px] font-bold uppercase tracking-widest leading-relaxed text-black/40 dark:text-white/40 italic">Select a page from the list to modify its visibility parameters and monitor density.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatusPageSettings({ page, monitors, onSave, onDelete, isSaving }: any) {
  const [formData, setFormData] = useState({ ...page });

  useEffect(() => {
    setFormData({ ...page });
  }, [page]);

  const toggleMonitor = (id: string) => {
    const current = formData.monitorIds || [];
    if (current.includes(id)) {
      setFormData({ ...formData, monitorIds: current.filter((m: string) => m !== id) });
    } else {
      setFormData({ ...formData, monitorIds: [...current, id] });
    }
  };

  return (
    <div className="sticky top-8 border-4 border-black dark:border-white bg-white dark:bg-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] overflow-hidden text-black dark:text-white">
      <div className="bg-black dark:bg-white text-white dark:text-black p-6 flex justify-between items-center">
        <h3 className="text-sm font-black uppercase tracking-[0.2em]">{formData.id ? "Edit Deployment" : "New Deployment"}</h3>
        {formData.id && (
          <button onClick={() => onDelete(formData.id)} className="text-red-500 hover:text-red-400 transition-colors">
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>
      
      <div className="p-8 space-y-8 max-h-[calc(100vh-200px)] overflow-y-auto">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Page Label</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border-2 border-black dark:border-white bg-white dark:bg-black font-bold uppercase tracking-widest text-xs focus:bg-black dark:focus:bg-white focus:text-white dark:focus:text-black outline-none transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">URL Slug</label>
              <input 
                type="text" 
                value={formData.slug}
                onChange={e => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-4 py-3 border-2 border-black dark:border-white bg-white dark:bg-black font-bold uppercase tracking-widest text-xs focus:bg-black dark:focus:bg-white focus:text-white dark:focus:text-black outline-none transition-colors"
                placeholder="public-status"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Description Header</label>
            <textarea 
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full h-24 px-4 py-3 border-2 border-black dark:border-white bg-white dark:bg-black font-bold uppercase tracking-widest text-xs focus:bg-black dark:focus:bg-white focus:text-white dark:focus:text-black outline-none transition-colors"
            />
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Nodes to Display</label>
            <div className="grid grid-cols-1 gap-2 max-h-[250px] overflow-y-auto pr-2">
              {monitors.map((monitor: any) => {
                const isSelected = (formData.monitorIds || []).includes(monitor.id);
                return (
                  <button
                    key={monitor.id}
                    onClick={() => toggleMonitor(monitor.id)}
                    className={`flex items-center justify-between p-4 border-2 transition-all group ${isSelected ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white' : 'bg-white dark:bg-black text-black dark:text-white border-black/10 dark:border-white/10 hover:border-black dark:hover:border-white'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white dark:bg-black' : 'bg-black dark:bg-white'}`} />
                      <div className="text-left">
                        <div className="text-[10px] font-black uppercase">{monitor.name}</div>
                        <div className="text-[8px] font-bold tracking-widest opacity-60 uppercase">{monitor.type}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 py-4 border-t-2 border-black/5 dark:border-white/5">
            <button 
              onClick={() => setFormData({ ...formData, showBanner: !formData.showBanner })}
              className="flex items-center gap-2 group"
            >
              <div className={`w-6 h-6 border-2 border-black dark:border-white flex items-center justify-center transition-colors ${formData.showBanner ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-white dark:bg-black'}`}>
                {formData.showBanner && <div className="w-2.5 h-2.5 bg-white dark:bg-black" />}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-left">Global Banner</span>
            </button>

            <button 
              onClick={() => setFormData({ ...formData, showHistory: !formData.showHistory })}
              className="flex items-center gap-2 group"
            >
              <div className={`w-6 h-6 border-2 border-black dark:border-white flex items-center justify-center transition-colors ${formData.showHistory ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-white dark:bg-black'}`}>
                {formData.showHistory && <div className="w-2.5 h-2.5 bg-white dark:bg-black" />}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-left">Uptime Bars</span>
            </button>

            <button 
              onClick={() => setFormData({ ...formData, showMetrics: !formData.showMetrics })}
              className="flex items-center gap-2 group"
            >
              <div className={`w-6 h-6 border-2 border-black dark:border-white flex items-center justify-center transition-colors ${formData.showMetrics ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-white dark:bg-black'}`}>
                {formData.showMetrics && <div className="w-2.5 h-2.5 bg-white dark:bg-black" />}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-left">Detailed Metrics</span>
            </button>

            <button 
              onClick={() => setFormData({ ...formData, showRecentHistory: !formData.showRecentHistory })}
              className="flex items-center gap-2 group"
            >
              <div className={`w-6 h-6 border-2 border-black dark:border-white flex items-center justify-center transition-colors ${formData.showRecentHistory ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-white dark:bg-black'}`}>
                {formData.showRecentHistory && <div className="w-2.5 h-2.5 bg-white dark:bg-black" />}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-left">Recent History</span>
            </button>
          </div>
        </div>

        <button 
          onClick={() => onSave(formData)}
          disabled={isSaving}
          className="w-full py-4 bg-black dark:bg-white text-white dark:text-black font-black uppercase tracking-widest text-xs border-2 border-black dark:border-white hover:bg-white dark:hover:bg-black hover:text-black dark:hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] active:translate-x-1 active:translate-y-1 active:shadow-none flex items-center justify-center gap-3"
        >
          {isSaving ? "Synchronizing..." : <><Save className="w-4 h-4" /> Update Deployment</>}
        </button>
      </div>
    </div>
  );
}
