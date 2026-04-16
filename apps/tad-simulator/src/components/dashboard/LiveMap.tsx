'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import dynamic from 'next/dynamic';

// Fix for default marker icons in Leaflet with Next.js
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Cyber-Taxi Minimal Icon for Simulator
const createSimIcon = (isRunning: boolean) => {
  const mainColor = isRunning ? '#FFD400' : '#52525b';
  const glow = isRunning ? 'drop-shadow(0 0 8px rgba(255, 212, 0, 0.8))' : 'none';
  
  return L.divIcon({
    className: 'sim-marker',
    html: `
      <div style="
        width: 12px;
        height: 12px;
        background: ${mainColor};
        border-radius: 50%;
        border: 2px solid rgba(0,0,0,0.5);
        filter: ${glow};
        transition: all 0.5s ease;
      ">
        ${isRunning ? '<div class="sim-pulse"></div>' : ''}
      </div>
      <style>
        .sim-pulse {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 1px solid ${mainColor};
          animation: sim-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        @keyframes sim-ping {
          75%, 100% { transform: scale(3); opacity: 0; }
        }
      </style>
    `,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
};

function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 13, { duration: 1.5 });
  }, [center, map]);
  return null;
}

export default function LiveMap({ isRunning, driverCount }: { isRunning: boolean, driverCount: number }) {
  const [locations, setLocations] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isRunning) return;

    const fetchLocations = async () => {
      try {
        // En un entorno real, el simulador consultaría el estado de la flota
        // Para este demo, generamos posiciones coherentes si no hay API disponible
        const res = await fetch('/api/v1/monitoring/fleet-status').catch(() => null);
        if (res && res.ok) {
           const data = await res.json();
           setLocations(data.filter((d: any) => d.isSimulated || d.deviceId.includes('SIM')));
        } else {
           // Fallback: Mock de Santiago si la API no responde
           const mockNodes = Array.from({ length: driverCount > 100 ? 100 : driverCount }, (_, i) => ({
              id: i,
              lat: 19.4517 + (Math.random() - 0.5) * 0.08,
              lng: -70.6970 + (Math.random() - 0.5) * 0.08,
           }));
           setLocations(mockNodes);
        }
      } catch (e) {
        console.error('Fetch error', e);
      }
    };

    fetchLocations();
    const interval = setInterval(fetchLocations, 3000);
    return () => clearInterval(interval);
  }, [isRunning, driverCount]);

  if (!mounted) return <div className="w-full h-full bg-[#0a0a0a]" />;

  const center: [number, number] = [19.4517, -70.6970]; // Santiago

  return (
    <div className="w-full h-full relative group">
      <MapContainer
        center={center}
        zoom={13}
        zoomControl={false}
        style={{ height: '100%', width: '100%', background: '#050505' }}
      >
        <TileLayer
          attribution='&copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        <MapController center={center} />
        
        {locations.map((loc, i) => (
          <Marker 
            key={loc.deviceId || i} 
            position={[loc.lastLat || loc.lat, loc.lastLng || loc.lng]} 
            icon={createSimIcon(isRunning)}
          >
            <Popup className="sim-popup">
              <div className="bg-zinc-900 p-2 text-[10px] border border-white/10 rounded">
                <p className="text-tad-accent font-bold uppercase tracking-tighter">Node: ${loc.taxiNumber || loc.deviceId || i}</p>
                <p className="text-gray-400 mt-1">Status: ${isRunning ? 'TRANSMITTING' : 'IDLE'}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Overlay Effects */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] z-[1000]" />
      <div className="absolute top-4 right-4 z-[1001] bg-black/60 backdrop-blur-md p-2 rounded border border-white/10 text-[10px] text-tad-accent font-mono">
         MAP ENGINE: LEAFLET V1.9.4
      </div>
      
      <div className="absolute bottom-4 left-4 z-[1001] bg-zinc-900/90 backdrop-blur-md px-3 py-1.5 rounded-md border border-white/10 text-[10px] text-white/70 font-mono flex items-center gap-3">
         <span className="flex items-center gap-1.5">
           <span className="w-2 h-2 rounded-full bg-tad-accent animate-pulse" />
           Santiago, DO 
         </span>
         <span className="text-white/20">|</span>
         <span>Vis: {locations.length} nodes</span>
      </div>

      <style jsx global>{`
        .leaflet-container { background: #050505 !important; }
        .sim-popup .leaflet-popup-content-wrapper { background: transparent !important; box-shadow: none !important; padding: 0 !important; }
        .sim-popup .leaflet-popup-tip-container { display: none !important; }
        .sim-marker { border: none !important; background: transparent !important; }
      `}</style>
    </div>
  );
}
