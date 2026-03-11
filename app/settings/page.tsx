"use client";

import { useState, useEffect, Suspense } from "react";
import {
  getOrganizationName,
  updateOrganizationName,
  getTheme,
  updateTheme,
  getServiceMonitors,
  logout,
  getDefaultPingInterval,
  updateDefaultPingInterval,
  getIsDemoMode
} from "../actions";
import { Sidebar } from "../components/Sidebar";
import { NotificationsSettings } from "../components/NotificationsSettings";
import { Save, Settings, Moon, Sun, Sliders, Bell } from "lucide-react";

export default function SettingsPage() {
    return (
        <Suspense fallback={<div>Loading Settings...</div>}>
            <SettingsContent />
        </Suspense>
    );
}

function SettingsContent() {
  const [activeTab, setActiveTab] = useState("configuration");
  const [orgName, setOrgName] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [defaultPingInterval, setDefaultPingInterval] = useState(60);
  const [monitors, setMonitors] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    // Load initial data
    getIsDemoMode().then(demoMode => {
      setIsDemo(demoMode);
      Promise.all([
          getOrganizationName(), 
          getTheme(),
          getServiceMonitors(),
          getDefaultPingInterval()
      ]).then(([name, currentTheme, mons, interval]) => {
          setOrgName(name);
          setTheme(currentTheme as "light" | "dark");
          setMonitors(mons);
          setDefaultPingInterval(interval);
      });
    });
  }, []);

  // Apply theme to <html> element immediately on state change
  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  // Save theme immediately when toggled (no need to wait for form submit)
  const handleThemeChange = async (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    await updateTheme(newTheme);
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await Promise.all([
        updateOrganizationName(orgName),
        updateTheme(theme),
        updateDefaultPingInterval(defaultPingInterval)
    ]);
    setIsSaving(false);
  };

  return (
    <div className="flex h-screen bg-white dark:bg-[#0a0a0a]">
      <Sidebar 
        monitors={monitors} 
        orgName={orgName} 
        onLogout={logout} 
        isDemo={isDemo}
      />

      <div className="flex-1 ml-64 flex flex-col overflow-hidden bg-white dark:bg-[#0a0a0a]">
        <header className="border-b-2 border-black dark:border-white bg-white dark:bg-[#0a0a0a]">
          <div className="px-10 py-6 flex items-center justify-between">
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40">
              <span className="text-black dark:text-white flex items-center gap-3">
                <Settings className="w-5 h-5" /> Settings
              </span>
              <div className="w-1.5 h-1.5 bg-black/20 dark:bg-white/20" />
              <span>{activeTab === 'configuration' ? 'Configuration' : 'Preferences'}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-white dark:bg-[#0a0a0a]">
          <div className="p-10 max-w-7xl mx-auto">
            <div className="mb-12 border-l-4 border-black dark:border-white pl-8 py-2">
                <h1 className="text-6xl font-black text-black dark:text-white uppercase tracking-tighter mb-2 leading-none">System Settings</h1>
                <p className="text-xs font-bold uppercase tracking-widest text-black/40 dark:text-white/40">Configuration for your Overseer instance.</p>
            </div>

            <div className="flex gap-4 mb-10 overflow-x-auto pb-4 no-scrollbar">
                <button 
                  onClick={() => setActiveTab("configuration")}
                  className={`px-8 py-4 border-2 border-black dark:border-white font-black uppercase tracking-widest text-xs transition-all whitespace-nowrap ${activeTab === 'configuration' ? 'bg-black dark:bg-white text-white dark:text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]' : 'bg-white dark:bg-black text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]'}`}
                >
                  Configuration
                </button>
                <button 
                  onClick={() => setActiveTab("notifications")}
                  className={`px-8 py-4 border-2 border-black dark:border-white font-black uppercase tracking-widest text-xs transition-all whitespace-nowrap ${activeTab === 'notifications' ? 'bg-black dark:bg-white text-white dark:text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]' : 'bg-white dark:bg-black text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]'}`}
                >
                  Notifications
                </button>
                <button 
                  onClick={() => setActiveTab("preferences")}
                  className={`px-8 py-4 border-2 border-black dark:border-white font-black uppercase tracking-widest text-xs transition-all whitespace-nowrap ${activeTab === 'preferences' ? 'bg-black dark:bg-white text-white dark:text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]' : 'bg-white dark:bg-black text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]'}`}
                >
                  Preferences
                </button>
            </div>

            <div className="bg-white dark:bg-black border-2 border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
                <div className="p-10">
                    <form onSubmit={handleUpdateSettings} className="space-y-12">
                        {activeTab === 'configuration' && (
                          <>
                            <div>
                                <label className="block text-xs font-black mb-4 uppercase tracking-widest text-black dark:text-white">Organization Name</label>
                                <input 
                                    type="text" 
                                    value={orgName} 
                                    onChange={(e) => setOrgName(e.target.value)}
                                    className="w-full px-6 py-5 bg-white dark:bg-black border-2 border-black dark:border-white font-bold uppercase tracking-widest text-sm focus:outline-none focus:bg-black dark:focus:bg-white focus:text-white dark:focus:text-black transition-colors text-black dark:text-white"
                                    placeholder="Overseer"
                                />
                                <p className="mt-4 text-[10px] font-bold uppercase tracking-widest opacity-40 dark:text-white/40 italic">This name appears on the sidebar and status pages.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-black mb-4 uppercase tracking-widest text-black dark:text-white flex items-center gap-2">
                                  <Sliders className="w-4 h-4" />
                                  Default Ping Ratio (Delay)
                                </label>
                                <div className="flex items-center gap-6">
                                  <input 
                                      type="range" 
                                      min="10" 
                                      max="60" 
                                      step="5"
                                      value={defaultPingInterval} 
                                      onChange={(e) => setDefaultPingInterval(parseInt(e.target.value))}
                                      className="flex-1 h-3 bg-gray-200 dark:bg-gray-800 border-2 border-black dark:border-white appearance-none cursor-pointer accent-black dark:accent-white"
                                  />
                                  <div className="w-24 px-4 py-3 border-2 border-black dark:border-white font-black text-center text-xl bg-black dark:bg-white text-white dark:text-black">
                                    {defaultPingInterval}s
                                  </div>
                                </div>
                                <p className="mt-4 text-[10px] font-bold uppercase tracking-widest opacity-40 dark:text-white/40 italic">New monitors will use this check frequency by default (10s - 60s).</p>
                            </div>
                          </>
                        )}

                        {activeTab === 'notifications' && <NotificationsSettings isDemo={isDemo} />}

                        {activeTab === 'preferences' && (
                          <>
                            <div>
                                <label className="block text-xs font-black mb-4 uppercase tracking-widest text-black dark:text-white">Interface Theme</label>
                                <div className="flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => handleThemeChange("light")}
                                        className={`flex-1 flex items-center justify-center gap-3 px-6 py-5 border-2 border-black dark:border-white font-black uppercase tracking-widest text-xs transition-all ${theme === 'light' ? 'bg-black dark:bg-white text-white dark:text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]' : 'bg-white dark:bg-black text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900'}`}
                                    >
                                        <Sun className="w-4 h-4" />
                                        Light Mode
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleThemeChange("dark")}
                                        className={`flex-1 flex items-center justify-center gap-3 px-6 py-5 border-2 border-black dark:border-white font-black uppercase tracking-widest text-xs transition-all ${theme === 'dark' ? 'bg-black dark:bg-white text-white dark:text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]' : 'bg-white dark:bg-black text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900'}`}
                                    >
                                        <Moon className="w-4 h-4" />
                                        Dark Mode
                                    </button>
                                </div>
                                <p className="mt-4 text-[10px] font-bold uppercase tracking-widest opacity-40 dark:text-white/40 italic">Switch between light and dark brutalist interface.</p>
                            </div>
                          </>
                        )}

                        {activeTab !== 'notifications' && (
                          <div className="pt-8 border-t-2 border-black dark:border-white">
                              <button 
                                  type="submit"
                                  disabled={isSaving}
                                  className="w-full bg-black dark:bg-white text-white dark:text-black px-10 py-6 font-black uppercase tracking-widest text-xs hover:bg-white dark:hover:bg-black hover:text-black dark:hover:text-white border-2 border-black dark:border-white transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] active:translate-x-1 active:translate-y-1 active:shadow-none flex items-center justify-center gap-4"
                              >
                                  <Save className="w-5 h-5" />
                                  {isSaving ? 'SYNCHRONIZING...' : 'SAVE ALL SETTINGS'}
                              </button>
                          </div>
                        )}
                    </form>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
