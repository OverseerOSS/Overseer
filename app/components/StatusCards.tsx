"use client";

interface StatusCardsProps {
  uptime: number;
  degraded: number;
  failing: number;
  requests: number;
  lastChecked: string;
}

export function StatusCards({
  uptime,
  degraded,
  failing,
  requests,
  lastChecked,
}: StatusCardsProps) {
  return (
    <div className="grid grid-cols-5 gap-4 mb-8">
      {/* Uptime */}
      <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4">
        <div className="text-green-600 text-xs font-semibold uppercase tracking-wide mb-2">
          Uptime
        </div>
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-bold text-green-700">{uptime.toFixed(2)}%</div>
          <div className="text-xs text-green-600">0%</div>
        </div>
      </div>

      {/* Degraded */}
      <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-4">
        <div className="text-amber-600 text-xs font-semibold uppercase tracking-wide mb-2">
          Degraded
        </div>
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-bold text-amber-700">{degraded}</div>
          <div className="text-xs text-amber-600">0%</div>
        </div>
      </div>

      {/* Failing */}
      <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
        <div className="text-red-600 text-xs font-semibold uppercase tracking-wide mb-2">
          Failing
        </div>
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-bold text-red-700">{failing}</div>
          <div className="text-xs text-red-600">0%</div>
        </div>
      </div>

      {/* Requests */}
      <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
        <div className="text-gray-600 text-xs font-semibold uppercase tracking-wide mb-2">
          Requests
        </div>
        <div className="text-2xl font-bold text-gray-900">{requests.toLocaleString()}</div>
      </div>

      {/* Last Checked */}
      <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
        <div className="text-gray-600 text-xs font-semibold uppercase tracking-wide mb-2">
          Last Checked
        </div>
        <div className="text-sm font-semibold text-gray-900">{lastChecked}</div>
      </div>
    </div>
  );
}
