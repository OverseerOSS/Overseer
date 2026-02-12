"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { BarChart3, Bell, Globe, Layout, LogOut, MoreVertical, Plus, Settings, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";

interface SidebarProps {
  monitors: Array<{ id: string; name: string }>;
  orgName?: string;
  selectedMonitorId?: string;
  onLogout: () => void;
  onDeleteMonitor?: (id: string) => void;
}

export function Sidebar({ monitors, orgName = "Overseer", selectedMonitorId, onLogout, onDeleteMonitor }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
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
    <div className="w-64 border-r-2 border-black bg-white h-screen flex flex-col fixed left-0 top-0">
      {/* Logo/Brand */}
      <div className="h-20 border-b-2 border-black px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <span className="text-black font-bold text-xl">
                {orgName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="ml-1">
            <div className="text-lg font-bold tracking-tighter truncate max-w-[120px] uppercase" title={orgName}>{orgName}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">Monitoring</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
        {/* Workspace */}
        <div>
          <h3 className="px-3 text-[10px] font-bold text-black uppercase tracking-widest mb-4 opacity-50">
            Workspace
          </h3>
          <div className="space-y-2">
            <Link href="/" className={`px-3 py-3 border-2 border-transparent flex items-center gap-3 text-xs font-bold uppercase tracking-widest transition-all ${pathname === "/" ? "bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : "hover:border-black text-black"}`}>
              <Layout className="w-4 h-4" />
              Overview
            </Link>
            <Link href="/" className={`px-3 py-3 border-2 border-transparent flex items-center gap-3 text-xs font-bold uppercase tracking-widest transition-all ${pathname === "/monitors" ? "bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : "hover:border-black text-black"}`}>
              <BarChart3 className="w-4 h-4" />
              Monitors
            </Link>
            <Link href="#" className="px-3 py-3 border-2 border-transparent flex items-center gap-3 text-xs font-bold uppercase tracking-widest transition-all hover:border-black text-black">
              <Bell className="w-4 h-4" />
              Notifications
            </Link>
            <Link href="/settings" className={`px-3 py-3 border-2 border-transparent flex items-center gap-3 text-xs font-bold uppercase tracking-widest transition-all ${pathname === "/settings" ? "bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : "hover:border-black text-black"}`}>
              <Settings className="w-4 h-4" />
              Settings
            </Link>
            <Link href="/store" className={`px-3 py-3 border-2 border-transparent flex items-center gap-3 text-xs font-bold uppercase tracking-widest transition-all ${pathname === "/store" ? "bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : "hover:border-black text-black"}`}>
              <ShoppingBag className="w-4 h-4" />
              Extension Store
            </Link>
          </div>
        </div>

        {/* Monitors */}
        <div>
          <div className="flex items-center justify-between px-3 mb-4">
            <h3 className="text-[10px] font-bold text-black uppercase tracking-widest opacity-50">
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
                      ? "bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      : "border-transparent hover:border-black text-black"
                  }`}
                >
                  <span className={`w-2 h-2 ${selectedMonitorId === monitor.id ? 'bg-white' : 'bg-black'}`}></span>
                  <span className="truncate">{monitor.name}</span>
                </button>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(activeMenuId === monitor.id ? null : monitor.id);
                  }}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 border-2 border-transparent hover:border-black transition-all opacity-0 group-hover:opacity-100 ${selectedMonitorId === monitor.id ? 'text-white' : 'text-black'}`}
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>

                {activeMenuId === monitor.id && (
                  <div 
                    ref={menuRef}
                    className="absolute right-0 mt-1 w-40 bg-white border-2 border-black z-50 py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDeleteMonitor) onDeleteMonitor(monitor.id);
                        setActiveMenuId(null);
                      }}
                      className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-red-600 hover:bg-black hover:text-white transition-all flex items-center gap-2"
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
      <div className="border-t-2 border-black p-4">
        <button onClick={onLogout} className="w-full px-4 py-3 border-2 border-black flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none">
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );
}
