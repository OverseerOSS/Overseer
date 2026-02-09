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
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Latency</h3>
      <p className="text-sm text-gray-600 mb-6">Response time across all the regions</p>
      
      <p className="text-sm text-gray-700 mb-6">
        The <span className="font-semibold">P50</span> quantile within a <span className="font-semibold">30 minutes</span> resolution
      </p>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorP50" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="colorP95" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#fcd34d" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#fcd34d" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="colorP99" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#fde68a" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#fde68a" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '12px' }} />
          <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }}
            labelStyle={{ color: '#111827' }}
          />
          <Legend />
          <Area type="monotone" dataKey="p99" stroke="#fbbf24" fillOpacity={1} fill="url(#colorP99)" />
          <Area type="monotone" dataKey="p95" stroke="#fcd34d" fillOpacity={1} fill="url(#colorP95)" />
          <Area type="monotone" dataKey="p50" stroke="#fde68a" fillOpacity={1} fill="url(#colorP50)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
