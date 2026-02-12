"use client";

interface MetricProps {
  label: string;
  value: string;
  change: number;
}

function MetricCard({ label, value, change }: MetricProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white">
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 mb-3">{label}</div>
      <div className="text-3xl font-bold text-black mb-2 tracking-tighter">{value}</div>
      <div className={`flex items-center gap-1.5 px-2 py-0.5 border border-black text-[9px] font-black uppercase tracking-widest shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${change >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 bg-white border-2 border-black mb-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:divide-x-2 divide-y-2 sm:divide-y-0 divide-black">
      <MetricCard label="P50" value={p50} change={changes.p50} />
      <MetricCard label="P75" value={p75} change={changes.p75} />
      <MetricCard label="P90" value={p90} change={changes.p90} />
      <MetricCard label="P95" value={p95} change={changes.p95} />
      <MetricCard label="P99" value={p99} change={changes.p99} />
    </div>
  );
}
