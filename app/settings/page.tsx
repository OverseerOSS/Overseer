"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  getInstalledExtensions,
  toggleExtensionInstall,
  saveGlobalConfig,
  getGlobalConfig,
  getAvailableExtensionsMetadata,
  getOrganizationName,
  updateOrganizationName
} from "../actions";
import { ExtensionMetadata } from "../extensions/types";
import { Sidebar } from "../components/Sidebar"; // Reuse sidebar layout
import { getServiceMonitors, logout } from "../actions";
import { ChevronRight, Save, Settings } from "lucide-react";

export default function SettingsPage() {
    return (
        <Suspense fallback={<div>Loading Settings...</div>}>
            <SettingsContent />
        </Suspense>
    );
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const extId = searchParams.get("id");
  const [activeTab, setActiveTab] = useState(tab || "general");
  const [orgName, setOrgName] = useState("");
  const [monitors, setMonitors] = useState<any[]>([]);
  
  // Extension Settings State
  const [activeExtId, setActiveExtId] = useState<string | null>(extId || null);
  const [configForm, setConfigForm] = useState<Record<string, any>>({});
  const [installedIds, setInstalledIds] = useState<string[]>([]);
  const [availableExtensions, setAvailableExtensions] = useState<ExtensionMetadata[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (tab) setActiveTab(tab);
    if (extId) setActiveExtId(extId);
  }, [tab, extId]);

  useEffect(() => {
    // Load initial data
    Promise.all([
        getOrganizationName(), 
        getServiceMonitors(), 
        getInstalledExtensions(),
        getAvailableExtensionsMetadata()
    ]).then(([name, mons, inst, avail]) => {
        setOrgName(name);
        setMonitors(mons);
        setInstalledIds(inst);
        setAvailableExtensions(avail);
    });
  }, []);

  // When active extension changes, load its config
  useEffect(() => {
    if (activeExtId) {
        getGlobalConfig(activeExtId).then(cfg => setConfigForm(cfg || {}));
    }
  }, [activeExtId]);

  return (
    <div className="flex h-screen bg-white">
      <Sidebar 
        monitors={monitors} 
        orgName={orgName} 
        // We aren't passing status pages here for simplicity, or fetch them if needed
        selectedMonitorId={undefined} 
        onLogout={logout} 
      />

      <div className="flex-1 ml-64 flex flex-col overflow-hidden bg-white">
        {/* Header */}
        <header className="border-b-2 border-black bg-white">
          <div className="px-10 py-6 flex items-center justify-between">
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-black/40">
              <span className="text-black flex items-center gap-3">
                <Settings className="w-5 h-5" /> Settings
              </span>
              <div className="w-1.5 h-1.5 bg-black/20" />
              <span>{activeTab === 'general' ? 'General' : activeExtId}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-white">
          <div className="p-10 max-w-7xl mx-auto">
            <div className="mb-12 border-l-4 border-black pl-8 py-2">
              <h1 className="text-6xl font-bold text-black uppercase tracking-tighter mb-2 leading-none">Settings</h1>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-black opacity-40">Configure system & extensions</p>
            </div>

            <div className="flex gap-10">
                {/* Settings Navigation */}
                <div className="w-72 flex-shrink-0 space-y-2">
                    <button 
                        onClick={() => setActiveTab("general")}
                        className={`w-full text-left px-5 py-4 text-xs font-bold uppercase tracking-widest border-2 border-black transition-all ${activeTab === "general" ? "bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : "bg-white text-black hover:bg-gray-50"}`}
                    >
                        General
                    </button>
                    
                    <div className="pt-8 pb-3 px-5 text-[10px] font-bold text-black opacity-40 uppercase tracking-[0.2em]">
                        Extensions
                    </div>
                    {availableExtensions.map(ext => (
                        <button 
                            key={ext.id}
                            onClick={() => { setActiveTab("extension"); setActiveExtId(ext.id); }}
                            className={`w-full text-left px-5 py-4 text-xs font-bold uppercase tracking-widest border-2 border-black transition-all ${activeTab === "extension" && activeExtId === ext.id ? "bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : "bg-white text-black hover:bg-gray-50"}`}
                        >
                            <div className="flex items-center justify-between">
                                <span>{ext.name}</span>
                                {installedIds.includes(ext.id) && (
                                    <span className="w-2 h-2 bg-green-500 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"></span>
                                )}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Settings Content */}
                <div className="flex-1 bg-white border-2 border-black p-10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    {activeTab === "general" && (
                        <div className="max-w-2xl">
                            <h2 className="text-3xl font-bold mb-8 uppercase tracking-tighter">General</h2>
                            <div className="space-y-8">
                                <div>
                                    <label className="block text-[10px] font-bold text-black uppercase tracking-widest mb-3">Organization Name</label>
                                    <div className="flex gap-3">
                                        <input 
                                            value={orgName}
                                            onChange={(e) => setOrgName(e.target.value)}
                                            className="flex-1 px-5 py-4 border-2 border-black outline-none focus:bg-black focus:text-white transition-all font-bold uppercase text-xs"
                                            placeholder="MY ORGANIZATION"
                                        />
                                        <button 
                                            onClick={async () => {
                                                setIsSaving(true);
                                                await updateOrganizationName(orgName);
                                                setIsSaving(false);
                                            }}
                                            disabled={isSaving}
                                            className="px-8 py-4 border-2 border-black bg-black text-white font-bold uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-50"
                                        >
                                            {isSaving ? "SAVING..." : "UPDATE"}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-black/40 mt-4 uppercase font-bold italic">Displayed in the sidebar and on status pages.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "extension" && activeExtId && (
                        <ExtensionSettings 
                            extensionId={activeExtId} 
                            config={configForm} 
                            setConfig={setConfigForm} 
                            onSave={async () => {
                                setIsSaving(true);
                                await saveGlobalConfig(activeExtId, configForm);
                                setIsSaving(false);
                            }}
                            isInstalled={installedIds.includes(activeExtId)}
                            onToggleInstall={async (val: boolean) => {
                                await toggleExtensionInstall(activeExtId, val);
                                const newInstalled = await getInstalledExtensions();
                                setInstalledIds(newInstalled);
                            }}
                            schema={availableExtensions.find(e => e.id === activeExtId)?.configSchema || []}
                        />
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  </div>
  );
}

// Sub-component for extension settings
function ExtensionSettings({ 
    extensionId, 
    config, 
    setConfig, 
    onSave, 
    isInstalled, 
    onToggleInstall,
    schema 
}: any) {
    return (
        <div>
            <div className="flex items-center justify-between mb-10 border-b-2 border-black pb-8">
                <div>
                    <h2 className="text-3xl font-bold uppercase tracking-tighter">{extensionId}</h2>
                    <p className="text-[10px] text-black/40 uppercase font-bold tracking-widest mt-2">{isInstalled ? 'Active Extension' : 'Ready to Install'}</p>
                </div>
                <div className="flex items-center gap-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={isInstalled}
                            onChange={(e) => onToggleInstall(e.target.checked)}
                        />
                        <div className="w-12 h-7 bg-white border-2 border-black peer-focus:outline-none transition-all peer-checked:bg-black after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-black after:border-2 after:border-black after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5 peer-checked:after:bg-white peer-checked:after:border-white"></div>
                        <span className="ml-4 text-xs font-bold uppercase tracking-widest text-black">{isInstalled ? 'Enabled' : 'Disabled'}</span>
                    </label>
                </div>
            </div>
            
            {!isInstalled ? (
                <div className="p-16 border-2 border-black border-dashed bg-gray-50 text-black font-bold uppercase tracking-widest text-[10px] text-center">
                    Extension must be enabled before configuration.
                </div>
            ) : (
                <div className="space-y-8 max-w-2xl">
                    {schema.filter((f: any) => f.scope !== 'monitor').map((field: any) => (
                        <div key={field.key}>
                            <label className="block text-[10px] font-bold text-black uppercase tracking-widest mb-3">
                                {field.label} {field.required && <span className="text-red-500 font-bold">*</span>}
                            </label>
                            {field.type === 'checkbox' ? (
                                <div 
                                    className={`w-10 h-10 border-2 border-black flex items-center justify-center cursor-pointer transition-all ${config[field.key] ? 'bg-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white'}`}
                                    onClick={() => setConfig({...config, [field.key]: !config[field.key]})}
                                >
                                    {config[field.key] && <div className="w-4 h-4 bg-white" />}
                                </div>
                            ) : (
                                <input 
                                    type={field.type}
                                    value={config[field.key] ?? ""}
                                    onChange={e => setConfig({...config, [field.key]: e.target.value})}
                                    className="w-full px-5 py-4 border-2 border-black outline-none focus:bg-black focus:text-white transition-all font-bold uppercase text-xs"
                                    placeholder={field.description?.toUpperCase()} 
                                />
                            )}
                            {field.description && <p className="text-[10px] text-black/40 mt-3 font-bold uppercase italic">{field.description}</p>}
                        </div>
                    ))}
                    
                    <div className="pt-8 border-t-2 border-black">
                        <button 
                            onClick={onSave}
                            className="flex items-center gap-4 px-10 py-5 border-2 border-black bg-black text-white font-bold uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                        >
                            <Save className="w-5 h-5" /> Save Configuration
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
