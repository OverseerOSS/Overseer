'use client';

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  color?: string;
}

export default function MetricCard({ label, value, subValue, color = "black" }: MetricCardProps) {
  const colorClass = {
    green: "text-green-500 font-black",
    yellow: "text-yellow-500 font-black",
    red: "text-red-500 font-black",
    black: "text-black dark:text-white"
  }[color] || "text-black dark:text-white";

  return (
    <div className="bg-white dark:bg-black border-2 border-black dark:border-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-center text-center">
      <span className="text-[10px] font-black uppercase tracking-widest opacity-40 dark:text-white/40 mb-1">{label}</span>
      <span className={`text-2xl font-black uppercase tracking-tighter ${colorClass}`}>{value}</span>
      {subValue && <span className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-50 dark:text-white/50">{subValue}</span>}
    </div>
  );
}
