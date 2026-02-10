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
import StatusPagesSettings from "./components/StatusPagesSettings";
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
  const [activeTab, setActiveTab] = useState(tab || "general");
  const [orgName, setOrgName] = useState("");
  const [monitors, setMonitors] = useState<any[]>([]);
  
  // Extension Settings State
  const [activeExtId, setActiveExtId] = useState<string | null>(null);
  const [configForm, setConfigForm] = useState<Record<string, any>>({});
  const [installedIds, setInstalledIds] = useState<string[]>([]);
  const [availableExtensions, setAvailableExtensions] = useState<ExtensionMetadata[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (tab) setActiveTab(tab);
  }, [tab]);

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
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        monitors={monitors} 
        orgName={orgName} 
        // We aren't passing status pages here for simplicity, or fetch them if needed
        selectedMonitorId={undefined} 
        onLogout={logout} 
      />

      <div className="flex-1 ml-64 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-gray-200 bg-white px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="text-gray-900 font-medium flex items-center gap-2">
                <Settings className="w-4 h-4" /> Settings
              </span>
            </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
            <h1 className="text-2xl font-bold mb-6">System Settings</h1>

            <div className="flex gap-6">
                {/* Settings Navigation */}
                <div className="w-64 flex-shrink-0 space-y-1">
                    <button 
                        onClick={() => setActiveTab("general")}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${activeTab === "general" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"}`}
                    >
                        General
                    </button>
                    <button 
                        onClick={() => setActiveTab("status-pages")}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${activeTab === "status-pages" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"}`}
                    >
                        Status Pages
                    </button>
                    
                    <div className="pt-4 pb-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Extensions
                    </div>
                    {availableExtensions.map(ext => (
                        <button 
                            key={ext.id}
                            onClick={() => { setActiveTab("extension"); setActiveExtId(ext.id); }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${activeTab === "extension" && activeExtId === ext.id ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"}`}
                        >
                            <div className="flex items-center justify-between">
                                <span>{ext.name}</span>
                                {installedIds.includes(ext.id) && (
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                )}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Settings Content */}
                <div className="flex-1 bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                    {activeTab === "general" && (
                        <div className="max-w-xl">
                            <h2 className="text-lg font-semibold mb-4">General Configuration</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                                    <div className="flex gap-2">
                                        <input 
                                            value={orgName}
                                            onChange={(e) => setOrgName(e.target.value)}
                                            className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="Enter organization name"
                                        />
                                        <button 
                                            onClick={async () => {
                                                setIsSaving(true);
                                                await updateOrganizationName(orgName);
                                                setIsSaving(false);
                                            }}
                                            disabled={isSaving}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            {isSaving ? "Saving..." : "Update"}
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Displayed in the sidebar and emails.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "status-pages" && (
                        <StatusPagesSettings />
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
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-semibold">{extensionId}</h2>
                    <p className="text-sm text-gray-500">Configure global settings for this extension</p>
                </div>
                <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={isInstalled}
                            onChange={(e) => onToggleInstall(e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        <span className="ml-3 text-sm font-medium text-gray-900">{isInstalled ? 'Enabled' : 'Disabled'}</span>
                    </label>
                </div>
            </div>
            
            {!isInstalled ? (
                <div className="p-4 bg-gray-50 rounded text-gray-500 text-sm text-center">
                    Enable this extension to configure it.
                </div>
            ) : (
                <div className="space-y-4 max-w-xl">
                    {schema.filter((f: any) => f.scope !== 'monitor').map((field: any) => (
                        <div key={field.key}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {field.label} {field.required && <span className="text-red-500">*</span>}
                            </label>
                            {field.type === 'checkbox' ? (
                                <input 
                                    type="checkbox"
                                    checked={config[field.key] ?? field.defaultValue ?? false}
                                    onChange={e => setConfig({...config, [field.key]: e.target.checked})}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                            ) : (
                                <input 
                                    type={field.type}
                                    value={config[field.key] ?? ""}
                                    onChange={e => setConfig({...config, [field.key]: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder={field.description} // Use description as placeholder if needed
                                />
                            )}
                            {field.description && <p className="text-xs text-gray-500 mt-1">{field.description}</p>}
                        </div>
                    ))}
                    
                    <div className="pt-4">
                        <button 
                            onClick={onSave}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                        >
                            <Save className="w-4 h-4" /> Save Configuration
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
