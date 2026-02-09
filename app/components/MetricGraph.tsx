"use client";

import { useMemo, memo } from "react";

interface MetricGraphProps {
  data: number[];
  color?: string;
  min?: number; // Y-axis min
  max?: number; // Y-axis max
  label?: string;
  unit?: string;
  height?: string | number;
}

export const MetricGraph = memo(function MetricGraph({
  data,
  color = "#22c55e", // default to the green in the image
  min = 0,
  max = 100,
  label,
  unit = "%",
  height = 150, // Taller by default for the detailed view
}: MetricGraphProps) {
  // Graph dimensions in logical units
  const viewBoxWidth = 1000;
  const viewBoxHeight = 100;

  const points = useMemo(() => {
    if (data.length === 0) return "";
    
    // We want to fill the width.
    const step = viewBoxWidth / (Math.max(data.length - 1, 1));
    
    return data
      .map((val, i) => {
        const x = i * step;
        // Clamp value
        const clamped = Math.max(min, Math.min(max, val));
        // Normalize 0-1
        const pct = (clamped - min) / (max - min);
        // Invert Y (SVG 0 is top)
        const y = viewBoxHeight - (pct * viewBoxHeight); 
        return `${x},${y}`;
      })
      .join(" ");
  }, [data, min, max]);

  const latestValue = useMemo(() => 
    data.length > 0 ? data[data.length - 1] : 0,
    [data]
  );

  // Memoize grid lines to avoid recalculating on every render
  const gridLines = useMemo(() => 
    [0, 25, 50, 75, 100].map(val => {
      const pct = (val - min) / (max - min);
      const y = viewBoxHeight - (pct * viewBoxHeight);
      return { val, y };
    }),
    [min, max]
  );

  return (
    <div className="flex flex-col w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-4">
      {/* Header */}
      <div className="flex justify-between items-baseline mb-2">
         <span className="text-gray-400 text-sm font-semibold">{label}</span>
         <span className="text-2xl font-mono text-white">
            {latestValue.toFixed(1)} <span className="text-sm text-gray-500">{unit}</span>
         </span>
      </div>

      {/* Graph Area */}
      <div className="relative w-full" style={{ height }}>
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          className="overflow-visible"
        >
          <defs>
              <linearGradient id={`grad-${label}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
          </defs>

          {/* Grid Lines */}
          {gridLines.map((line) => (
             <g key={line.val}>
                {/* Line */}
                <line 
                  x1="0" 
                  y1={line.y} 
                  x2={viewBoxWidth} 
                  y2={line.y} 
                  stroke="#30363d" 
                  strokeWidth="1" 
                  vectorEffect="non-scaling-stroke"
                />
             </g>
          ))}

          {/* Data Path */}
          {data.length > 1 && (
            <>
                <path
                    d={`M 0,${viewBoxHeight} L ${points} L ${viewBoxWidth},${viewBoxHeight} Z`}
                    fill={`url(#grad-${label})`}
                    stroke="none"
                />
                <polyline
                    points={points}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke" 
                />
            </>
          )}
        </svg>

        {/* Y-Axis Labels Overlay (Absolute positioning for crisp text) */}
        <div className="absolute inset-0 pointer-events-none">
             {gridLines.map(line => (
                 <div 
                    key={line.val}
                    className="absolute left-0 text-[10px] text-gray-600 font-mono -translate-y-1/2 bg-[#0d1117] pr-1"
                    style={{ top: `${(1 - (line.val - min)/(max-min)) * 100}%` }}
                 >
                     {line.val.toFixed(1)} {unit}
                 </div>
             ))}
        </div>
      </div>
    </div>
  );
});
