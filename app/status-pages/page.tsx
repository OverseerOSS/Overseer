"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  getStatusPages, 
  createStatusPage, 
  updateStatusPage, 
  deleteStatusPage,
  getServiceMonitors,
  getOrganizationName,
  getAvailableExtensionsMetadata,
  logout
} from "../actions";
import { Sidebar } from "../components/Sidebar";
import { ExternalLink, Plus, Save, Trash2 } from "lucide-react";
import { Suspense } from "react";

export default function StatusPagesPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center font-black uppercase tracking-widest">Loading status pages...</div>}>
      <StatusPagesContent />
    </Suspense>
  );
}

function StatusPagesContent() {
  const router = useRouter();
  const [statusPages, setStatusPages] = useState<any[]>([]);
  const [monitors, setMonitors] = useState<any[]>([]);
  const [availableExtensions, setAvailableExtensions] = useState<any[]>([]);
  const [orgName, setOrgName] = useState("Overseer");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
        try {
            const [pages, mons, name, exts] = await Promise.all([
                getStatusPages(),
                getServiceMonitors(),
                getOrganizationName(),
                getAvailableExtensionsMetadata()
            ]);
            setStatusPages(pages);
            setMonitors(mons);
            setAvailableExtensions(exts);
            if (name) setOrgName(name);
        } catch (error) {
            console.error("Failed to load status pages data:", error);
        } finally {
            setIsLoading(false);
        }
    }
    loadData();
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (isLoading) {
    return (
        <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="text-[10px] font-bold uppercase tracking-[0.3em] animate-pulse">Loading Status Pages...</div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black font-mono">
      <Sidebar 
          monitors={monitors} 
          orgName={orgName} 
          onLogout={handleLogout} 
      />

      <main className="pl-64 flex flex-col min-h-screen">
        <header className="h-20 border-b-2 border-black px-10 flex items-center justify-between sticky top-0 bg-white z-40">
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 bg-black"></div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-30">Status Pages</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-white">
          <div className="p-10 max-w-7xl mx-auto">
            <div className="mb-12 border-l-4 border-black pl-8 py-2">
              <h1 className="text-6xl font-bold text-black uppercase tracking-tighter mb-2 leading-none">Status Pages</h1>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-black opacity-40">Public system status monitoring</p>
            </div>

            <div className="bg-white border-2 border-black p-10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <StatusPageSettings 
                    statusPages={statusPages}
                    monitors={monitors}
                    availableExtensions={availableExtensions}
                    onSave={async (data: any) => {
                        setIsSaving(true);
                        if (data.id) {
                            await updateStatusPage(data.id, data);
                        } else {
                            await createStatusPage(data);
                        }
                        const pages = await getStatusPages();
                        setStatusPages(pages);
                        setIsSaving(false);
                    }}
                    onDelete={async (id: string) => {
                        await deleteStatusPage(id);
                        const pages = await getStatusPages();
                        setStatusPages(pages);
                    }}
                    isSaving={isSaving}
                />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatusPageSettings({ statusPages, monitors, availableExtensions, onSave, onDelete, isSaving }: any) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [showMetrics, setShowMetrics] = useState(false);
  const [showCpu, setShowCpu] = useState(true);
  const [showRam, setShowRam] = useState(true);
  const [showNetwork, setShowNetwork] = useState(true);
  const [statusPageConfig, setStatusPageConfig] = useState<any>({});
  const [selectedMonitorIds, setSelectedMonitorIds] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setSlug("");
    setDescription("");
    setShowMetrics(false);
    setShowCpu(true);
    setShowRam(true);
    setShowNetwork(true);
    setStatusPageConfig({});
    setSelectedMonitorIds([]);
    setIsAdding(false);
  };

  const startEdit = (page: any) => {
    setEditingId(page.id);
    setTitle(page.title);
    setSlug(page.slug);
    setDescription(page.description || "");
    setShowMetrics(page.showMetrics || false);
    setShowCpu(page.showCpu ?? true);
    setShowRam(page.showRam ?? true);
    setShowNetwork(page.showNetwork ?? true);
    setStatusPageConfig(page.config || {});
    setSelectedMonitorIds(page.monitors.map((m: any) => m.id));
    setIsAdding(true);
  };

  if (isAdding) {
    return (
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-10 border-b-2 border-black pb-8">
            <div>
                <h2 className="text-3xl font-bold uppercase tracking-tighter">{editingId ? 'Edit Status Page' : 'New Status Page'}</h2>
            </div>
            <button onClick={resetForm} className="text-[10px] font-bold uppercase tracking-widest border-2 border-black px-4 py-2 hover:bg-black hover:text-white transition-all">Cancel</button>
        </div>

        <div className="space-y-8">
            <div className="grid grid-cols-2 gap-8">
                <div>
                    <label className="block text-[10px] font-bold text-black uppercase tracking-widest mb-3">Page Title</label>
                    <input 
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="w-full px-5 py-4 border-2 border-black outline-none focus:bg-black focus:text-white transition-all font-bold uppercase text-xs"
                        placeholder="SYSTEM STATUS"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-black uppercase tracking-widest mb-3">URL Slug</label>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold opacity-30">/s/</span>
                        <input 
                            value={slug}
                            onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                            className="flex-1 px-5 py-4 border-2 border-black outline-none focus:bg-black focus:text-white transition-all font-bold uppercase text-xs"
                            placeholder="my-status"
                        />
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-[10px] font-bold text-black uppercase tracking-widest mb-3">Description (Optional)</label>
                <textarea 
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-5 py-4 border-2 border-black outline-none focus:bg-black focus:text-white transition-all font-bold uppercase text-xs h-32 resize-none"
                    placeholder="PROVIDE AN OVERVIEW OF YOUR SERVICE STATUS..."
                />
            </div>

            <div>
                <label className="block text-[10px] font-bold text-black uppercase tracking-widest mb-3">Select Monitors</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {monitors.map((monitor: any) => (
                        <div 
                            key={monitor.id}
                            onClick={() => {
                                if (selectedMonitorIds.includes(monitor.id)) {
                                    setSelectedMonitorIds(selectedMonitorIds.filter(id => id !== monitor.id));
                                } else {
                                    setSelectedMonitorIds([...selectedMonitorIds, monitor.id]);
                                }
                            }}
                            className={`px-4 py-3 border-2 border-black cursor-pointer transition-all flex items-center gap-3 ${selectedMonitorIds.includes(monitor.id) ? 'bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-black hover:bg-gray-50'}`}
                        >
                            <div className={`w-3 h-3 border-2 ${selectedMonitorIds.includes(monitor.id) ? 'bg-white border-white' : 'bg-black border-black'}`} />
                            <span className="text-[10px] font-bold uppercase truncate">{monitor.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-4 p-6 border-2 border-black bg-gray-50">
                <button 
                  onClick={() => setShowMetrics(!showMetrics)}
                  className={`w-12 h-6 border-2 border-black relative transition-all ${showMetrics ? 'bg-black' : 'bg-white'}`}
                >
                  <div className={`absolute top-0.5 bottom-0.5 w-4 transition-all ${showMetrics ? 'right-0.5 bg-white' : 'left-0.5 bg-black'}`} />
                </button>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest">Show Resource Graphs</div>
                  <div className="text-[8px] font-bold uppercase tracking-widest opacity-40">Display CPU & RAM usage charts on status page.</div>
                </div>
            </div>

            {showMetrics && (
                <div className="grid grid-cols-3 gap-4 p-6 border-2 border-t-0 border-black bg-white">
                    <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setShowCpu(!showCpu)}
                          className={`w-8 h-4 border-2 border-black relative transition-all ${showCpu ? 'bg-black' : 'bg-white'}`}
                        >
                          <div className={`absolute top-0.5 bottom-0.5 w-2 transition-all ${showCpu ? 'right-0.5 bg-white' : 'left-0.5 bg-black'}`} />
                        </button>
                        <span className="text-[10px] font-bold uppercase tracking-widest">Show CPU</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setShowRam(!showRam)}
                          className={`w-8 h-4 border-2 border-black relative transition-all ${showRam ? 'bg-black' : 'bg-white'}`}
                        >
                          <div className={`absolute top-0.5 bottom-0.5 w-2 transition-all ${showRam ? 'right-0.5 bg-white' : 'left-0.5 bg-black'}`} />
                        </button>
                        <span className="text-[10px] font-bold uppercase tracking-widest">Show RAM</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setShowNetwork(!showNetwork)}
                          className={`w-8 h-4 border-2 border-black relative transition-all ${showNetwork ? 'bg-black' : 'bg-white'}`}
                        >
                          <div className={`absolute top-0.5 bottom-0.5 w-2 transition-all ${showNetwork ? 'right-0.5 bg-white' : 'left-0.5 bg-black'}`} />
                        </button>
                        <span className="text-[10px] font-bold uppercase tracking-widest">Show Traffic</span>
                    </div>
                </div>
            )}

            {selectedMonitorIds.length > 0 && (
                <div className="space-y-4">
                    <label className="block text-[10px] font-bold text-black uppercase tracking-widest mb-3">Service Filtering (Optional)</label>
                    <div className="space-y-4">
                        {monitors.filter((m: any) => selectedMonitorIds.includes(m.id)).map((monitor: any) => {
                            const extension = availableExtensions.find((e: any) => e.id === monitor.extensionId);
                            return (
                                <div key={monitor.id} className="p-4 border-2 border-black bg-white">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-bold uppercase tracking-widest">{monitor.name}</span>
                                        {extension && <span className="text-[8px] font-bold bg-black text-white px-2 py-0.5 uppercase">{extension.name}</span>}
                                    </div>
                                    <input 
                                        className="w-full px-4 py-2 border-2 border-black text-[10px] font-bold uppercase outline-none focus:bg-gray-50"
                                        placeholder="INCLUDE SERVICES (COMMA SEPARATED, LEAVE EMPTY FOR ALL)"
                                        value={statusPageConfig.monitors?.[monitor.id]?.includedServices?.join(', ') || ""}
                                        onChange={(e) => {
                                            const services = e.target.value.split(',').map(s => s.trim()).filter(s => s.length > 0);
                                            const newConfig = { ...statusPageConfig };
                                            if (!newConfig.monitors) newConfig.monitors = {};
                                            if (!newConfig.monitors[monitor.id]) newConfig.monitors[monitor.id] = {};
                                            newConfig.monitors[monitor.id].includedServices = services;
                                            setStatusPageConfig(newConfig);
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="pt-8 border-t-2 border-black">
                <button 
                    onClick={async () => {
                        await onSave({ 
                            id: editingId, 
                            title, 
                            slug, 
                            description, 
                            showMetrics,
                            showCpu,
                            showRam,
                            showNetwork,
                            config: statusPageConfig,
                            monitorIds: selectedMonitorIds 
                        });
                        resetForm();
                    }}
                    disabled={isSaving || !title || !slug || selectedMonitorIds.length === 0}
                    className="flex items-center gap-4 px-10 py-5 border-2 border-black bg-black text-white font-bold uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-50"
                >
                    <Save className="w-5 h-5" /> {isSaving ? 'SAVING...' : editingId ? 'UPDATE STATUS PAGE' : 'CREATE STATUS PAGE'}
                </button>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div>
        <div className="flex items-center justify-between mb-10 border-b-2 border-black pb-8">
            <div>
                <h2 className="text-3xl font-bold uppercase tracking-tighter">Status Pages</h2>
                <p className="text-[10px] text-black/40 uppercase font-bold tracking-widest mt-2">{statusPages.length} pages configured</p>
            </div>
            <button 
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-3 px-6 py-3 border-2 border-black bg-black text-white font-bold uppercase tracking-widest text-[10px] hover:bg-white hover:text-black transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
                <Plus className="w-4 h-4" /> New Status Page
            </button>
        </div>

        <div className="space-y-4">
            {statusPages.length === 0 ? (
                <div className="p-20 border-2 border-black border-dashed bg-gray-50 text-center">
                    <p className="text-black font-bold uppercase tracking-widest text-[10px]">No status pages created yet.</p>
                </div>
            ) : (
                statusPages.map((page: any) => (
                    <div key={page.id} className="flex items-center justify-between p-6 border-2 border-black hover:bg-gray-50 transition-all">
                        <div>
                            <h3 className="text-xl font-bold uppercase tracking-tighter">{page.title}</h3>
                            <div className="flex items-center gap-4 mt-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">/{page.slug}</span>
                                <div className="w-1 h-1 bg-black/20" />
                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">{page.monitors.length} monitors</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <a 
                                href={`/s/${page.slug}`} 
                                target="_blank"
                                className="p-3 border-2 border-black hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                title="View Public Page"
                            >
                                <ExternalLink className="w-4 h-4" />
                            </a>
                            <button 
                                onClick={() => startEdit(page)}
                                className="px-5 py-3 border-2 border-black font-bold uppercase tracking-widest text-[10px] hover:bg-black hover:text-white transition-all"
                            >
                                Edit
                            </button>
                            <button 
                                onClick={() => { if(confirm('Delete status page?')) onDelete(page.id) }}
                                className="p-3 border-2 border-black text-red-600 hover:bg-red-600 hover:text-white transition-all"
                                title="Delete"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    </div>
  );
}
