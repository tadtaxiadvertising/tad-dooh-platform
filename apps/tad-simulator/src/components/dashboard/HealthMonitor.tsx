
'use client';

import { useEffect, useState } from 'react';
import { Cpu, Maximize, Activity, Thermometer } from 'lucide-react';

interface Metrics {
  cpu: number;
  ram: number;
  heap: number;
  activeThreads: number;
  totalDrivers: number;
  timestamp: string;
}

export default function HealthMonitor() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/simulation/metrics');
        const data = await res.json();
        if (data.success) setMetrics(data.metrics);
      } catch (e) {
        console.error('Failed to fetch metrics');
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 15000); // 15s refresh (reduced from 3s)
    return () => clearInterval(interval);
  }, []);

  if (!metrics) return null;

  // RAM Usage Percentage for 768MB limit
  const ramLimit = 768;
  const ramPercent = Math.min((metrics.ram / ramLimit) * 100, 100);

  return (
    <div className="glass-panel p-5 mt-6">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-emerald-400" />
        <h2 className="font-semibold text-lg text-white">SRE Resource Monitor</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* RAM Usage */}
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="flex justify-between items-center mb-1">
             <span className="text-xs text-gray-400">RAM (RSS)</span>
             <Maximize className="w-3 h-3 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono">
            {metrics.ram} <span className="text-xs text-gray-500">MB</span>
          </div>
          <div className="w-full bg-white/10 h-1 rounded-full mt-2 overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ${ramPercent > 90 ? 'bg-red-500' : 'bg-emerald-500'}`}
              style={{ width: `${ramPercent}%` }}
            />
          </div>
        </div>

        {/* CPU Activity */}
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="flex justify-between items-center mb-1">
             <span className="text-xs text-gray-400">CPU Usage</span>
             <Cpu className="w-3 h-3 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono">
            {metrics.cpu} <span className="text-xs text-gray-500">ms/s</span>
          </div>
        </div>

        {/* Active Threads */}
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="flex justify-between items-center mb-1">
             <span className="text-xs text-gray-400">Worker Pool</span>
             <Activity className="w-3 h-3 text-purple-400" />
          </div>
          <div className="text-xl font-bold font-mono">
            {metrics.activeThreads} <span className="text-xs text-gray-500">Threads</span>
          </div>
        </div>

        {/* Target Density */}
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="flex justify-between items-center mb-1">
             <span className="text-xs text-gray-400">Simulation Load</span>
             <Thermometer className="w-3 h-3 text-orange-400" />
          </div>
          <div className="text-xl font-bold font-mono">
            {metrics.totalDrivers} <span className="text-xs text-gray-500">Units</span>
          </div>
        </div>
      </div>
      
      <div className="mt-4 flex justify-between items-center">
        <div className="text-[10px] text-gray-500 font-mono">
          ENDPOINT: /api/simulation/metrics • LIMIT: 768.00MB
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-emerald-500 font-bold tracking-widest uppercase">Live Stream</span>
        </div>
      </div>
    </div>
  );
}
