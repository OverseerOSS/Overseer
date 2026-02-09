"use client";

interface MetricProps {
  label: string;
  value: string;
  change: number;
}

function MetricCard({ label, value, change }: MetricProps) {
  return (
    <div className="text-center">
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      <div className={`text-xs font-semibold ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
        {change >= 0 ? "↑" : "↓"} {Math.abs(change)}%
      </div>
    </div>
  );
}

interface MetricsGridProps {
  p50: string;
  p75: string;
  p90: string;
  p95: string;
  p99: string;
  changes: { p50: number; p75: number; p90: number; p95: number; p99: number };
}

export function MetricsGrid({ p50, p75, p90, p95, p99, changes }: MetricsGridProps) {
  return (
    <div className="grid grid-cols-5 gap-6 mb-12 py-6 px-6 bg-white rounded-lg border border-gray-200">
      <MetricCard label="P50" value={p50} change={changes.p50} />
      <MetricCard label="P75" value={p75} change={changes.p75} />
      <MetricCard label="P90" value={p90} change={changes.p90} />
      <MetricCard label="P95" value={p95} change={changes.p95} />
      <MetricCard label="P99" value={p99} change={changes.p99} />
    </div>
  );
}
