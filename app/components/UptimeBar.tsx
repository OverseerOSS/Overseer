'use client';

interface UptimeBarProps {
  history: { timestamp: string; status: 'running' | 'degraded' | 'error' }[];
  limit?: number;
}

export default function UptimeBar({ history, limit = 60 }: UptimeBarProps) {
  // Fill with placeholders if history is short
  const paddedHistory = [...Array(limit)].map((_, i) => {
    const dataIndex = history.length - limit + i;
    return dataIndex >= 0 ? history[dataIndex] : null;
  });

  return (
    <div className="flex gap-1 h-8 w-full">
      {paddedHistory.map((item, i) => (
        <div
          key={i}
          className={`flex-1 rounded-sm border-[1px] border-black/10 transition-all hover:scale-110 cursor-help ${
            !item 
              ? 'bg-gray-100 opacity-20' 
              : item.status === 'running' 
                ? 'bg-green-500 shadow-[1px_1px_0px_0px_rgba(0,0,0,0.2)]' 
                : item.status === 'degraded' 
                  ? 'bg-yellow-500' 
                  : 'bg-red-500'
          }`}
          title={item ? `${new Date(item.timestamp).toLocaleString()}: ${item.status.toUpperCase()}` : 'No data'}
        />
      ))}
    </div>
  );
}
