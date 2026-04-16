'use client';

import { useState, useEffect } from 'react';
import ControlPanel from '@/components/dashboard/ControlPanel';
import dynamic from 'next/dynamic';
const LiveMap = dynamic(() => import('@/components/dashboard/LiveMap'), { ssr: false });
import PerformanceChart from '@/components/dashboard/PerformanceChart';
import ScenarioUploader from '@/components/dashboard/ScenarioUploader';
import HealthMonitor from '@/components/dashboard/HealthMonitor';
import { Activity, Database, Server } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ControlCenterPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiLatency, setApiLatency] = useState<number | null>(null);
  const [recentLogs, setRecentLogs] = useState<string[]>([]);
  const [simConfig, setSimConfig] = useState({
    activeNodes: 150,
    activeCampaigns: 5,
    anomalyRate: 0.02,
    telemetryFrequency: 30,
    radiusKm: 12,
    minSpeed: 15,
    maxSpeed: 60,
    centerLat: 19.4517,
    centerLng: -70.6970
  });

  useEffect(() => {
    // Poll state every 2 seconds
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/simulation/state');
        const json = await res.json();
        if (json.success) {
          setIsRunning(json.data.isRunning);
          if (json.data.apiLatency !== undefined && json.data.apiLatency > 0) {
            setApiLatency(json.data.apiLatency);
          }
          if (json.data.config) {
            setSimConfig(prev => ({ ...prev, ...json.data.config }));
          }
          if (json.data.recentLogs) {
            setRecentLogs(json.data.recentLogs);
          }
        }
      } catch (e) {
        console.error('Failed to fetch state', e);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Update config on server whenever a slider changes and we're running
  const updateConfigLive = async (newConfig: any) => {
    if (!isRunning) return;
    try {
      await fetch('/api/simulation/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: newConfig })
      });
    } catch (e) {
      console.error('Failed to update config live');
    }
  };

  const toggleSimulation = async () => {
    setLoading(true);
    try {
      const endpoint = isRunning ? '/api/simulation/stop' : '/api/simulation/start';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: isRunning ? undefined : JSON.stringify({ config: simConfig })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setIsRunning(!isRunning);
      } else {
        toast.error(data.error || 'Failed to toggle simulation');
      }
    } catch (e) {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            TAD Simulator Control Center
          </h1>
          <p className="text-tad-text-muted mt-1 flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              {isRunning && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tad-accent opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isRunning ? 'bg-tad-accent' : 'bg-gray-500'}`}></span>
            </span>
            {isRunning ? 'Simulation Engine ACTIVE' : 'Engine Idle'}
          </p>
        </div>
        
        <div className="flex gap-4">
          <div className="glass-panel px-4 py-2 flex items-center gap-3">
            <Server className="w-5 h-5 text-tad-accent" />
            <div className="text-sm">
              <p className="text-gray-400 text-xs">tad-api Status</p>
              <p className="font-medium text-green-400">ONLINE</p>
            </div>
          </div>
          <div className="glass-panel px-4 py-2 flex items-center gap-3">
            <Database className="w-5 h-5 text-tad-accent" />
            <div className="text-sm">
              <p className="text-gray-400 text-xs">Prisma Bottleneck</p>
              <p className="font-medium text-green-400">SECURE</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Controls */}
        <div className="space-y-6 lg:col-span-1 border-r border-white/5 pr-0 lg:pr-6">
          <ControlPanel 
            isRunning={isRunning} 
            loading={loading}
            toggleSimulation={toggleSimulation} 
            config={simConfig}
            setConfig={(newConfig) => {
               setSimConfig(newConfig);
               if (typeof newConfig === 'function') {
                  // If it's a functional update, we can't easily sync here, 
                  // but usually it's used with small objects in this app.
               } else {
                  updateConfigLive(newConfig);
               }
            }}
          />
          
          {/* Real-time Activity Logs */}
          <div className="glass-panel p-5 border border-white/10 min-h-[300px] flex flex-col">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
               <Activity className="w-5 h-5 text-tad-accent animate-pulse" />
               Real-time Event Stream
            </h2>
            <div className="flex-1 overflow-y-auto space-y-2 font-mono text-[11px]">
               {recentLogs.length === 0 ? (
                  <p className="text-gray-600 italic">Awaiting events...</p>
               ) : (
                  recentLogs.map((log, i) => (
                     <div key={i} className={`pb-1 border-b border-white/5 ${i === 0 ? 'text-tad-accent font-bold' : 'text-gray-400 opacity-80'}`}>
                        {log}
                     </div>
                  ))
               )}
            </div>
          </div>
        </div>

        {/* Right Column - Visuals */}
        <div className="space-y-6 lg:col-span-2">
          {/* Map Section */}
          <div className="glass-panel p-1 border border-white/10 overflow-hidden relative">
            <div className="px-5 py-4 border-b border-white/10 flex justify-between items-center bg-black/20">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-tad-accent" />
                Fleet Telemetry Live View
              </h2>
              {isRunning && (
                <span className="text-xs px-2 py-1 bg-tad-accent/20 text-tad-accent rounded-full border border-tad-accent/30 heartbeat">
                  Live Socket
                </span>
              )}
            </div>
            <div className="h-[400px] w-full bg-[#050505] relative isolation-auto">
               <LiveMap isRunning={isRunning} driverCount={simConfig.activeNodes} />
            </div>
          </div>

          {/* Health & SRE Metrics */}
          <HealthMonitor />

          {/* Performance Chart Section */}
          <div className="glass-panel p-5 border border-white/10">
            <h2 className="font-semibold text-lg mb-4">API Latency & Bottleneck Analysis</h2>
            <div className="h-[250px] w-full">
              <PerformanceChart isRunning={isRunning} externalLatency={apiLatency} />
            </div>
          </div>
        </div>
        
      </div>
    </main>
  );
}
