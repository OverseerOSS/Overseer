"use client";

import { ExtensionCardProps } from "../types";
import { MetricsDisplay } from "./components/MetricsDisplay";
import { DetailsGrid } from "./components/DetailsGrid";

export default function DokployCard({ service }: ExtensionCardProps) {
  const details = service.details || {};
  const metrics = details.metrics;

  return (
    <div className="flex flex-col gap-4 py-2">
      {/* Configuration and Service Info */}
      <DetailsGrid details={details} type={service.type} />

      {/* Resource Usage Metrics */}
      {details.showNetwork !== false && metrics && (
        <MetricsDisplay metrics={metrics} />
      )}

      {/* Footer info */}
      <div className="flex items-center justify-between text-[11px] text-black pt-3 border-t border-gray-200">
        <div className="flex items-center gap-2">
           <span className="font-black uppercase tracking-tight">ID:</span>
           <span className="font-mono font-bold">{service.id?.substring(0, 12)}...</span>
        </div>
        {service.startTime && (
          <div className="flex items-center gap-1.5 border-l border-gray-200 ml-2 pl-2">
            <span className="font-black uppercase tracking-tight">Started:</span>
            <span className="font-bold">{new Date(service.startTime).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
