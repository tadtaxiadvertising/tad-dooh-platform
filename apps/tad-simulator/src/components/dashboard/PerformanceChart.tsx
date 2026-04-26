'use client';

import { useEffect, useState } from 'react';

interface DataPoint {
  time: number;
  latencyMs: number;
}

export default function PerformanceChart({ isRunning, externalLatency }: { isRunning: boolean, externalLatency: number | null }) {
  const [data, setData] = useState<DataPoint[]>([]);

  useEffect(() => {
    if (!isRunning) return;

    let localTime = 0;
    const interval = setInterval(() => {
      setData(prev => {
        const newData = [...prev, {
          time: localTime,
          // Use real latency if provided, otherwise mock it with a base and random noise
          latencyMs: externalLatency !== null ? externalLatency + Math.floor(Math.random() * 20 - 10) : Math.floor(Math.random() * 120) + 40
        }];
        // Keep only last 30 points
        if (newData.length > 30) newData.shift();
        return newData;
      });
      localTime++;
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, externalLatency]);

  // SVG dimensions
  const width = 600;
  const height = 200;
  const maxLatency = 300; // Expected max for Y axis mapping

  // Generate SVG path for a line chart
  const points = data.map((d, i) => {
    const x = (i / 30) * width;
    const y = height - (Math.min(d.latencyMs, maxLatency) / maxLatency) * height;
    return `${x},${y}`;
  }).join(' ');

  const currentLatency = data.length > 0 ? data[data.length - 1].latencyMs : 0;
  const isBottleneck = currentLatency > 200;

  return (
    <div className="w-full h-full relative font-mono flex flex-col">
       <div className="flex justify-between items-end mb-4">
          <div className="text-sm text-gray-400">
             Prisma Insert Latency
          </div>
          <div className={`text-2xl font-bold flex items-center gap-2 ${isBottleneck ? 'text-red-500' : 'text-green-400'}`}>
             {currentLatency}ms
             {isBottleneck && <span className="text-xs bg-red-500/20 text-red-500 px-2 py-1 rounded animate-pulse">Cuello de Botella Detectado</span>}
          </div>
       </div>

       <div className="flex-1 relative border-b border-l border-white/10 w-full overflow-hidden">
          {/* 200ms Warning Line */}
          <div 
             className="absolute w-full border-t border-red-500/30 border-dashed"
             style={{ bottom: `${(200 / maxLatency) * 100}%` }}
          >
             <span className="absolute -top-4 right-0 text-[10px] text-red-400/50">200ms</span>
          </div>

          {!isRunning && data.length === 0 ? (
             <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">Waiting for Engine...</div>
          ) : (
            <svg width="100%" height="100%" preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`}>
              {/* Gradient Fill under the line */}
              <defs>
                 <linearGradient id="latencyGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#FFD400" stopOpacity="0.5"/>
                    <stop offset="100%" stopColor="#FFD400" stopOpacity="0.0"/>
                 </linearGradient>
              </defs>
              {points.length > 0 && (
                <>
                  <polygon 
                    points={`0,${height} ${points} ${width},${height}`} 
                    fill="url(#latencyGradient)"
                  />
                  <polyline
                    fill="none"
                    stroke={isBottleneck ? '#ef4444' : '#FFD400'}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={points}
                    className="transition-colors duration-300"
                  />
                </>
              )}
            </svg>
          )}
       </div>
       <div className="flex justify-between mt-1 text-[10px] text-gray-500">
          <span>T-30s</span>
          <span>Live</span>
       </div>
    </div>
  );
}
