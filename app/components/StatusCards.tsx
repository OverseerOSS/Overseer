"use client";

interface StatusCardsProps {
  lastChecked: string;
}

export function StatusCards({
  lastChecked,
}: StatusCardsProps) {
  return (
    <div className="bg-white dark:bg-black border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] mb-12">
      <div className="p-6 md:p-8 bg-amber-50 dark:bg-amber-950/20">
        <div className="text-amber-900/40 dark:text-amber-200/40 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
          Last Checked
        </div>
        <div className="text-xl font-bold text-amber-700 dark:text-amber-400 tracking-tighter uppercase mt-2">{lastChecked}</div>
      </div>
    </div>
  );
}
