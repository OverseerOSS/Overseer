"use client";

import { ExtensionCardProps } from "../types";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default function DokployCard({ service }: ExtensionCardProps) {
  const isRunning = service.status === "running";
  const details = service.details || {};
  const metrics = details.metrics?.network;

  return (
    <div className="grid grid-cols-2 gap-4 text-sm">
      <div className="col-span-2 md:col-span-1 space-y-2">
        {details.showProject !== false && (
          <div>
             <div className="text-gray-500 text-xs">Project</div>
             <div className="font-medium">{details.projectName || '-'}</div>
          </div>
        )}
        {details.showEnvironment !== false && (
          <div>
             <div className="text-gray-500 text-xs">Environment</div>
             <div className="font-medium">{details.envName || '-'}</div>
          </div>
        )}
      </div>
      
      <div className="col-span-2 md:col-span-1 space-y-2">
         {details.showType !== false && (
           <div>
              <div className="text-gray-500 text-xs">Type</div>
              <div className="font-medium capitalize">{service.type}</div>
           </div>
         )}
         
         {details.showImage !== false && details.image && (
             <div>
                <div className="text-gray-500 text-xs">Image</div>
                <div className="font-mono text-xs truncate" title={details.image}>
                    {details.image}
                </div>
            </div>
         )}
         
         {details.showPort !== false && details.port && (
             <div>
                <div className="text-gray-500 text-xs">Port</div>
                <div className="font-mono">{details.port}</div>
             </div>
         )}
      </div>

       {details.showNetwork !== false && metrics && (
        <div className="col-span-2 bg-zinc-50 dark:bg-zinc-900/50 rounded-md p-2 mt-2">
          <div className="text-xs font-medium text-gray-500 mb-2">Network Traffic (Total)</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <ArrowDownIcon className="w-3 h-3 text-emerald-500" />
              <div className="flex flex-col">
                 <span className="text-[10px] text-gray-400">Inbound</span>
                 <span className="font-mono text-xs">{formatBytes(metrics.input)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpIcon className="w-3 h-3 text-blue-500" />
              <div className="flex flex-col">
                 <span className="text-[10px] text-gray-400">Outbound</span>
                 <span className="font-mono text-xs">{formatBytes(metrics.output)}</span>
              </div>
            </div>
          </div>
        </div>
       )}

       <div className="col-span-2 mt-2 pt-2 border-t border-gray-100 dark:border-zinc-800 flex justify-between items-center">
            <span className="text-xs text-gray-400">ID: {service.id}</span>
            {service.startTime && (
                 <span className="text-xs text-gray-400">
                    Started: {new Date(service.startTime).toLocaleDateString()}
                 </span>
            )}
       </div>
    </div>
  );
}
