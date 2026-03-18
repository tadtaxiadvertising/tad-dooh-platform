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

// Custom Icons for Status
const ActiveIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #FFD400; width: 14px; height: 14px; border-radius: 50%; border: 2px solid #000; box-shadow: 0 0 15px rgba(255, 212, 0, 0.6);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const InactiveIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #52525b; width: 10px; height: 10px; border-radius: 50%; border: 2px solid #000;"></div>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

interface MapLocation {
  deviceId?: string;
  taxiNumber?: string;
  lastLat?: number;
  lastLng?: number;
  isOnline?: boolean;
  city?: string;
}

interface MapViewProps {
  locations: MapLocation[];
  heatmapData?: unknown[];
  center?: [number, number];
  zoom?: number;
  mode?: 'live' | 'heatmap';
}

function MapUpdater({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

const MapView: React.FC<MapViewProps> = ({ 
  locations = [], 
  heatmapData = [], 
  center = [18.4861, -69.9312], // Santo Domingo default
  zoom = 13,
  mode = 'live'
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <div className="w-full h-full bg-zinc-900 animate-pulse rounded-2xl" />;

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-white/5 shadow-2xl relative">
      <MapContainer 
        center={center} 
        zoom={zoom} 
        style={{ height: '100%', width: '100%', background: '#09090b' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <MapUpdater center={center} zoom={zoom} />

        {mode === 'live' && locations.map((loc, idx) => (
          (loc.lastLat && loc.lastLng) ? (
            <Marker 
              key={loc.deviceId || idx} 
              position={[loc.lastLat, loc.lastLng]}
              icon={loc.isOnline ? ActiveIcon : InactiveIcon}
            >
              <Popup className="custom-popup">
                <div className="bg-zinc-950 text-white p-2 rounded-lg border border-white/10">
                  <p className="font-black text-tad-yellow uppercase tracking-tighter italic">
                    {loc.taxiNumber || loc.deviceId}
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-1 uppercase font-bold">
                    {loc.city || 'Ubicación Desconocida'}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${loc.isOnline ? 'bg-green-500 animate-pulse' : 'bg-zinc-600'}`} />
                    <span className="text-[9px] font-black uppercase text-zinc-500">
                      {loc.isOnline ? 'En Línea' : 'Desconectado'}
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ) : null
        ))}

        {mode === 'heatmap' && heatmapData.map((point, idx) => (
          <div key={idx} /> // Heatmap simple layer would go here
        ))}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-[1000] bg-black/80 backdrop-blur-md border border-white/10 p-3 rounded-xl flex flex-col gap-2 shadow-2xl">
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 bg-[#FFD400] rounded-full shadow-[0_0_8px_#FFD400]" />
            <span className="text-[9px] font-black text-white uppercase tracking-widest">Unidad Activa</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-zinc-600 rounded-full" />
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Desconectada</span>
          </div>
        </div>
      </MapContainer>

      <style jsx global>{`
        .leaflet-container { font-family: inherit; }
        .leaflet-popup-content-wrapper { background: transparent !important; box-shadow: none !important; border: none !important; }
        .leaflet-popup-tip-container { display: none !important; }
        .leaflet-popup-content { margin: 0 !important; width: auto !important; }
      `}</style>
    </div>
  );
};

export default MapView;
