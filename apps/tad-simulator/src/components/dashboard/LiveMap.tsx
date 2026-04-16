'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with Next.js
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Aliasing components to any to satisfy strict React 19 JSX types
const Map_: any = MapContainer;
const Tile_: any = TileLayer;
const Marker_: any = Marker;
const Popup_: any = Popup;

// Cyber-Taxi Minimal Icon for Simulator
const createSimIcon = (isRunning: boolean, hasError: boolean = false) => {
  const mainColor = hasError ? '#ef4444' : (isRunning ? '#FFD400' : '#52525b');
  const glow = isRunning ? `drop-shadow(0 0 8px ${mainColor}cc)` : 'none';
  
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
        ${isRunning && !hasError ? '<div class="sim-pulse"></div>' : ''}
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

// Definir centro fuera del componente para que la referencia sea estática
const SANTIAGO_CENTER: [number, number] = [19.4517, -70.6970];

export default function LiveMap({ isRunning, driverCount }: { isRunning: boolean, driverCount: number }) {
  const [locations, setLocations] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isRunning) return;

    const fetchLocations = async () => {
      try {
        const res = await fetch('/api/v1/monitoring/fleet-status').catch(() => null);
        if (res && res.ok) {
           const data = await res.json();
           setLocations(data.filter((d: any) => d.isSimulated || d.deviceId.includes('SIM')));
        } else {
           const mockNodes = Array.from({ length: driverCount > 100 ? 100 : driverCount }, (_, i) => ({
              id: i,
              lat: SANTIAGO_CENTER[0] + (Math.random() - 0.5) * 0.08,
              lng: SANTIAGO_CENTER[1] + (Math.random() - 0.5) * 0.08,
              batteryLevel: Math.random() < 0.1 ? 12 : 88,
              status: Math.random() < 0.05 ? 'ERROR' : 'OK'
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

  return (
    <div className="w-full h-full relative group">
      <Map_
        center={SANTIAGO_CENTER}
        zoom={13}
        zoomControl={false}
        style={{ height: '100%', width: '100%', background: '#050505' }}
      >
        <Tile_
          attribution='&copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {locations.map((loc, i) => {
          const battery = loc.batteryLevel ?? 100;
          const hasError = loc.status === 'ERROR' || battery < 15;
          
          return (
            <Marker_ 
              key={loc.deviceId || i} 
              position={[loc.lastLat || loc.lat, loc.lastLng || loc.lng]} 
              icon={createSimIcon(isRunning, hasError)}
            >
              <Popup_ className="sim-popup">
                <div className="bg-zinc-900 p-2 text-[10px] border border-white/10 rounded min-w-[120px]">
                  <p className="text-tad-accent font-bold uppercase tracking-tighter border-b border-white/5 pb-1 mb-1">
                    Node: {loc.taxiNumber || loc.deviceId || `SIM-${i}`}
                  </p>
                  <p className={`${hasError ? 'text-red-400 font-bold' : 'text-gray-400'} mt-1`}>
                    Status: {hasError ? '⚠ TECHNICAL ALERT' : (isRunning ? '● TRANSMITTING' : '○ IDLE')}
                  </p>
                  <div className="mt-1 flex items-center justify-between">
                     <span className="text-gray-500">Power:</span>
                     <span className={`${battery < 20 ? 'text-red-500' : 'text-green-500'}`}>{Math.round(battery)}%</span>
                  </div>
                </div>
              </Popup_>
            </Marker_>
          );
        })}
      </Map_>

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
         <span>Live: {locations.length} nodes</span>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .leaflet-container { background: #050505 !important; font-family: 'Inter', sans-serif; }
        .sim-popup .leaflet-popup-content-wrapper { background: transparent !important; box-shadow: none !important; padding: 0 !important; }
        .sim-popup .leaflet-popup-tip-container { display: none !important; }
        .sim-marker { border: none !important; background: transparent !important; }
      `}} />
    </div>
  );
}
