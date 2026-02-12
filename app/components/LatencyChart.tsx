"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface LatencyChartProps {
  data: Array<{
    time: string;
    p50: number;
    p95: number;
    p99: number;
  }>;
}

export function LatencyChart({ data }: LatencyChartProps) {
  return (
    <div className="bg-white border-2 border-black p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-bold text-black uppercase tracking-tighter">Latency</h3>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-black border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]" />
            <span className="text-[10px] font-bold uppercase tracking-widest">P99</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-400 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]" />
            <span className="text-[10px] font-bold uppercase tracking-widest">P95</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-200 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]" />
            <span className="text-[10px] font-bold uppercase tracking-widest">P50</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#000" strokeOpacity={0.1} />
          <XAxis 
            dataKey="time" 
            stroke="#000" 
            axisLine={{ strokeWidth: 2 }}
            tickLine={false}
            tick={{ fontSize: 10, fontWeight: 'bold' }}
            dy={10}
          />
          <YAxis 
            stroke="#000" 
            axisLine={{ strokeWidth: 2 }}
            tickLine={false}
            tick={{ fontSize: 10, fontWeight: 'bold' }}
            dx={-10}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#fff', border: '2px solid #000', borderRadius: '0px', boxShadow: '2px 2px 0px 0px rgba(0,0,0,1)' }}
            labelStyle={{ color: '#000', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase', fontSize: '10px' }}
            itemStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', padding: '0' }}
          />
          <Area type="monotone" dataKey="p99" stroke="#000" strokeWidth={3} fillOpacity={0.1} fill="#000" />
          <Area type="monotone" dataKey="p95" stroke="#666" strokeWidth={2} fillOpacity={0.1} fill="#666" />
          <Area type="monotone" dataKey="p50" stroke="#aaa" strokeWidth={2} fillOpacity={0.1} fill="#aaa" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
