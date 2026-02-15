"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { GenericMonitorCard } from "@/app/components/GenericMonitorCard";

interface StatusPageContentProps {
  initialItems: any[];
  statusPage: any;
}

function StatusServiceItem({ item, statusPage }: { item: any, statusPage: any }) {
  return (
    <div className="bg-white dark:bg-black border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] p-8 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-black dark:text-white">{item.name}</h3>
                  <div className={`w-3 h-3 border-2 border-black dark:border-white ${
                    item.status === 'operational' ? 'bg-green-500' : 
                    item.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40 truncate max-w-[300px]">
                {item.service?.details?.url || item.service?.details?.host || "System Monitor Endpoint"}
              </span>
          </div>

          {/* Uptime History Layout */}
          {statusPage.showHistory && (
            <div className="flex-1 flex flex-col gap-3">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40">Uptime (Last 30 Days)</span>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${
                      item.history.every((h: any) => h.status === 'operational' || h.status === 'no-data') ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
                  }`}>
                      {(() => {
                        const relevantDays = item.history.filter((h: any) => h.status !== 'no-data');
                        if (relevantDays.length === 0) return "100.0";
                        const upDays = relevantDays.filter((h: any) => h.status === 'operational').length;
                        return ((upDays / relevantDays.length) * 100).toFixed(1);
                      })()}%
                  </span>
                </div>
                <div className="flex gap-1 h-8">
                  {item.history.map((h: any, i: number) => (
                    <div 
                      key={i} 
                      className={`flex-1 transition-all duration-300 ${
                        h.status === 'operational' ? 'bg-green-500/30 hover:bg-green-500' : 
                        h.status === 'degraded' ? 'bg-yellow-500/50 hover:bg-yellow-500' : 
                        h.status === 'outage' ? 'bg-red-500/50 hover:bg-red-500' : 'bg-black/5 dark:bg-white/10'
                      } ${i === item.history.length - 1 ? (item.status === 'operational' ? 'bg-green-500' : (item.status === 'outage' ? 'bg-red-500' : 'bg-yellow-500')) : ''}`} 
                      title={`${h.date}: ${h.status.toUpperCase()}`}
                    />
                  ))}
                </div>
                <div className="flex justify-between px-1">
                  <span className="text-[8px] font-bold uppercase tracking-widest text-black/20 dark:text-white/20">30D Ago</span>
                  <span className="text-[8px] font-bold uppercase tracking-widest text-black/20 dark:text-white/20 text-right">
                      {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
                  </span>
                </div>
            </div>
          )}

          <div className="flex items-center gap-4 border-l-2 border-black/10 dark:border-white/10 pl-8 min-w-[140px]">
              <div className="text-right w-full">
                <div className={`text-xs font-black uppercase tracking-widest ${
                  item.status === 'operational' ? 'text-green-600 dark:text-green-400' : 
                  item.status === 'degraded' ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {item.status === 'operational' ? 'Operational' : 
                  item.status === 'degraded' ? 'Degraded' : 'Major Outage'}
                </div>
                <div className="text-[8px] font-bold uppercase tracking-widest text-black/20 dark:text-white/20 mt-1 flex items-center justify-end gap-1">
                  <Clock className="w-2 h-2" />
                  Polled Just Now
                </div>
              </div>
          </div>
        </div>

        {statusPage.showMetrics && (
          <div className="mt-10 pt-8 border-t-2 border-black/5 dark:border-white/5">
             <GenericMonitorCard 
               service={item.service} 
               history={item.fullHistory} 
               showRecentHistory={statusPage.showRecentHistory}
               defaultExpanded={false}
             />
          </div>
        )}
    </div>
  );
}

export default function StatusPageContent({ initialItems, statusPage }: StatusPageContentProps) {
  const [items, setItems] = useState(initialItems);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  useEffect(() => {
    setLastCheck(new Date());
    // Find unique monitor IDs to monitor
    const monitorIds = Array.from(new Set(initialItems.map(item => item.monitorId)));
    
    const eventSources = monitorIds.map(id => {
      const es = new EventSource(`/api/monitors/${id}/stream`);
      
      const handleUpdate = (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data);
          if (!payload.success || !Array.isArray(payload.data)) return;

          setLastCheck(new Date());
          
          setItems(prev => prev.map(item => {
            if (item.monitorId === id) {
              // Try to find matching service in the update
              const service = (payload.data as any[]).find((s: any) => s.id === item.serviceId || s.name === item.name);
              
              if (service) {
                const newStatus = service.status === "running" ? "operational" : service.status === "degraded" ? "degraded" : "outage";
                const newHistoryPoint = { timestamp: new Date().toISOString(), data: service };
                const newFullHistory = [...item.fullHistory, newHistoryPoint].slice(-50);

                return {
                  ...item,
                  status: newStatus,
                  service: service,
                  fullHistory: newFullHistory
                };
              }
            }
            return item;
          }));
        } catch (err) {
          console.error("Error parsing SSE update", err);
        }
      };

      es.addEventListener("message", handleUpdate);
      return es;
    });

    return () => eventSources.forEach(es => es.close());
  }, [initialItems]);

  return (
    <div className="space-y-8">
      {items.map((item) => (
        <StatusServiceItem key={item.id} item={item} statusPage={statusPage} />
      ))}
    </div>
  );
}

