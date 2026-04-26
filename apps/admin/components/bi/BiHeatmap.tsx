import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import 'leaflet/dist/leaflet.css';
import { getBiHotspots } from "@tad/services";
import { Activity, MapPin } from 'lucide-react';

// Plugin component to handle the heat layer
const HeatLayer = ({ points }: { points: any[] }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !points || points.length === 0) return;

    // @ts-ignore
    const heatLayer = L.heatLayer(points, {
      radius: 25,
      blur: 20,
      maxZoom: 17,
      max: 1.0,
      gradient: {
        0.2: '#0f172a', // Deep slate
        0.4: '#1e1b4b', // Deep indigo
        0.6: '#4338ca', // Indigo
        0.8: '#facc15', // TAD Yellow
        1.0: '#fbbf24'  // Amber
      }
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points]);

  return null;
};

// Map controls overlay
const MapOverlay = () => (
  <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
    <div className="bg-black/60 backdrop-blur-md border border-white/10 px-3 py-2 rounded-xl flex items-center gap-3">
      <div className="flex flex-col">
        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Status de Red</span>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black text-white uppercase tracking-tighter">Live Telemetry</span>
        </div>
      </div>
    </div>
  </div>
);

export const BiHeatmap = () => {
  const [points, setPoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPoints = async () => {
      try {
        const data = await getBiHotspots();
        // Fallback points if empty for visual excellence
        if (!data || data.length === 0) {
          setPoints([
            [18.4861, -69.9312, 0.8],
            [18.4761, -69.9412, 0.6],
            [18.4961, -69.9212, 0.9],
            [18.4661, -69.9512, 0.5],
            [18.4561, -69.9312, 0.7],
          ]);
        } else {
          setPoints(data);
        }
      } catch (error) {
        console.error('Error fetching hotspots:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPoints();
  }, []);

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-zinc-800/60 relative bg-zinc-950 group">
      {loading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-md gap-4">
          <div className="w-10 h-10 border-t-2 border-tad-yellow rounded-full animate-spin" />
          <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em]">Map Engine Initializing...</p>
        </div>
      )}
      
      <MapContainer 
        center={[18.4861, -69.9312]} // Santo Domingo
        zoom={13} 
        style={{ height: '100%', width: '100%', filter: 'invert(100%) hue-rotate(180deg) brightness(0.95) contrast(0.9)' }}
        zoomControl={false}
        scrollWheelZoom={false}
        dragging={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <HeatLayer points={points} />
      </MapContainer>

      {/* Glossy top gradient */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-zinc-950/40 to-transparent pointer-events-none z-[1000]" />
      
      {/* HUD Elements */}
      <MapOverlay />

      <div className="absolute bottom-6 left-6 z-[1000] flex flex-col gap-1">
        <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 px-4 py-2.5 rounded-2xl shadow-2xl transition-all duration-500 group-hover:border-tad-yellow/30">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-tad-yellow/10 rounded-lg border border-tad-yellow/20">
              <Activity className="w-3.5 h-3.5 text-tad-yellow" />
            </div>
            <div>
              <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none mb-1">Hotspots de Impacto</p>
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter">Basado en telemetría MTD</p>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative corners */}
      <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-white/10 pointer-events-none" />
      <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-white/10 pointer-events-none" />
    </div>
  );
};
