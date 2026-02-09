"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BarChart3, Bell, Globe, Layout, LogOut, Plus, Settings, ShoppingBag } from "lucide-react";

interface SidebarProps {
  monitors: Array<{ id: string; name: string }>;
  statusPages?: Array<{ id: string; slug: string; title: string }>;
  orgName?: string;
  selectedMonitorId?: string;
  onLogout: () => void;
}

export function Sidebar({ monitors, statusPages = [], orgName = "Overseer", selectedMonitorId, onLogout }: SidebarProps) {
  const router = useRouter();
  const [expandStatusPages, setExpandStatusPages] = useState(false);

  return (
    <div className="w-64 border-r border-gray-200 bg-white h-screen flex flex-col fixed left-0 top-0">
      {/* Logo/Brand */}
      <div className="h-16 border-b border-gray-200 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">
                {orgName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="text-sm font-semibold truncate max-w-[120px]" title={orgName}>{orgName}</div>
            <div className="text-xs text-gray-500">Monitoring</div>
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 10l5 5 5-5z" />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Workspace */}
        <div>
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Workspace
          </h3>
          <div className="space-y-1">
            <a href="#" className="px-3 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-2 text-sm">
              <Layout className="w-4 h-4" />
              Overview
            </a>
            <a href="#" className="px-3 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-2 text-sm">
              <BarChart3 className="w-4 h-4" />
              Monitors
            </a>
            <a href="#" className="px-3 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-2 text-sm">
              <Globe className="w-4 h-4" />
              Status Pages
            </a>
            <a href="#" className="px-3 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-2 text-sm">
              <Bell className="w-4 h-4" />
              Notifications
            </a>
            <a href="/settings" className="px-3 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-2 text-sm">
              <Settings className="w-4 h-4" />
              Settings
            </a>
            <a href="/store" className="px-3 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-2 text-sm">
              <ShoppingBag className="w-4 h-4" />
              Extension Store
            </a>
          </div>
        </div>

        {/* Status Pages */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Status Pages
            </h3>
            <a href="/settings?tab=status-pages" className="text-gray-400 hover:text-gray-600">
              <Plus className="w-3 h-3" />
            </a>
          </div>
          <div className="space-y-1">
            {statusPages.length === 0 && (
               <div className="px-3 py-2 text-xs text-gray-400 italic">
                 No status pages
               </div>
            )}
            {statusPages.map(page => (
              <a 
                key={page.id}
                href={`/status/${page.slug}`}
                target="_blank"
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-2 text-sm"
              >
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                {page.title}
              </a>
            ))}
          </div>
        </div>

        {/* Monitors */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Monitors ({monitors.length})
            </h3>
            <button className="text-gray-400 hover:text-gray-600">
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-1">
            {monitors.map(monitor => (
              <button
                key={monitor.id}
                onClick={() => router.push(`/monitors/${monitor.id}`)}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-sm ${
                  selectedMonitorId === monitor.id
                    ? "bg-blue-50 text-blue-700"
                    : "hover:bg-gray-100"
                }`}
              >
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                {monitor.name}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4 space-y-2">
        <button onClick={onLogout} className="w-full px-3 py-2 text-left rounded-lg hover:bg-gray-100 flex items-center gap-2 text-sm text-gray-700">
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );
}
