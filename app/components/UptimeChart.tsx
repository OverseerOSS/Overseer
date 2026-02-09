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
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Uptime</h3>
      <p className="text-sm text-gray-600 mb-6">Uptime across all the selected regions</p>
      
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '12px' }} />
          <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }}
            labelStyle={{ color: '#111827' }}
          />
          <Legend />
          <Bar dataKey="success" fill="#10b981" radius={[4, 4, 0, 0]} />
          {data[0]?.error !== undefined && <Bar dataKey="error" fill="#ef4444" radius={[4, 4, 0, 0]} />}
          {data[0]?.degraded !== undefined && <Bar dataKey="degraded" fill="#8b5cf6" radius={[4, 4, 0, 0]} />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
