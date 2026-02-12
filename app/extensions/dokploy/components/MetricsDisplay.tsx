"use client";

import { ArrowDownIcon, ArrowUpIcon, Cpu, HardDrive } from "lucide-react";

interface MetricsDisplayProps {
  metrics: {
    cpu?: number;
    memory?: {
      used: number;
      total: number;
      percent: number;
    };
    network?: {
      input: number;
      output: number;
    };
  };
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function MetricsDisplay({ metrics }: MetricsDisplayProps) {
  return (
    <div className="space-y-4 mt-5">
      {/* CPU and RAM */}
      <div className="grid grid-cols-2 gap-4">
        {metrics.cpu !== undefined && (
          <div className="bg-white p-3 border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-2 text-black text-[10px] font-black uppercase tracking-[0.1em] mb-1.5">
              <Cpu className="w-3.5 h-3.5" />
              <span>CPU Usage</span>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-[15px] font-black text-black">
                {metrics.cpu.toFixed(1)}%
              </span>
              <div className="w-16 h-2 bg-gray-200 overflow-hidden mb-1 ring-1 ring-black">
                <div 
                  className={`h-full transition-all duration-500 ${
                    metrics.cpu > 80 ? 'bg-red-600' : metrics.cpu > 50 ? 'bg-amber-500' : 'bg-black'
                  }`}
                  style={{ width: `${Math.min(metrics.cpu, 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {metrics.memory && (
          <div className="bg-white p-3 border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-2 text-black text-[10px] font-black uppercase tracking-[0.1em] mb-1.5">
              <HardDrive className="w-3.5 h-3.5" />
              <span>Memory</span>
            </div>
            <div className="flex items-end justify-between">
              <div className="flex flex-col">
                <span className="text-[15px] font-black text-black">
                  {metrics.memory.percent.toFixed(1)}%
                </span>
                <span className="text-[10px] font-bold text-black">
                  {formatBytes(metrics.memory.used)} / {formatBytes(metrics.memory.total)}
                </span>
              </div>
              <div className="w-16 h-2 bg-gray-200 overflow-hidden mb-1 ring-1 ring-black">
                <div 
                  className={`h-full transition-all duration-500 ${
                    metrics.memory.percent > 90 ? 'bg-red-600' : metrics.memory.percent > 70 ? 'bg-amber-500' : 'bg-black'
                  }`}
                  style={{ width: `${Math.min(metrics.memory.percent, 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Network */}
      {metrics.network && (
        <div className="bg-white p-3.5 border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <div className="text-[10px] font-black text-black uppercase tracking-[0.12em] mb-3">Network Traffic</div>
          <div className="grid grid-cols-2 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-black/5 flex items-center justify-center border border-black">
                <ArrowDownIcon className="w-4 h-4 text-black" />
              </div>
              <div className="flex flex-col">
                 <span className="text-[10px] text-black font-black uppercase tracking-widest">Inbound</span>
                 <span className="font-mono text-[13px] font-black text-black">{formatBytes(metrics.network.input)}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-black/5 flex items-center justify-center border border-black">
                <ArrowUpIcon className="w-4 h-4 text-black" />
              </div>
              <div className="flex flex-col">
                 <span className="text-[10px] text-black font-black uppercase tracking-widest">Outbound</span>
                 <span className="font-mono text-[13px] font-black text-black">{formatBytes(metrics.network.output)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
