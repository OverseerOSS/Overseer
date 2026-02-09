"use client";

import { ExtensionCardProps } from "../extensions/types";

export function GenericMonitorCard({ service }: ExtensionCardProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {service.details && (
        <div className="col-span-full">
          <div className="text-xs text-gray-400 space-y-1 bg-gray-50 dark:bg-zinc-900 p-2 rounded">
            {Object.entries(service.details).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span>{k}:</span>
                <span>{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
