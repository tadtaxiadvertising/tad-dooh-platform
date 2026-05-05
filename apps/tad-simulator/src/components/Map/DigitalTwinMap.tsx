'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Expand, Shrink, Activity, Cpu, Wifi, Car, Zap, ShieldAlert, SlidersHorizontal } from 'lucide-react';

// ==========================================
// 1. ENGINE: useDigitalTwinEngine Hook
// ==========================================
export interface TwinNode {
  id: string;
  lat: number;
  lng: number;
  targetLat: number;
  targetLng: number;
  heading: number;
  status: 'online' | 'debtor';
  history: [number, number][];
}

const DR_CENTER = { lat: 18.4861, lng: -69.9312 };

// Genera puntos aleatorios dentro de un radio para simular calles (Drunk Walk simple)
const getRandomTarget = (baseLat: number, baseLng: number, radius = 0.03) => ({
  lat: baseLat + (Math.random() - 0.5) * radius,
  lng: baseLng + (Math.random() - 0.5) * radius,
});

function useDigitalTwinEngine(volume: number, speedMultiplier: number, debtorRate: number) {
  const nodesRef = useRef<TwinNode[]>([]);
  const reqRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(typeof performance !== 'undefined' ? performance.now() : 0);
  const framesRef = useRef(0);
  const lastFpsTimeRef = useRef(typeof performance !== 'undefined' ? performance.now() : 0);
  
  const [stats, setStats] = useState({ fps: 60, memory: 0, latency: 15 });

  // Inicialización y manejo de volumen de flota
  useEffect(() => {
    const currentNodes = nodesRef.current;
    if (currentNodes.length < volume) {
      const newNodes = Array.from({ length: volume - currentNodes.length }).map((_, i) => {
        const id = `tax-${Date.now()}-${i}`;
        const start = getRandomTarget(DR_CENTER.lat, DR_CENTER.lng, 0.1);
        const target = getRandomTarget(start.lat, start.lng, 0.02);
        return {
          id,
          lat: start.lat,
          lng: start.lng,
          targetLat: target.lat,
          targetLng: target.lng,
          heading: 0,
          status: Math.random() * 100 < debtorRate ? 'debtor' : 'online',
          history: [[start.lat, start.lng]],
        } as TwinNode;
      });
      nodesRef.current = [...currentNodes, ...newNodes];
    } else if (currentNodes.length > volume) {
      nodesRef.current = currentNodes.slice(0, volume);
    }
  }, [volume, debtorRate]);

  // Bucle de Simulación a 60 FPS
  useEffect(() => {
    const update = (time: number) => {
      const dt = time - lastTimeRef.current;
      lastTimeRef.current = time;

      // Cálculo de FPS y Telemetría simulada (SRE HUD)
      framesRef.current++;
      if (time - lastFpsTimeRef.current >= 1000) {
        // Estimación de memoria (usa performance.memory si está disponible en V8/Chrome)
        const mem = (performance as any).memory;
        const memoryUsed = mem ? Math.round(mem.usedJSHeapSize / 1024 / 1024) : Math.round(volume * 0.12 + 30);
        
        setStats({
          fps: framesRef.current,
          memory: memoryUsed,
          latency: Math.floor(Math.random() * 10 + 12)
        });
        framesRef.current = 0;
        lastFpsTimeRef.current = time;
      }

      // Velocidad LERP basada en el multiplicador
      const baseSpeed = 0.000015;
      const lerpSpeed = baseSpeed * speedMultiplier * dt;

      nodesRef.current.forEach((node, idx) => {
        // Forzamos aleatoriamente el status basado en la tasa de morosidad general para demostración
        // (Usamos el índice para no cambiar de estado caóticamente en cada frame, solo determinismo estático)
        node.status = (parseInt(node.id.slice(-5), 36) % 100) < debtorRate ? 'debtor' : 'online';

        const dLat = node.targetLat - node.lat;
        const dLng = node.targetLng - node.lng;
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);

        // Si llegó al target, asignar uno nuevo
        if (dist < 0.0001) {
          const newTarget = getRandomTarget(node.lat, node.lng, 0.015);
          node.targetLat = newTarget.lat;
          node.targetLng = newTarget.lng;
        } else {
          // Interpolación Lineal (LERP)
          node.lat += dLat * lerpSpeed;
          node.lng += dLng * lerpSpeed;
        }

        // Cálculo de heading (hacia donde mira el taxi)
        node.heading = (Math.atan2(dLng, dLat) * 180) / Math.PI;

        // Registro de historial para los Motion Trails
        if (framesRef.current % 4 === 0) {
          node.history.push([node.lat, node.lng]);
          if (node.history.length > 6) {
            node.history.shift(); // Mantenemos una estela corta para rendimiento
          }
        }
      });

      // Emitir CustomEvent para actualizar el DOM directamente (sin React re-renders)
      const event = new CustomEvent('digital-twin-tick', { 
        detail: { nodes: nodesRef.current } 
      });
      window.dispatchEvent(event);

      reqRef.current = requestAnimationFrame(update);
    };

    reqRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(reqRef.current);
  }, [speedMultiplier, debtorRate, volume]);

  return stats;
}

// ==========================================
// 2. RENDERIZADOR DIRECTO EN DOM / LEAFLET
// ==========================================
function NodeRenderer() {
  const map = useMap();
  const layersRef = useRef<Record<string, { marker: L.Marker, trail: L.Polyline }>>({});

  useEffect(() => {
    const handleTick = (e: Event) => {
      const customEvent = e as CustomEvent;
      const nodes: TwinNode[] = customEvent.detail.nodes;
      
      const currentIds = new Set(nodes.map(n => n.id));
      
      // Eliminar nodos que ya no están en la flota
      Object.keys(layersRef.current).forEach(id => {
        if (!currentIds.has(id)) {
          map.removeLayer(layersRef.current[id].marker);
          map.removeLayer(layersRef.current[id].trail);
          delete layersRef.current[id];
        }
      });

      // Actualizar posiciones e íconos
      nodes.forEach(node => {
        let items = layersRef.current[node.id];
        
        const isDebtor = node.status === 'debtor';
        const color = isDebtor ? '#ef4444' : '#eab308'; // Rojo para deudores, Amarillo TAD para online

        // SVG Personalizado con efectos de glow (resplandor) y pulso
        const glowClass = isDebtor 
          ? 'shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse' 
          : 'shadow-[0_0_12px_rgba(234,179,8,0.6)]';

        const svgHtml = `
          <div class="relative w-6 h-6 rounded-full border-2 ${isDebtor ? 'border-red-500 bg-red-900/80' : 'border-yellow-400 bg-yellow-600/90'} flex items-center justify-center ${glowClass}" style="transform: rotate(${node.heading}deg); transition: transform 0.1s linear;">
            <div class="w-1.5 h-2.5 bg-white rounded-t-sm absolute top-[2px]"></div>
            ${!isDebtor ? '<div class="absolute w-10 h-10 border border-yellow-500/40 rounded-full animate-ping"></div>' : ''}
            ${isDebtor ? '<div class="absolute w-10 h-10 border border-red-500/60 rounded-full animate-ping" style="animation-duration: 0.5s"></div>' : ''}
          </div>
        `;

        const icon = L.divIcon({
          html: svgHtml,
          className: 'bg-transparent border-none',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        if (!items) {
          // Crear nuevo marcador y motion trail
          const marker = L.marker([node.lat, node.lng], { icon }).addTo(map);
          const trail = L.polyline(node.history, { 
            color, 
            weight: 3, 
            opacity: 0.5,
            className: 'transition-all duration-300 pointer-events-none'
          }).addTo(map);
          
          layersRef.current[node.id] = { marker, trail };
        } else {
          // Actualizar posición sin re-crear (optimizado)
          items.marker.setLatLng([node.lat, node.lng]);
          
          // Actualizamos el ícono si el heading cambió (el SVG inline tiene el rotador)
          // Idealmente se rotaría un div interno para no setear el innerHTML, pero leaflet requiere setIcon o manipular el nodo.
          // Para esta escala (300) setIcon es suficientemente rápido en V8.
          items.marker.setIcon(icon);
          
          items.trail.setLatLngs(node.history);
          items.trail.setStyle({ color });
        }
      });
    };

    window.addEventListener('digital-twin-tick', handleTick);
    
    return () => {
      window.removeEventListener('digital-twin-tick', handleTick);
      // Cleanup de capas
      Object.values(layersRef.current).forEach(({marker, trail}) => {
        map.removeLayer(marker);
        map.removeLayer(trail);
      });
      layersRef.current = {};
    };
  }, [map]);

  return null;
}

// ==========================================
// 3. COMPONENTE PRINCIPAL (INTERFAZ BROADCASTING)
// ==========================================
export default function DigitalTwinMap() {
  const [volume, setVolume] = useState(50);
  const [speed, setSpeed] = useState(2);
  const [debtorRate, setDebtorRate] = useState(5);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showUI, setShowUI] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Iniciar el motor de simulación
  const stats = useDigitalTwinEngine(volume, speed, debtorRate);

  // Full-Screen API
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      try {
        await containerRef.current?.requestFullscreen();
        setIsFullscreen(true);
      } catch (err: any) {
        console.error(`Error entering fullscreen: ${err.message}`);
      }
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[700px] bg-black font-sans text-neutral-200">
      
      {/* CAPA MAPA: CartoDB DarkMatter */}
      <MapContainer 
        center={[DR_CENTER.lat, DR_CENTER.lng]} 
        zoom={14} 
        zoomControl={false}
        className="w-full h-full absolute inset-0 z-0 bg-[#0e0e0e]"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <NodeRenderer />
      </MapContainer>

      {/* OVERLAYS UI (Se ocultan o adaptan en Fullscreen según necesidad, aquí mantenemos un look cinemático) */}
      <AnimatePresence>
        {showUI && (
          <>
            {/* Panel de Parámetros (Glassmorphism) */}
            <motion.div 
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="absolute top-6 left-6 z-50 w-80 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
            >
              <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-black font-bold shadow-lg shadow-yellow-500/20">
                  <Car size={20} />
                </div>
                <div>
                  <h2 className="text-white font-semibold text-lg tracking-tight">Digital Twin</h2>
                  <p className="text-neutral-400 text-[10px] uppercase tracking-[0.2em] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    Live Broadcast
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Control: Volumen */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-neutral-300 font-medium flex items-center gap-2">
                      <Activity size={14} className="text-yellow-500"/> Flota Activa
                    </span>
                    <span className="text-yellow-400 font-mono bg-yellow-500/10 px-2 py-0.5 rounded text-xs border border-yellow-500/20">
                      {volume} / 300
                    </span>
                  </div>
                  <input 
                    type="range" min="10" max="300" step="5"
                    value={volume} onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-full accent-yellow-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg appearance-none"
                  />
                </div>

                {/* Control: Velocidad */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-neutral-300 font-medium flex items-center gap-2">
                      <Zap size={14} className="text-blue-400"/> Factor Tiempo
                    </span>
                    <span className="text-blue-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded text-xs border border-blue-500/20">
                      {speed.toFixed(1)}x
                    </span>
                  </div>
                  <input 
                    type="range" min="0.5" max="10" step="0.5"
                    value={speed} onChange={(e) => setSpeed(Number(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg appearance-none"
                  />
                </div>

                {/* Control: Morosidad (Debtor Mode) */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-neutral-300 font-medium flex items-center gap-2">
                      <ShieldAlert size={14} className="text-red-500"/> 
                      Corte 402
                    </span>
                    <span className="text-red-400 font-mono bg-red-500/10 px-2 py-0.5 rounded text-xs border border-red-500/20 animate-pulse">
                      {debtorRate}% Fallo
                    </span>
                  </div>
                  <input 
                    type="range" min="0" max="100" step="1"
                    value={debtorRate} onChange={(e) => setDebtorRate(Number(e.target.value))}
                    className="w-full accent-red-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg appearance-none"
                  />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* SRE HUD (Monitor de Sistema Inferior) */}
      <AnimatePresence>
        {showUI && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="absolute bottom-6 right-6 z-50 bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl p-4 flex gap-6 shadow-2xl"
          >
            <div className="flex flex-col min-w-[70px]">
              <span className="text-neutral-500 text-[9px] uppercase font-bold tracking-[0.1em] flex items-center gap-1.5 mb-1">
                <Activity size={10} /> ENGINE FPS
              </span>
              <span className={`font-mono text-xl font-bold tracking-tight ${stats.fps >= 55 ? 'text-green-400' : stats.fps >= 30 ? 'text-yellow-400' : 'text-red-500'}`}>
                {stats.fps}
              </span>
            </div>
            <div className="flex flex-col min-w-[70px] border-l border-white/10 pl-6">
              <span className="text-neutral-500 text-[9px] uppercase font-bold tracking-[0.1em] flex items-center gap-1.5 mb-1">
                <Cpu size={10} /> RAM V8 (Est)
              </span>
              <span className="font-mono text-xl font-bold text-neutral-300 tracking-tight">
                {stats.memory} <span className="text-sm text-neutral-600">MB</span>
              </span>
            </div>
            <div className="flex flex-col min-w-[70px] border-l border-white/10 pl-6">
              <span className="text-neutral-500 text-[9px] uppercase font-bold tracking-[0.1em] flex items-center gap-1.5 mb-1">
                <Wifi size={10} /> MQTT PING
              </span>
              <span className="font-mono text-xl font-bold text-neutral-300 tracking-tight">
                {stats.latency} <span className="text-sm text-neutral-600">ms</span>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controles Top-Right */}
      <div className="absolute top-6 right-6 z-50 flex gap-3">
        <button 
          onClick={() => setShowUI(!showUI)}
          className="p-3 bg-neutral-900/60 backdrop-blur-md border border-white/10 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer shadow-lg group"
          title="Toggle HUD"
        >
          <SlidersHorizontal size={20} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>
        <button 
          onClick={toggleFullscreen}
          className="p-3 bg-neutral-900/60 backdrop-blur-md border border-white/10 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer shadow-lg group"
          title={isFullscreen ? "Contraer Mapa" : "Expandir Mapa"}
        >
          {isFullscreen ? <Shrink size={20} className="group-hover:scale-90 transition-transform" /> : <Expand size={20} className="group-hover:scale-110 transition-transform" />}
        </button>
      </div>

    </div>
  );
}
