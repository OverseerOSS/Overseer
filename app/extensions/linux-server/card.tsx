"use client";

import { useMemo } from "react";
import { ExtensionCardProps, ServiceInfo } from "../types";
import { MetricGraph } from "@/app/components/MetricGraph";

export default function LinuxServerCard({ service, history }: ExtensionCardProps) {
  // Extract CPU history
  const cpuHistory = useMemo(() => {
    return history.map((point) => {
        // history point.data is the ServiceInfo object for this monitor at that time
        // The MonitorCard unwraps the array, so point.data passed here should be the ServiceInfo
        // Wait, MonitorCard needs to pass the correct data structure. 
        // Let's assume point.data is the ServiceInfo object.
        const details = point.data?.details || {};
        return typeof details.cpuUsage === 'number' ? details.cpuUsage : 0;
    });
  }, [history]);

  // Extract RAM history
  const ramHistory = useMemo(() => {
    return history.map((point) => {
        const details = point.data?.details || {};
        const used = typeof details.ramUsed === 'number' ? details.ramUsed : 0;
        const total = typeof details.ramTotal === 'number' ? details.ramTotal : 1;
        return (used / total) * 100;
    });
  }, [history]);

  // Extract Network history
  const netHistory = useMemo(() => {
    return history.map((point) => {
      const details = point.data?.details || {};
      const rx = typeof details.netRx === 'number' ? details.netRx : 0;
      // Convert to KB/s for graph if needed, or just keep raw bytes
      return rx; 
    });
  }, [history]);

  // Helper to format bytes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const currentCpu = service.details?.cpuUsage;
  const currentRamUsed = service.details?.ramUsed;
  const currentRamTotal = service.details?.ramTotal;
  const currentNetRx = service.details?.netRx;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="col-span-2 md:col-span-1">
        <div className="text-sm text-gray-500 mb-1">CPU Usage</div>
        <div className="text-2xl font-mono font-semibold mb-2">
           {currentCpu !== undefined ? `${currentCpu}%` : '-'}
        </div>
        {currentCpu !== undefined && (
          <MetricGraph
            data={cpuHistory}
            label="CPU"
            unit="%"
            color="#22c55e"
            height={60}
          />
        )}
      </div>

      <div className="col-span-2 md:col-span-1">
        <div className="text-sm text-gray-500 mb-1">RAM Usage</div>
        <div className="text-2xl font-mono font-semibold mb-2">
            {currentRamUsed !== undefined ? `${Math.round((currentRamUsed / currentRamTotal) * 100)}%` : '-'}
        </div>
        {currentRamUsed !== undefined && currentRamTotal && (
            <MetricGraph
              data={ramHistory}
              label={`RAM`}
              unit="%"
              color="#3b82f6"
              height={60}
            />
        )}
        <div className="text-xs text-gray-400 mt-1">
            {currentRamUsed} / {currentRamTotal} MB
        </div>
      </div>

      <div className="col-span-2 md:col-span-1">
        <div className="text-sm text-gray-500 mb-1">Network (In)</div>
        <div className="text-2xl font-mono font-semibold mb-2">
            {currentNetRx !== undefined ? formatBytes(currentNetRx) : '-'}
        </div>
        {currentNetRx !== undefined && (
             <MetricGraph
             data={netHistory}
             label="Net Rx"
             unit=""
             color="#eab308"
             height={60}
             max={Math.max(...netHistory, 1024)} // Dynamic scale for network
           />
        )}
      </div>
      
      {/* Fallback for other details */}
      <div className="col-span-2 md:col-span-1">
         <div className="text-sm text-gray-500 mb-1">System Info</div>
         <div className="text-xs text-gray-400 space-y-1">
             {Object.entries(service.details || {}).map(([k, v]) => {
                 if (['cpuUsage', 'ramUsed', 'ramTotal', 'netRx', 'cpuError', 'ramError', 'netError'].includes(k)) return null;
                 return (
                    <div key={k} className="flex justify-between overflow-hidden">
                        <span className="truncate mr-2">{k}:</span>
                        <span className="font-mono">{String(v)}</span>
                    </div>
                 );
             })}
              {service.details?.cpuError && <div className="text-red-500 text-xs">CPU Error: {service.details.cpuError}</div>}
              {service.details?.netError && <div className="text-red-500 text-xs">Net Error: {service.details.netError}</div>}
         </div>
      </div>
    </div>
  );
}
