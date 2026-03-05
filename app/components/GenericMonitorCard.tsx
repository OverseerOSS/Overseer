import { useState } from "react";
import { ServiceInfo } from "@/lib/monitoring/types";
import UptimeBar from "./UptimeBar";
import MetricCard from "./MetricCard";
import { MetricGraph } from "./MetricGraph";
import { ChevronDown, Mail, Shield, Globe, Cpu } from "lucide-react";

interface GenericMonitorCardProps {
  service: ServiceInfo;
  history: any[];
  uptimeStats?: { uptime24h: number; uptime30d: number } | null;
  showRecentHistory?: boolean;
  defaultExpanded?: boolean;
}

export function GenericMonitorCard({ 
  service, 
  history, 
  uptimeStats, 
  showRecentHistory = true,
  defaultExpanded = true
}: GenericMonitorCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  const latencyHistory = history.map(h => h.data?.metrics?.latency || 0).filter(l => l > 0);
  const avgLatency = latencyHistory.length > 0 
    ? Math.round(latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length) 
    : 0;

  const sslDays = service.details?.sslDays;
  const sslStatus = sslDays === undefined || sslDays === null ? "N/A" : `${sslDays} days`;
  const sslColor = sslDays === undefined || sslDays === null ? "black" : sslDays < 7 ? "red" : sslDays < 30 ? "yellow" : "green";

  const isSsh = service.type === 'ssh';
  const actualHttpStatus = service.details?.statusCode ?? service.metrics?.status;
  const expectedHttpStatus = service.details?.expectedStatus;
  const httpStatusSummary = actualHttpStatus
    ? expectedHttpStatus !== undefined
      ? `${actualHttpStatus}/${expectedHttpStatus}`
      : `${actualHttpStatus}`
    : "--";

  const httpStatusColor = !actualHttpStatus
    ? "black"
    : expectedHttpStatus !== undefined && Number(actualHttpStatus) !== Number(expectedHttpStatus)
      ? "red"
      : service.status === 'running'
        ? "green"
        : "yellow";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isSsh ? (
          <>
            <MetricCard 
              label="CPU Usage" 
              value={`${service.metrics?.cpu || 0}%`} 
              color={service.metrics?.cpu > 80 ? 'red' : 'green'}
            />
            <MetricCard 
              label="Memory Usage" 
              value={`${service.metrics?.ram || 0}%`} 
              color={service.metrics?.ram > 80 ? 'red' : 'green'}
            />
            <MetricCard 
              label="Disk Usage" 
              value={`${service.metrics?.disk || 0}%`} 
              color={service.metrics?.disk > 90 ? 'red' : 'green'}
            />
            <MetricCard 
              label="Status" 
              value={service.status === 'running' ? 'ALIVE' : 'DOWN'} 
              color={service.status === 'running' ? 'green' : 'red'}
            />
          </>
        ) : (
          <>
            <MetricCard 
              label="Response Time" 
              value={`${service.metrics?.latency || 0}ms`} 
              subValue={`Avg: ${avgLatency}ms`}
              color={service.status === 'running' ? 'green' : 'red'}
            />
            <MetricCard 
              label="HTTP Status"
              value={httpStatusSummary}
              subValue={expectedHttpStatus !== undefined ? 'actual/expected' : undefined}
              color={httpStatusColor}
            />
            <MetricCard 
              label="Uptime (24h)" 
              value={uptimeStats ? `${uptimeStats.uptime24h.toFixed(2)}%` : "--"} 
              color="green"
            />
            <MetricCard 
              label="Certificate" 
              value={sslStatus} 
              subValue={service.details?.sslExp ? new Date(service.details.sslExp).toLocaleDateString() : undefined}
              color={sslColor}
            />
          </>
        )}
      </div>

      <div className="bg-white dark:bg-black border-2 border-black dark:border-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
        <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-40 dark:text-white/40">Uptime (Last 60 Checks)</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-green-500">100% stable</span>
        </div>
        <UptimeBar history={history.map(h => ({ timestamp: h.timestamp, status: h.data.status }))} />
      </div>

      <div className="bg-white dark:bg-black border-2 border-black dark:border-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
        <div className="flex justify-between items-center mb-6">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-40 dark:text-white/40">{isSsh ? 'CPU Usage History' : 'Response Time Graph'}</span>
            <span className="bg-black dark:bg-white text-white dark:text-black text-[10px] font-black px-2 py-1 uppercase tracking-widest">Live</span>
        </div>
        <MetricGraph 
          data={isSsh ? history.map(h => h.data?.metrics?.cpu || 0) : latencyHistory} 
          max={isSsh ? 100 : Math.max(...latencyHistory, 1000)} 
          unit={isSsh ? "%" : "ms"} 
          height={120}
          color="currentColor"
        />
      </div>

      {service.details?.advancedSsl && service.details?.sslExp && (
        <div className="bg-white dark:bg-black border-2 border-black dark:border-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
          <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-40 dark:text-white/40">Advanced SSL Details</span>
              <span className="bg-green-500 text-white text-[10px] font-black px-2 py-1 uppercase tracking-widest">Active</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-[8px] font-black uppercase tracking-widest opacity-30 dark:text-white/30">Issuer / Organization</p>
              <p className="text-xs font-bold uppercase tracking-tight truncate dark:text-white">{service.details.sslIssuer || 'Unknown'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[8px] font-black uppercase tracking-widest opacity-30 dark:text-white/30">Subject (CN)</p>
              <p className="text-xs font-bold uppercase tracking-tight truncate dark:text-white">{service.details.sslSubject || 'Unknown'}</p>
            </div>
            {service.details.sslEmail && (
              <div className="space-y-1">
                <p className="text-[8px] font-black uppercase tracking-widest opacity-30 dark:text-white/30">Registrar Email</p>
                <p className="text-xs font-bold uppercase tracking-tight truncate dark:text-white">{service.details.sslEmail}</p>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-[8px] font-black uppercase tracking-widest opacity-30 dark:text-white/30">Security</p>
              <p className="text-xs font-bold uppercase tracking-tight dark:text-white">{service.details.sslProtocol || 'TLS'} ({service.details.sslBits || '0'} bits)</p>
            </div>
            <div className="space-y-1">
              <p className="text-[8px] font-black uppercase tracking-widest opacity-30 dark:text-white/30">Issued On</p>
              <p className="text-xs font-bold uppercase tracking-tight dark:text-white">{service.details.sslIssuedAt ? new Date(service.details.sslIssuedAt).toLocaleDateString() : 'Unknown'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[8px] font-black uppercase tracking-widest opacity-30 dark:text-white/30">Expires On</p>
              <p className="text-xs font-bold uppercase tracking-tight text-red-600 dark:text-red-400">{new Date(service.details.sslExp).toLocaleDateString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[8px] font-black uppercase tracking-widest opacity-30 dark:text-white/30">Days Remaining</p>
              <p className="text-xs font-bold uppercase tracking-tight dark:text-white">{service.details.sslDays} Days</p>
            </div>
          </div>
        </div>
      )}

      {showRecentHistory && (
        <div className="bg-white dark:bg-black border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] overflow-hidden">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full px-6 py-4 border-b-2 border-black dark:border-white flex justify-between items-center bg-black dark:bg-white hover:bg-zinc-900 dark:hover:bg-zinc-100 transition-colors"
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-white dark:text-black">Recent History</span>
            <ChevronDown className={`w-4 h-4 text-white dark:text-black transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
          
          {isExpanded && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b-2 border-black dark:border-white text-[10px] font-black uppercase tracking-widest bg-gray-50 dark:bg-zinc-900">
                    <th className="px-6 py-3 dark:text-white">Status</th>
                    <th className="px-6 py-3 dark:text-white">Time</th>
                    <th className="px-6 py-3 dark:text-white">Latency</th>
                    <th className="px-6 py-3 dark:text-white">Message</th>
                  </tr>
                </thead>
                <tbody className="text-[10px] font-bold uppercase tracking-widest">
                  {history.slice().reverse().slice(0, 5).map((h, i) => (
                    <tr key={i} className="border-b border-black/5 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 border border-black dark:border-white ${
                          h.data.status === 'running' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                        }`}>
                          {h.data.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 opacity-50 dark:text-white">{new Date(h.timestamp).toLocaleString()}</td>
                      <td className="px-6 py-4 dark:text-white">{h.data.metrics?.latency || '--'}ms</td>
                      <td className="px-6 py-4 truncate max-w-[200px] dark:text-white">{h.data.details?.statusCode ? `${h.data.details.statusCode}${h.data.details?.statusText ? ` ${h.data.details.statusText}` : ''}` : h.data.details?.error || 'OK'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
