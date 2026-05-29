'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { TaxiData } from '@/types/tracking';

interface MapViewProps {
  taxis: TaxiData[];
  center?: [number, number];
  zoom?: number;
  heatmapMode?: boolean;
}

// Fix for default marker icon in Next.js
const createCustomIcon = (isOnline: boolean) => {
  const color = isOnline ? '#22c55e' : '#ef4444';
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      "></div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

// Component to update map view based on props
function MapUpdater({ center, zoom }: { center?: [number, number]; zoom?: number }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, zoom ?? map.getZoom());
    }
  }, [center, zoom, map]);
  
  return null;
}

export default function MapView({ taxis, center = [-34.6037, -58.3816], zoom = 12, heatmapMode = false }: MapViewProps) {
  const [isClient, setIsClient] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    setIsClient(true);
    // Detect system preference or app theme
    const isDark = document.documentElement.classList.contains('dark') || 
                   window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(isDark);
  }, []);

  if (!isClient) {
    return (
      <div className="w-full h-full bg-[#07080d] flex items-center justify-center">
        <div className="text-gray-400">Loading map...</div>
      </div>
    );
  }

  const tileUrl = darkMode
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const attribution = darkMode
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ width: '100%', height: '100%' }}
      className="bg-[#07080d]"
    >
      <TileLayer url={tileUrl} attribution={attribution} />
      <MapUpdater center={center} zoom={zoom} />
      
      {taxis.map((taxi) => {
        if (!taxi.latitude || !taxi.longitude) return null;
        
        const position: [number, number] = [taxi.latitude, taxi.longitude];
        const isOnline = taxi.status === 'online';
        
        if (heatmapMode) {
          // Heatmap mode: show density with circle markers
          const opacity = isOnline ? 0.6 : 0.3;
          const radius = isOnline ? 30 : 15;
          
          return (
            <CircleMarker
              key={taxi.id}
              center={position}
              radius={radius}
              color={isOnline ? '#22c55e' : '#ef4444'}
              fillColor={isOnline ? '#22c55e' : '#ef4444'}
              fillOpacity={opacity}
              weight={1}
            />
          );
        }
        
        // Normal mode: show markers with details
        return (
          <Marker
            key={taxi.id}
            position={position}
            icon={createCustomIcon(isOnline)}
          >
            <Popup>
              <div className="min-w-[200px]">
                <h3 className="font-bold text-lg mb-2">{taxi.driver_name || `Taxi ${taxi.license_plate}`}</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Patente:</strong> {taxi.license_plate || 'N/A'}</p>
                  <p><strong>Estado:</strong> 
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                      isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {isOnline ? 'En línea' : 'Sin conexión'}
                    </span>
                  </p>
                  {taxi.speed !== undefined && (
                    <p><strong>Velocidad:</strong> {taxi.speed} km/h</p>
                  )}
                  {taxi.last_update && (
                    <p className="text-xs text-gray-500 mt-2">
                      Actualizado: {new Date(taxi.last_update).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
