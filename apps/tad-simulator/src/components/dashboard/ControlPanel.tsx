'use client';

import { Play, Square, Settings2, AlertTriangle, Users, Hash, Clock, Database } from 'lucide-react';

interface ConfigDetails {
  activeNodes: number;
  activeCampaigns: number;
  anomalyRate: number;
  telemetryFrequency: number;
  radiusKm: number;
  minSpeed: number;
  maxSpeed: number;
  centerLat: number;
  centerLng: number;
}

interface ControlPanelProps {
  isRunning: boolean;
  loading: boolean;
  toggleSimulation: () => void;
  config: ConfigDetails;
  setConfig: React.Dispatch<React.SetStateAction<ConfigDetails>>;
}

export default function ControlPanel({ isRunning, loading, toggleSimulation, config, setConfig }: ControlPanelProps) {
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: Number(value) }));
  };

  return (
    <div className="glass-panel p-5">
      <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
        <Settings2 className="w-5 h-5 text-tad-accent" />
        <h2 className="font-semibold text-lg">Simulation Parameters</h2>
      </div>

      <div className="space-y-5">
        
        {/* Virtual Drivers */}
        <div className="space-y-2">
          <label className="flex justify-between text-sm text-gray-300">
            <span className="flex items-center gap-2"><Users className="w-4 h-4 text-gray-400" /> Virtual Drivers (Santiago)</span>
            <span className="font-mono text-tad-accent">{config.activeNodes}</span>
          </label>
          <input 
            type="range" 
            name="activeNodes" 
            min="10" max="500" step="10" 
            value={config.activeNodes} 
            onChange={handleChange}
            className="w-full accent-tad-accent cursor-pointer" 
          />
        </div>

        {/* Radius & Area */}
        <div className="space-y-2">
          <label className="flex justify-between text-sm text-gray-300">
            <span className="flex items-center gap-2"><Settings2 className="w-4 h-4 text-gray-400" /> Simulation Radius (Km)</span>
            <span className="font-mono text-white">{config.radiusKm} Km</span>
          </label>
          <input 
            type="range" 
            name="radiusKm" 
            min="1" max="50" step="1" 
            value={config.radiusKm} 
            onChange={handleChange}
            className="w-full accent-tad-accent cursor-pointer" 
          />
        </div>

        {/* Speed Controls */}
        <div className="grid grid-cols-2 gap-4">
           <div className="space-y-2">
             <label className="text-[10px] text-gray-400 uppercase tracking-widest">Min Speed (km/h)</label>
             <input 
               type="number" 
               name="minSpeed" 
               min="0"
               max={config.maxSpeed}
               value={config.minSpeed} 
               onChange={handleChange}
               className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-sm text-white font-mono"
             />
           </div>
           <div className="space-y-2">
             <label className="text-[10px] text-gray-400 uppercase tracking-widest">Max Speed (km/h)</label>
             <input 
               type="number" 
               name="maxSpeed" 
               min={config.minSpeed}
               max="120"
               value={config.maxSpeed} 
               onChange={handleChange}
               className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-sm text-white font-mono"
             />
           </div>
        </div>

        {/* Geolocation Center */}
        <div className="grid grid-cols-2 gap-4">
           <div className="space-y-2">
             <label className="text-[10px] text-gray-400 uppercase tracking-widest text-tad-accent">Center Lat</label>
             <input 
               type="number" 
               name="centerLat" 
               step="0.0001"
               value={config.centerLat} 
               onChange={handleChange}
               className="w-full bg-tad-accent/5 border border-tad-accent/20 rounded px-2 py-1 text-sm text-tad-accent font-mono"
             />
           </div>
           <div className="space-y-2">
             <label className="text-[10px] text-gray-400 uppercase tracking-widest text-tad-accent">Center Lng</label>
             <input 
               type="number" 
               name="centerLng" 
               step="0.0001"
               value={config.centerLng} 
               onChange={handleChange}
               className="w-full bg-tad-accent/5 border border-tad-accent/20 rounded px-2 py-1 text-sm text-tad-accent font-mono"
             />
           </div>
        </div>

        {/* Telemetry Freq */}
        <div className="space-y-2">
          <label className="flex justify-between text-sm text-gray-300">
            <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" /> Telemetry Freq (Secs)</span>
            <span className="font-mono text-white">{config.telemetryFrequency}s batching</span>
          </label>
          <input 
            type="range" 
            name="telemetryFrequency" 
            min="5" max="60" step="5" 
            value={config.telemetryFrequency} 
            onChange={handleChange}
            className="w-full accent-tad-accent cursor-pointer" 
          />
        </div>

        {/* Debt Mode Simulation (402 HTTP) */}
        <div className="space-y-2 pt-2">
          <label className="flex justify-between text-sm text-gray-300">
             <span className="flex items-center gap-2 text-red-300"><AlertTriangle className="w-4 h-4" /> &quot;Debtor Mode&quot; (402) Rate</span>
             <span className="font-mono text-red-400">{(config.anomalyRate * 100).toFixed(0)}%</span>
          </label>
           <input 
            type="range" 
            name="anomalyRate" 
            min="0" max="0.5" step="0.01" 
            value={config.anomalyRate} 
            onChange={handleChange}
            className="w-full accent-red-500 cursor-pointer" 
          />
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <button 
          onClick={toggleSimulation}
          disabled={loading}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all shadow-lg
            ${loading ? 'opacity-50 cursor-not-allowed' : ''}
            ${isRunning 
              ? 'bg-red-500/20 text-red-500 border border-red-500/50 hover:bg-red-500/30 shadow-red-500/10' 
              : 'bg-tad-accent text-black border border-tad-accent shadow-tad-accent/20 hover:bg-[#ffe033]'
            }`}
        >
          {loading ? (
             <span className="flex items-center gap-2">
               <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
               </svg>
               PROCESSING...
             </span>
          ) : isRunning ? (
             <><Square className="w-5 h-5 fill-current" /> STOP SIMULATION</>
          ) : (
             <><Play className="w-5 h-5 fill-current" /> DEPLOY ENGINE</>
          )}
        </button>

        <button 
          onClick={async () => {
             const t = (await import('react-hot-toast')).default;
             try {
                const res = await fetch('/api/simulation/refresh-views', { method: 'POST' });
                if (res.ok) t.success('Vistas Materializadas (mv_fleet_health) Actualizadas');
                else t.error('Fallo al actualizar vistas');
             } catch (e) {
                t.error('Error de red');
             }
          }}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-white/10 text-gray-400 text-sm font-medium hover:bg-white/5 transition-colors"
        >
          <Database className="w-4 h-4" /> REFRESH MATERIALIZED VIEWS
        </button>

        <button 
          onClick={async () => {
             const t = (await import('react-hot-toast')).default;
             try {
                t.loading('Purging simulation data...', { id: 'purge' });
                const res = await fetch('/api/simulation/cleanup', { method: 'POST' });
                const json = await res.json();
                if (res.ok && json.success) {
                   t.success(json.message, { id: 'purge' });
                } else {
                   t.error('Failed to purge simulation data', { id: 'purge' });
                }
             } catch (e) {
                t.error('Network error', { id: 'purge' });
             }
          }}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors mt-2"
        >
           <AlertTriangle className="w-4 h-4" /> DELETE SIMULATION DATA
        </button>
      </div>
    </div>
  );
}
