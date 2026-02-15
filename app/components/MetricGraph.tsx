"use client";

import { useMemo, memo, useEffect, useState } from "react";

interface MetricGraphProps {
  data: number[];
  color?: string;
  min?: number; 
  max?: number; 
  label?: string;
  unit?: string;
  height?: string | number;
}

export const MetricGraph = memo(function MetricGraph({
  data,
  color = "#000000",
  min = 0,
  max = 100,
  label,
  unit = "%",
  height = 80,
}: MetricGraphProps) {
  const viewBoxWidth = 1000;
  const viewBoxHeight = 100;
  const maxPoints = 100;

  // Use a fixed length for internal data to prevent "stretching"
  const normalizedData = useMemo(() => {
    const fixed = new Array(maxPoints).fill(null);
    const len = Math.min(data.length, maxPoints);
    const startIdx = maxPoints - len;
    const dataStart = data.length - len;
    
    for (let i = 0; i < len; i++) {
        fixed[startIdx + i] = data[dataStart + i];
    }
    return fixed;
  }, [data]);

  const points = useMemo(() => {
    const step = viewBoxWidth / (maxPoints - 1);
    
    let pathString = "";
    let first = true;
    normalizedData.forEach((val, i) => {
      if (val === null) return;
      
      const x = i * step;
      const clamped = Math.max(min, Math.min(max, val));
      const range = max - min || 1; 
      const pct = (clamped - min) / range;
      const y = viewBoxHeight - (pct * viewBoxHeight);
      
      if (first) {
        pathString = `M ${x},${y}`;
        first = false;
      } else {
        pathString += ` L ${x},${y}`;
      }
    });
    return pathString;
  }, [normalizedData, min, max]);

  const fillPoints = useMemo(() => {
    if (!points) return "";
    
    // Find first valid x
    let firstX = 0;
    for (let i = 0; i < normalizedData.length; i++) {
        if (normalizedData[i] !== null) {
            firstX = i * (viewBoxWidth / (maxPoints - 1));
            break;
        }
    }
    return `${points} L ${viewBoxWidth},${viewBoxHeight} L ${firstX},${viewBoxHeight} Z`;
  }, [points, normalizedData]);

  const latestValue = useMemo(() => 
    data.length > 0 ? data[data.length - 1] : 0,
    [data]
  );

  const formattedValue = useMemo(() => {
    if (typeof latestValue !== 'number') return '0.0';
    if (unit === 'B/s' && latestValue > 1024) {
      return (latestValue / 1024).toFixed(1);
    }
    return latestValue.toFixed(1);
  }, [latestValue, unit]);

  const displayUnit = useMemo(() => {
    if (unit === 'B/s' && latestValue > 1024) return 'KB/s';
    return unit;
  }, [latestValue, unit]);

  return (
    <div className="flex flex-col w-full bg-white dark:bg-black border-2 border-black dark:border-white p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
      <div className="flex items-center justify-between mb-4">
         <span className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40 dark:text-white/40">{label}</span>
         <div className="text-right">
            <span className="text-xl font-bold text-black dark:text-white tracking-tighter">
              {formattedValue}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 ml-1">
              {displayUnit}
            </span>
         </div>
      </div>

      <div className="relative w-full" style={{ height }}>
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          className="overflow-visible"
        >
          {/* Grid lines */}
          {[0, 50, 100].map(val => {
            const y = viewBoxHeight - ((val - min) / (max - min) * viewBoxHeight);
            return (
              <line 
                key={val}
                x1="0" y1={y} x2={viewBoxWidth} y2={y}
                stroke="#000" strokeWidth="1" strokeDasharray="4,4" strokeOpacity="0.05"
              />
            );
          })}

          {points && (
            <>
              <path
                d={fillPoints}
                fill={color}
                fillOpacity="0.1"
                className="transition-all duration-1000 ease-linear"
              />
              <path
                d={points}
                stroke={color}
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-1000 ease-linear"
              />
            </>
          )}
        </svg>
      </div>
    </div>
  );
});
