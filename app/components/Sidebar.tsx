"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { BarChart3, Globe, Layout, LogOut, MoreVertical, Plus, Settings, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";

interface SidebarProps {
  monitors: Array<{ id: string; name: string }>;
  orgName?: string;
  selectedMonitorId?: string;
  onLogout: () => void;
  onDeleteMonitor?: (id: string) => void;
  onEditMonitor?: (id: string) => void;
  isDemo?: boolean;
}

export function Sidebar({ monitors, orgName = "Overseer", selectedMonitorId, onLogout, onDeleteMonitor, onEditMonitor, isDemo }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="w-64 border-r-2 border-black dark:border-white bg-white dark:bg-[#0a0a0a] h-screen flex flex-col fixed left-0 top-0 transition-colors duration-300">
      {/* Logo/Brand */}
      <div className="h-20 border-b-2 border-black dark:border-white px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 border-2 border-black dark:border-white bg-white dark:bg-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
            <span className="text-black dark:text-white font-bold text-xl">
                {orgName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="ml-1">
            <div className="text-lg font-bold tracking-tighter truncate max-w-[120px] uppercase text-black dark:text-white" title={orgName}>{orgName}</div>
            <div className="flex items-center gap-2">
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-50 text-black dark:text-white">Monitoring</div>
              {isDemo && (
                <div className="text-[8px] font-black bg-red-600 text-white px-1.5 py-0.5 animate-pulse">DEMO</div>
              )}
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
        {/* Workspace */}
        <div>
          <h3 className="px-3 text-[10px] font-bold text-black dark:text-white uppercase tracking-widest mb-4 opacity-50">
            Workspace
          </h3>
          <div className="space-y-2">
            <Link href="/" className={`px-3 py-3 border-2 border-transparent flex items-center gap-3 text-xs font-bold uppercase tracking-widest transition-all ${pathname === "/" ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]" : "hover:border-black dark:hover:border-white text-black dark:text-white"}`}>
              <Layout className="w-4 h-4" />
              Overview
            </Link>
            <Link href="/status-pages" className={`px-3 py-3 border-2 border-transparent flex items-center gap-3 text-xs font-bold uppercase tracking-widest transition-all ${pathname === "/status-pages" ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]" : "hover:border-black dark:hover:border-white text-black dark:text-white"}`}>
              <Globe className="w-4 h-4" />
              Status Pages
            </Link>
            <Link href="/settings" className={`px-3 py-3 border-2 border-transparent flex items-center gap-3 text-xs font-bold uppercase tracking-widest transition-all ${pathname === "/settings" ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]" : "hover:border-black dark:hover:border-white text-black dark:text-white"}`}>
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          </div>
        </div>

        {/* Monitors */}
        <div>
          <div className="flex items-center justify-between px-3 mb-4">
            <h3 className="text-[10px] font-bold text-black dark:text-white uppercase tracking-widest opacity-50">
              Monitors ({monitors.length})
            </h3>
          </div>
          <div className="space-y-2">
            {monitors.map(monitor => (
              <div key={monitor.id} className="relative group">
                <button
                  onClick={() => router.push(`/?monitor=${monitor.id}`)}
                  className={`w-full text-left px-3 py-3 pr-10 border-2 flex items-center gap-3 text-xs font-bold uppercase tracking-widest transition-all ${
                    selectedMonitorId === monitor.id
                      ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                      : "border-transparent hover:border-black dark:hover:border-white text-black dark:text-white"
                  }`}
                >
                  <span className={`w-2 h-2 ${selectedMonitorId === monitor.id ? 'bg-white dark:bg-black' : 'bg-black dark:bg-white'}`}></span>
                  <span className="truncate">{monitor.name}</span>
                </button>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(activeMenuId === monitor.id ? null : monitor.id);
                  }}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 border-2 border-transparent hover:border-black dark:hover:border-white transition-all opacity-0 group-hover:opacity-100 ${selectedMonitorId === monitor.id ? 'text-white dark:text-black' : 'text-black dark:text-white'}`}
                >
                  < MoreVertical className="w-3.5 h-3.5" />
                </button>

                {activeMenuId === monitor.id && (
                  <div 
                    ref={menuRef}
                    className="absolute right-0 mt-1 w-40 bg-white dark:bg-black border-2 border-black dark:border-white z-50 py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onEditMonitor) onEditMonitor(monitor.id);
                        setActiveMenuId(null);
                      }}
                      className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-black dark:text-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-all flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      Edit Monitor
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDeleteMonitor) onDeleteMonitor(monitor.id);
                        setActiveMenuId(null);
                      }}
                      className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-red-600 hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-all flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Monitor
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t-2 border-black dark:border-white p-4">
        <button onClick={onLogout} className="w-full px-4 py-3 border-2 border-black dark:border-white flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-widest text-black dark:text-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-all hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:translate-x-1 active:translate-y-1 active:shadow-none">
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );
}
