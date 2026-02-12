"use client";

import { ExtensionCardProps } from "../extensions/types";

export function GenericMonitorCard({ service }: ExtensionCardProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {service.details && (
        <div className="col-span-full">
          <div className="text-[10px] text-black font-black uppercase space-y-2 bg-white p-3 border-2 border-black">
            {Object.entries(service.details).map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-black/10 last:border-0 pb-1">
                <span className="opacity-50 tracking-widest">{k}:</span>
                <span className="tracking-tighter">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
