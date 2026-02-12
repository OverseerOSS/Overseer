"use client";

import { useMemo } from "react";
import { ExtensionCardProps, ServiceInfo } from "../types";
import { MetricGraph } from "@/app/components/MetricGraph";

export default function LinuxServerCard({ service, history }: ExtensionCardProps) {
  // Extract CPU history
  const cpuHistory = useMemo(() => {
    return history.map((point) => {
        const details = point.data?.details || {};
        return typeof details.cpuUsage === 'number' ? details.cpuUsage : 0;
    });
  }, [history]);

  // Extract RAM history
  const ramHistory = useMemo(() => {
    return history.map((point) => {
        const details = point.data?.details || {};
        if (typeof details.usagePercent === 'number') return details.usagePercent;
        
        const used = typeof details.ramUsed === 'number' ? details.ramUsed : 0;
        const total = typeof details.ramTotal === 'number' ? details.ramTotal : 1;
        return (used / total) * (total > 0 ? 100 : 0);
    });
  }, [history]);

  // Extract Network history
  const netHistory = useMemo(() => {
    return history.map((point) => {
      const details = point.data?.details || {};
      return typeof details.netRx === 'number' ? details.netRx : 0;
    });
  }, [history]);

  const currentCpu = service.details?.cpuUsage;
  const currentRamUsed = service.details?.ramUsed;
  const currentRamTotal = service.details?.ramTotal;
  const currentNetRx = service.details?.netRx;
  const usagePercent = service.details?.usagePercent;
  const loadAvg = service.details?.loadAvg;
  const uptime = service.details?.uptime;

  return (
    <div className="space-y-6">
      {/* htop-style header info */}
      {(loadAvg || uptime) && (
        <div className="flex flex-wrap gap-4 mb-4">
          {loadAvg && (
            <div className="flex items-center gap-2 px-3 py-1 bg-black text-white text-[10px] font-black uppercase tracking-widest">
              <span className="opacity-50">Load:</span>
              <span>{loadAvg}</span>
            </div>
          )}
          {uptime && (
            <div className="flex items-center gap-2 px-3 py-1 border-2 border-black text-black text-[10px] font-black uppercase tracking-widest">
              <span className="opacity-50">Up:</span>
              <span>{uptime}</span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricGraph
          data={cpuHistory}
          label="CPU Usage"
          unit="%"
          color="#10b981"
          height={100}
        />

        <MetricGraph
          data={ramHistory}
          label="RAM Usage"
          unit="%"
          color="#3b82f6"
          height={100}
        />

        <MetricGraph
          data={netHistory}
          label="Network (In)"
          unit="B/s"
          color="#8b5cf6"
          height={100}
          max={Math.max(...netHistory, 1024)}
        />
      </div>
      
      <div className="bg-black/5 border-2 border-black/10 p-6">
         <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
             <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-black/40 mb-2">RAM Total</span>
                <span className="text-xs font-bold text-black truncate">{currentRamTotal ? Math.round(currentRamTotal) : '-'} MB</span>
             </div>
             <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-black/40 mb-2">RAM Used</span>
                <span className="text-xs font-bold text-black truncate">{currentRamUsed?.toFixed(1) || '-'} MB</span>
             </div>
             {Object.entries(service.details || {}).map(([k, v]) => {
                 if (['cpuUsage', 'ramUsed', 'ramTotal', 'netRx', 'cpuError', 'ramError', 'netError', 'metrics', 'usagePercent', 'loadAvg', 'uptime'].includes(k)) return null;
                 
                 let displayValue = String(v);
                 if (typeof v === 'number') {
                    displayValue = v > 100 ? Math.round(v).toString() : v.toFixed(2);
                 }

                 return (
                    <div key={k} className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-black/40 mb-2">{k}</span>
                        <span className="text-xs font-bold text-black truncate">{displayValue}</span>
                    </div>
                 );
             })}
             <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-black/40 mb-2">RAM Usage</span>
                <span className="text-xs font-bold text-black truncate">{usagePercent?.toFixed(1) || '-'}%</span>
             </div>
         </div>
         {(service.details?.cpuError || service.details?.ramError || service.details?.netError) && (
            <div className="mt-6 pt-6 border-t border-black/10 space-y-2">
               {service.details?.cpuError && <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">CPU: {service.details.cpuError}</p>}
               {service.details?.ramError && <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">RAM: {service.details.ramError}</p>}
               {service.details?.netError && <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Net: {service.details.netError}</p>}
            </div>
         )}
      </div>
    </div>
  );
}
