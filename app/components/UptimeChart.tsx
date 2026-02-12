"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface UptimeChartProps {
  data: Array<{
    time: string;
    success: number;
    error?: number;
    degraded?: number;
  }>;
}

export function UptimeChart({ data }: UptimeChartProps) {
  return (
    <div className="bg-white border-2 border-black p-8 mb-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-bold text-black uppercase tracking-tighter">Uptime</h3>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Success</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-rose-500 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Error</span>
          </div>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} barGap={0}>
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
            domain={[0, 100]}
          />
          <Tooltip 
            cursor={{ fill: 'transparent' }}
            contentStyle={{ backgroundColor: '#fff', border: '2px solid #000', borderRadius: '0px', boxShadow: '2px 2px 0px 0px rgba(0,0,0,1)' }}
            labelStyle={{ color: '#000', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase', fontSize: '10px' }}
            itemStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', padding: '0' }}
          />
          <Bar dataKey="success" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} barSize={20} />
          <Bar dataKey="error" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
