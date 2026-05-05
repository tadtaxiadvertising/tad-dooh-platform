// apps/tad-simulator/src/components/simulator/DigitalTwinMap.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useDigitalTwinEngine } from '../../hooks/useDigitalTwinEngine';
import { Maximize2, Minimize2, Settings2, Activity, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';

export const DigitalTwinMap = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHUD, setShowHUD] = useState(true);
  
  const { config, setConfig, nodesRef } = useDigitalTwinEngine({
    volume: 50,
    speed: 1,
    debtorRate: 5,
    telemetryInterval: 15000, // 15s default batching
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<{ [key: string]: HTMLDivElement }>({});

  useEffect(() => {
    // SRE Optimized: Direct DOM manipulation bypasses React render cycle
    const handleTick = () => {
      const nodes = Array.from(nodesRef.current.values());
      
      nodes.forEach(node => {
        const el = markersRef.current[node.id];
        if (el) {
          // Bounding Box para la simulación visual (Santo Domingo Centro)
          // Lat: 18.3 to 18.6, Lng: -70.1 to -69.8
          const x = ((node.lng - (-70.1)) / 0.3) * 100;
          const y = ((18.6 - node.lat) / 0.3) * 100;
          
          el.style.transform = `translate(${x}vw, ${y}vh) rotate(${node.heading}deg)`;
          
          // Spec MAP-SPEC-2026: Kill-Switch 402 Debtor Mode rendering
          if (node.status === 'debtor') {
            el.classList.remove('text-yellow-500', 'drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]');
            el.classList.add('text-red-600', 'drop-shadow-[0_0_12px_rgba(220,38,38,1)]', 'animate-pulse');
          } else {
            el.classList.remove('text-red-600', 'drop-shadow-[0_0_12px_rgba(220,38,38,1)]', 'animate-pulse');
            el.classList.add('text-yellow-500', 'drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]');
          }
        }
      });
    };

    window.addEventListener('digital-twin-tick', handleTick);
    return () => window.removeEventListener('digital-twin-tick', handleTick);
  }, [nodesRef]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={clsx(
        "relative overflow-hidden bg-neutral-950 transition-all duration-700 ease-in-out font-sans",
        isFullscreen ? "w-screen h-screen fixed inset-0 z-50" : "w-full h-[800px] rounded-2xl border border-neutral-800"
      )}
    >
      {/* Base Theme: Dark Mode High Contrast Backdrop (CartoDB DarkMatter Placeholder) */}
      <div className="absolute inset-0 bg-neutral-950 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-800/20 via-neutral-950 to-neutral-950" />
        {/* Grilla técnica para dar feeling de simulación */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      {/* Fleet Nodes Container */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from(nodesRef.current.values()).map(node => (
          <div
            key={node.id}
            ref={el => { if (el) markersRef.current[node.id] = el; }}
            className="absolute top-0 left-0 w-6 h-6 -ml-3 -mt-3 transition-colors duration-300 z-10"
            style={{ transform: `translate(-100vw, -100vh)` }} // Inicia fuera de cámara
          >
            {/* SVG Marcador (Flecha de navegación TAD) */}
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full drop-shadow-xl">
              <path d="M12 2L2 22l10-4 10 4L12 2z" />
            </svg>
            
            {/* Motion Trails Resplandor */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-1 h-8 bg-gradient-to-t from-transparent to-current opacity-30 blur-[2px]" />
          </div>
        ))}
      </div>

      {/* Broadcasting Mode: Glassmorphic Control Panel (HUD) */}
      <div className={clsx(
        "absolute top-6 left-6 w-80 bg-neutral-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 transition-all duration-500 z-20 shadow-2xl",
        !showHUD && "-translate-x-[150%] opacity-0"
      )}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5 text-yellow-500 animate-pulse" />
            TAD Control Center
          </h2>
          <button onClick={() => setShowHUD(false)} className="text-neutral-400 hover:text-white transition-colors">
            <Settings2 className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Slider Volumen */}
          <div>
            <label className="text-xs text-neutral-400 font-medium uppercase tracking-wider mb-2 flex justify-between">
              <span>Volumen de Flota</span>
              <span className="text-yellow-500 font-bold">{config.volume} Nodos</span>
            </label>
            <input 
              type="range" min="10" max="150" value={config.volume}
              onChange={e => setConfig({...config, volume: parseInt(e.target.value)})}
              className="w-full accent-yellow-500 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Botones Velocidad */}
          <div>
            <label className="text-xs text-neutral-400 font-medium uppercase tracking-wider mb-2 block">
              Time-Lapse (Sim Speed)
            </label>
            <div className="flex gap-2">
              {[1, 2, 5].map(s => (
                <button
                  key={s}
                  onClick={() => setConfig({...config, speed: s})}
                  className={clsx(
                    "flex-1 py-1.5 text-sm rounded-md border transition-all duration-300 font-medium",
                    config.speed === s 
                      ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.2)]" 
                      : "border-white/10 text-neutral-400 hover:bg-white/5 hover:border-white/20"
                  )}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Slider Morosidad 402 */}
          <div>
            <label className="text-xs text-red-400 font-medium uppercase tracking-wider mb-2 flex justify-between items-center">
              <span className="flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5" /> Kill-Switch 402</span>
              <span className="text-red-500 font-bold">{config.debtorRate}%</span>
            </label>
            <input 
              type="range" min="0" max="20" value={config.debtorRate}
              onChange={e => setConfig({...config, debtorRate: parseInt(e.target.value)})}
              className="w-full accent-red-600 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Select Telemetría */}
          <div>
            <label className="text-xs text-neutral-400 font-medium uppercase tracking-wider mb-2 block">
              Frecuencia Telemetría (GPS Batch)
            </label>
            <div className="relative">
              <select 
                value={config.telemetryInterval}
                onChange={e => setConfig({...config, telemetryInterval: parseInt(e.target.value)})}
                className="w-full bg-neutral-900/50 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/50 appearance-none cursor-pointer backdrop-blur-md transition-colors"
              >
                <option value={5000}>5 Segundos (Real-time)</option>
                <option value={15000}>15 Segundos (Estándar)</option>
                <option value={60000}>1 Minuto (Ahorro Batería)</option>
                <option value={300000}>5 Minutos (Modo Sleep)</option>
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <div className="w-2 h-2 border-b border-r border-white/50 transform rotate-45" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controles de Vista Fullscreen */}
      <div className="absolute top-6 right-6 flex gap-3 z-20">
        {!showHUD && (
          <button 
            onClick={() => setShowHUD(true)}
            className="p-3 bg-neutral-900/40 backdrop-blur-xl border border-white/10 rounded-full text-white hover:bg-white/10 transition-colors shadow-lg group"
            title="Mostrar HUD"
          >
            <Settings2 className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        )}
        <button 
          onClick={toggleFullscreen}
          className="p-3 bg-neutral-900/40 backdrop-blur-xl border border-white/10 rounded-full text-white hover:bg-white/10 transition-colors shadow-lg"
          title={isFullscreen ? "Salir de Fullscreen" : "Modo Inmersivo"}
        >
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};
