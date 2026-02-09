"use client";

import { useState, useEffect } from "react";
import {
  getInstalledExtensions,
  toggleExtensionInstall,
  saveGlobalConfig,
  getGlobalConfig,
  getAvailableExtensionsMetadata,
} from "../actions";
import { ExtensionConfigField, ExtensionMetadata } from "../extensions/types";
import StatusPagesSettings from "./status-pages/page";

export default function SettingsPage() {
  const [installedIds, setInstalledIds] = useState<string[]>([]);
  const [showStatusPages, setShowStatusPages] = useState(false);
  const [loading, setLoading] = useState(true);
  const [availableExtensions, setAvailableExtensions] = useState<ExtensionMetadata[]>([]);

  // Config Modal
  const [editingExtId, setEditingExtId] = useState<string | null>(null);
  const [configForm, setConfigForm] = useState<Record<string, any>>({});
  const [savingConfig, setSavingConfig] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("General");

  useEffect(() => {
    Promise.all([getInstalledExtensions(), getAvailableExtensionsMetadata()])
      .then(([ids, exts]) => {
        setInstalledIds(ids);
        setAvailableExtensions(exts);
        setLoading(false);
      });
  }, []);
// ... same ...
  const openConfig = async (extId: string) => {
    setEditingExtId(extId);
    const ext = availableExtensions.find(e => e.id === extId);
    if (ext) {
      const firstCat = ext.configSchema.find(f => f.scope !== "monitor")?.category || "General";
      setActiveTab(firstCat);
    }
    const saved = await getGlobalConfig(extId);
    setConfigForm(saved || {});
  };

  const saveConfig = async () => {
    if (!editingExtId) return;
    setSavingConfig(true);
    await saveGlobalConfig(editingExtId, configForm);
    setSavingConfig(false);
    setEditingExtId(null);
  };

  const editingExtension = availableExtensions.find(e => e.id === editingExtId);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-gray-100 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-800 pb-0">
          <div className="pb-6">
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage extensions and system configuration
            </p>
          </div>
          <a
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:underline mb-6"
          >
            &larr; Back to Dashboard
          </a>
        </header>

        {/* Tabs */}
        <div className="flex space-x-4 border-b border-gray-200 dark:border-zinc-800">
           <button
             onClick={() => setShowStatusPages(false)}
             className={`pb-2 text-sm font-medium border-b-2 transition-colors ${!showStatusPages ? "border-blue-600 text-blue-600 dark:text-blue-400" : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}
           >
             Extensions
           </button>
           <button
             onClick={() => setShowStatusPages(true)}
             className={`pb-2 text-sm font-medium border-b-2 transition-colors ${showStatusPages ? "border-blue-600 text-blue-600 dark:text-blue-400" : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}
           >
             Status Pages
           </button>
        </div>

        {showStatusPages ? (
          <StatusPagesSettings />
        ) : (
        <>
        <section className="space-y-6">
          <h2 className="text-xl font-semibold">Extensions</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableExtensions.map(ext => {
              const isInstalled = installedIds.includes(ext.id);
              return (
                <div
                  key={ext.id}
                  className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-lg">{ext.name}</h3>
                      {isInstalled && (
                        <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs px-2 py-0.5 rounded-full font-medium">
                          Installed
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      {ext.description}
                    </p>
                  </div>

                  <div className="mt-6 flex gap-2">
                    <button
                      onClick={() => handleToggle(ext.id, isInstalled)}
                      disabled={loading}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        isInstalled
                          ? "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-zinc-800 dark:text-gray-300 dark:hover:bg-zinc-700"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      {loading ? "..." : isInstalled ? "Uninstall" : "Install"}
                    </button>

                    {isInstalled && (
                      <button
                        onClick={() => openConfig(ext.id)}
                        className="bg-gray-100 dark:bg-zinc-800 p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700"
                        title="Configure Global Settings"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Global Config Modal */}
        {editingExtension && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-zinc-950 w-full max-w-lg rounded-xl shadow-xl border border-gray-200 dark:border-zinc-800">
              <div className="p-6 border-b border-gray-200 dark:border-zinc-800">
                <h3 className="text-lg font-bold">
                  Configure {editingExtension.name}
                </h3>
                <p className="text-sm text-gray-500">
                  Settings applied here will be used as defaults for all
                  services using this extension.
                </p>
                
                {/* Tabs */}
                {(() => {
                  const categories = Array.from(new Set(
                    editingExtension.configSchema
                      .filter(f => f.scope !== "monitor")
                      .map(f => f.category || "General")
                  ));
                  
                  if (categories.length > 1) {
                    return (
                      <div className="flex gap-4 mt-4 -mb-6 border-b border-gray-100 dark:border-zinc-800">
                        {categories.map(cat => (
                           <button 
                             key={cat}
                             onClick={() => setActiveTab(cat)}
                             className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                               activeTab === cat 
                               ? "border-blue-500 text-blue-600 dark:text-blue-400" 
                               : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
                             }`}
                           >
                             {cat}
                           </button>
                        ))}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                {editingExtension.configSchema
                  .filter(f => f.scope !== "monitor")
                  .filter(f => (f.category || "General") === activeTab)
                  .map(field => (
                  <div key={field.key}>
                    {field.type === "checkbox" ? (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!configForm[field.key]}
                          onChange={e =>
                            setConfigForm(prev => ({
                              ...prev,
                              [field.key]: e.target.checked,
                            }))
                          }
                          className="w-4 h-4 text-blue-600 bg-gray-50 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium">
                          {field.label}
                        </span>
                      </label>
                    ) : (
                      <>
                        <label className="block text-sm font-medium mb-1">
                          {field.label}
                        </label>
                        <input
                          type={field.type === "password" ? "password" : "text"}
                          className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md p-2 text-sm"
                          placeholder={String(field.defaultValue || "")}
                          value={configForm[field.key] || ""}
                          onChange={e =>
                            setConfigForm(prev => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                        />
                      </>
                    )}
                    {field.description && (
                      <p className="text-xs text-gray-500 mt-1">
                        {field.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <div className="p-6 border-t border-gray-200 dark:border-zinc-800 flex justify-end gap-3 bg-gray-50 dark:bg-zinc-900/50 rounded-b-xl">
                <button
                  onClick={() => setEditingExtId(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={saveConfig}
                  disabled={savingConfig}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                >
                  {savingConfig ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </div>
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
}
