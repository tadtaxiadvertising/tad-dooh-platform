'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { TaxiData } from '@/types/tracking';

interface MapViewProps {
  // Legacy props
  taxis?: TaxiData[];
  center?: [number, number];
  zoom?: number;
  heatmapMode?: boolean;

  // New props from realtime.tsx
  locations?: any[];
  heatmapData?: any[];
  mode?: 'normal' | 'heatmap' | 'live';
  mapTheme?: 'light' | 'dark';
  heatmapIntensity?: number;
  heatmapRadius?: number;
  selectedId?: string | null;
  recentPath?: any[];
  onClearSelection?: () => void;
  onViewHistory?: (v: any) => void;
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

export default function MapView({
  taxis,
  locations,
  heatmapData,
  center = [-34.6037, -58.3816],
  zoom = 12,
  heatmapMode = false,
  mode = 'normal',
  mapTheme = 'dark',
  heatmapIntensity = 0.5,
  heatmapRadius = 25,
  selectedId,
  recentPath = [],
  onClearSelection,
  onViewHistory
}: MapViewProps) {
  const [isClient, setIsClient] = useState(false);
  const [darkMode, setDarkMode] = useState(mapTheme === 'dark');

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

  // Support both old (taxis) and new (locations) data format
  const dataToRender = locations || taxis || [];
  const currentMode = mode === 'heatmap' || heatmapMode ? true : false;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ width: '100%', height: '100%' }}
      className="bg-[#07080d]"
    >
      <TileLayer url={tileUrl} attribution={attribution} />
      <MapUpdater center={center} zoom={zoom} />

      {dataToRender.map((item: any) => {
        // Support both TaxiData interface and generic location object
        const latitude = item.latitude || item.lat || item.lastLat;
        const longitude = item.longitude || item.lng || item.lon || item.lastLng;

        if (!latitude || !longitude) return null;

        const position: [number, number] = [latitude, longitude];
        const isSelected = selectedId === item.id;
        // ALL-SEEING EYE PATCH (v12.1.3, MAP-SPEC-2026):
        // El backend `FleetService.getFleetMap()` retorna `isOnline: boolean`
        // y `status: SystemStatus` (enum: 'OPERATIVO' | 'PENDIENTE_PAGO' |
        // 'BLOQUEADO'), NUNCA `status: 'online'`. La versión anterior evaluaba
        // `item.status === 'online'`, que es falso para todos los registros,
        // por lo que los marcadores pintaban siempre rojo (offline),
        // rompiendo la lógica binaria MAP-SPEC-2026 (verde TAD = online,
        // rojo TAD = offline).
        //
        // Provincias de datos aceptadas:
        //  - baseline REST (`/tracking/baseline`):   { isOnline, status }
        //  - realtime ping (`upsertTelemetryPing`):  { isOnline: true }
        //  - legacy `TaxiData`:                       { status: 'online' }
        const isOnline =
          !!item.isOnline ||
          item.online === true ||
          String(item.status).toLowerCase() === 'online';

        if (currentMode) {
          // Heatmap mode: show density with circle markers
          const opacity = (isOnline ? heatmapIntensity : heatmapIntensity * 0.5);
          const radius = heatmapRadius || (isOnline ? 30 : 15);

          return (
            <CircleMarker
              key={item.id}
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
            key={item.id}
            position={position}
            icon={createCustomIcon(isOnline || isSelected)}
            eventHandlers={{
              click: () => onViewHistory?.(item)
            }}
          >
            <Popup>
              <div className="min-w-[200px]">
                <h3 className="font-bold text-lg mb-2">{item.driver_name || item.name || `Vehicle ${item.license_plate || item.plate || item.id}`}</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Plate:</strong> {item.license_plate || item.plate || 'N/A'}</p>
                  <p><strong>Status:</strong>
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                      {isOnline ? 'Online' : 'Offline'}
                    </span>
                  </p>
                  {(item.speed !== undefined || item.velocity !== undefined) && (
                    <p><strong>Speed:</strong> {item.speed || item.velocity || 0} km/h</p>
                  )}
                  {(item.last_update || item.updated_at) && (
                    <p className="text-xs text-gray-500 mt-2">
                      Updated: {new Date(item.last_update || item.updated_at).toLocaleTimeString()}
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
