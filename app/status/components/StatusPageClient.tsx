"use client";

import { ServiceStatus } from "@/app/extensions/types";
import { PublicMonitorStatus, StatusPageData } from "../actions";

function StatusBadge({ status }: { status: ServiceStatus }) {
  const colors = {
    running: "bg-green-500",
    stopped: "bg-red-500",
    error: "bg-red-500",
    unknown: "bg-gray-500",
  };

  const labels = {
    running: "Operational",
    stopped: "Stopped",
    error: "Error",
    unknown: "Unknown",
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2.5 h-2.5 rounded-full ${colors[status] || colors.unknown} animate-pulse`} />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {labels[status] || labels.unknown}
      </span>
    </div>
  );
}

export default function StatusPageClient({ data }: { data: StatusPageData }) {
  const { monitors, title, description } = data;

  const totalServices = monitors.reduce((acc, m) => acc + m.services.length, 0);
  const operationalServices = monitors.reduce(
    (acc, m) => acc + m.services.filter(s => s.status === "running").length,
    0
  );
  
  const allOperational = totalServices > 0 && totalServices === operationalServices;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 font-sans">
      {/* Header */}
      <header className="bg-white dark:bg-[#0d1117] border-b border-gray-200 dark:border-[#30363d] py-16">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <h1 className="text-3xl font-bold mb-4 tracking-tight text-gray-900 dark:text-white">{title}</h1>
          {description && <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-lg mx-auto leading-relaxed">{description}</p>}
          
          {monitors.length > 0 && (
            allOperational ? (
              <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20 text-sm font-medium">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
                All Systems Operational
              </div>
            ) : (
              <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-500/20 text-sm font-medium">
                <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2" />
                Some systems are experiencing issues
              </div>
            )
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 max-w-2xl py-12">
        <div className="space-y-6">
          {monitors.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-12 rounded-lg border-2 border-dashed border-gray-200 dark:border-[#30363d]">
              No services monitored on this status page.
            </div>
          ) : (
            monitors.map((monitor) => (
              <div 
                key={monitor.id} 
                className="bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-xl overflow-hidden shadow-sm"
              >
                <div className="px-5 py-3 border-b border-gray-100 dark:border-[#30363d] bg-gray-50/50 dark:bg-[#161b22]/50 flex justify-between items-center backdrop-blur-sm">
                  <h2 className="font-semibold text-gray-900 dark:text-gray-200">{monitor.name}</h2>
                  {/* Status Indicator for the whole Monitor Group could go here if we wanted */}
                </div>
                
                <div className="divide-y divide-gray-100 dark:divide-[#21262d]">
                  {monitor.services.length > 0 ? (
                    monitor.services.map((service, idx) => (
                      <div key={idx} className="px-6 py-4 flex items-center justify-between group">
                        <div className="flex items-center">
                          <div className="mr-4 p-2 rounded-lg bg-gray-100 dark:bg-[#21262d] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[#30363d]">
                             {/* Server Stack Icon */}
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M12 5l7 7-7 7" style={{ display: 'none' }} /> {/* Hide old arrow */}
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                             </svg>
                          </div>
                          <div>
                            <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                              {service.name || "Unknown Service"}
                            </div>
                            {service.type && (
                              <div className="text-[11px] text-gray-500 uppercase tracking-wider">{service.type}</div>
                            )}
                          </div>
                        </div>
                        <StatusBadge status={service.status} />
                      </div>
                    ))
                  ) : (
                    <div className="px-6 py-8 text-center text-gray-500 italic">
                      No service data available.
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
