import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl, Polygon } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { VehiclePopup } from './ui/VehiclePopup';
import ReactDOMServer from 'react-dom/server';
import { Tablet, Navigation, CarFront } from 'lucide-react';
import clsx from 'clsx';

// Fix for default marker icons in Leaflet with Next.js
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// ============================================
// CUSTOM MARKER ICON GENERATOR
// ============================================
const createVehicleIcon = (status: 'active' | 'offline' | 'unpaid') => {
  const color = status === 'active' ? '#fad400' : status === 'unpaid' ? '#ef4444' : '#71717a';
  
  return L.divIcon({
    className: 'custom-vehicle-marker',
    html: `
      <div class="relative group" style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 34px; height: 42px; background: ${color}; clip-path: polygon(50% 100%, 0% 0%, 100% 0%); filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4)); opacity: 0.9;"></div>
        <div style="position: absolute; top: -2px; left: 50%; transform: translateX(-50%); width: 34px; height: 34px; border-radius: 50%; background: ${color}; display: flex; align-items: center; justify-content: center; border: 2.5px solid #000; box-shadow: 0 4px 12px rgba(0,0,0,0.6);">
           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
             <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7c0 1.1.9 2 2 2h10"></path>
             <circle cx="7" cy="17" r="2"></circle>
             <circle cx="17" cy="17" r="2"></circle>
           </svg>
        </div>
        ${status === 'active' ? `
          <div style="position: absolute; top: -2px; left: 50%; transform: translateX(-50%); width: 34px; height: 34px; border-radius: 50%; background: ${color}; opacity: 0.4; animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        ` : ''}
      </div>
      <style>
        @keyframes ping-slow {
          75%, 100% { transform: translateX(-50%) scale(1.8); opacity: 0; }
        }
      </style>
    `,
    iconSize: [40, 50],
    iconAnchor: [20, 50],
    popupAnchor: [0, -45],
  });
};

interface MapLocation {
  deviceId?: string;
  taxiNumber?: string;
  lastLat?: number;
  lastLng?: number;
  isOnline?: boolean;
  city?: string;
  driverName?: string;
  plate?: string;
  batteryLevel?: number | null;
  lastSeen?: string | null;
  subscriptionStatus?: string;
  speed?: number;
}

interface MapViewProps {
  locations: MapLocation[];
  heatmapData?: unknown[];
  center?: [number, number];
  zoom?: number;
  mode?: 'live' | 'heatmap';
  onViewHistory?: (v: MapLocation) => void;
  onSyncCommand?: (v: MapLocation) => void;
}

// pilot pilot geofencing zones
const GEOFENCING_ZONES = [
  {
    name: 'Piloto Santiago @STI',
    coords: [
      [19.4627, -70.7303],
      [19.4939, -70.6726],
      [19.4589, -70.6479],
      [19.4283, -70.7049],
    ] as [number, number][],
    color: '#fad400'
  },
  {
     name: 'Piloto Puerto Plata @POP',
     coords: [
       [19.7891, -70.7161],
       [19.8051, -70.6750],
       [19.7820, -70.6690],
       [19.7710, -70.7050],
     ] as [number, number][],
     color: '#60a5fa'
  }
];

function MapController({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.5 });
  }, [center, zoom, map]);
  return null;
}

const MapView: React.FC<MapViewProps> = ({ 
  locations = [], 
  heatmapData = [], 
  center = [18.4861, -69.9312], 
  zoom = 13,
  mode = 'live',
  onViewHistory,
  onSyncCommand
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <div className="w-full h-full bg-[#0a0a0a] animate-pulse flex items-center justify-center">
    <Navigation className="w-10 h-10 text-zinc-900 animate-spin" />
  </div>;

  return (
    <div className="w-full h-full relative">
      <MapContainer 
        center={center} 
        zoom={zoom} 
        style={{ height: '100%', width: '100%', background: '#0a0a0a' }}
        zoomControl={false}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          className="map-tiles-filter"
        />
        
        <ZoomControl position="bottomright" />
        <MapController center={center} zoom={zoom} />

        {GEOFENCING_ZONES.map((zone, i) => (
           <Polygon 
             key={i} 
             positions={zone.coords} 
             pathOptions={{ 
               color: zone.color, 
               fillColor: zone.color, 
               fillOpacity: 0.05, 
               weight: 2, 
               dashArray: '10, 10' 
             }}
           >
              <Popup className="zone-popup">
                 <div className="px-3 py-1 bg-black/80 backdrop-blur-md rounded-lg border border-white/10">
                    <span className="text-[10px] font-black uppercase text-white tracking-widest leading-none">{zone.name}</span>
                 </div>
              </Popup>
           </Polygon>
        ))}

        {mode === 'live' && locations.map((loc, idx) => {
          if (!loc.lastLat || !loc.lastLng) return null;
          const status = !loc.isOnline ? 'offline' : loc.subscriptionStatus !== 'ACTIVE' ? 'unpaid' : 'active';
          const icon = createVehicleIcon(status);

          return (
            <Marker 
              key={loc.deviceId || idx} 
              position={[loc.lastLat, loc.lastLng]}
              icon={icon}
            >
              <Popup className="custom-popup-premium" offset={[0, -10]}>
                <VehiclePopup 
                  device={loc as any} 
                  onViewHistory={() => onViewHistory?.(loc)}
                  onSyncCommand={() => onSyncCommand?.(loc)}
                />
              </Popup>
            </Marker>
          );
        })}

        {mode === 'heatmap' && heatmapData.map((point: any, idx) => (
           <Marker 
             key={idx} 
             position={[point.lat, point.lng]}
             icon={L.divIcon({
                className: 'heat-dot',
                html: `<div style="background: linear-gradient(to bottom, #fad400, #f87171); width: 24px; height: 24px; border-radius: 50%; blur: 20px; opacity: 0.4;"></div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
             })}
           />
        ))}
      </MapContainer>

      <style jsx global>{`
        .map-tiles-filter { filter: contrast(1.1) brightness(1) saturate(0.8) invert(0.05); }
        .custom-popup-premium .leaflet-popup-content-wrapper { background: transparent !important; box-shadow: none !important; padding: 0 !important; }
        .custom-popup-premium .leaflet-popup-content { margin: 0 !important; width: auto !important; }
        .custom-popup-premium .leaflet-popup-tip-container { display: none !important; }
        .leaflet-container { font-family: 'Outfit', sans-serif !important; background: #000 !important; }
        .leaflet-control-zoom { border: none !important; box-shadow: 0 10px 30px rgba(0,0,0,0.5) !important; margin: 30px !important; }
        .leaflet-control-zoom a { background: #000 !important; color: #fff !important; border: 1px solid rgba(255,255,255,0.1) !important; width: 40px !important; height: 40px !important; line-height: 40px !important; border-radius: 12px !important; margin-bottom: 5px !important; }
        .leaflet-control-zoom a:hover { background: #fad400 !important; color: #000 !important; border-color: #fad400 !important; }
      `}</style>
    </div>
  );
};

export default MapView;
