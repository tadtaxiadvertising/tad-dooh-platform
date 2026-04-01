// admin-dashboard/components/MapView.tsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl, Polyline, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { VehiclePopup } from './ui/VehiclePopup';
import clsx from 'clsx';
import dynamic from 'next/dynamic';

const MarkerClusterGroup = dynamic(() => import('react-leaflet-cluster'), { ssr: false });
const HeatmapLayer = dynamic(() => import('./map/HeatmapLayer'), { ssr: false });

// Fix for default marker icons in Leaflet with Next.js
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// ============================================
// TAXI PIN MARKER — Pin shape with white taxi ID label
// ============================================
const COLORS: Record<string, string> = {
  active:  '#fad400',
  offline: '#52525b',
  unpaid:  '#ef4444',
};

// Coordenadas aproximadas del Centro de Santiago (Monumento y alrededores)
const POLIGONO_CENTRAL: [number, number][] = [
  [19.4630, -70.7050], // Noroeste
  [19.4650, -70.6750], // Noreste
  [19.4400, -70.6780], // Sureste
  [19.4380, -70.7020], // Suroeste
];

// Creates a premium cyber-taxi icon
const createIcon = (status: string, selected: boolean, label = '') => {
  const isActive = status === 'active';
  const mainColor = isActive ? '#FFD400' : '#52525b';
  const glow = isActive ? '0 0 25px rgba(255, 212, 0, 0.6)' : 'none';
  const W = 52;
  const H = 64;
  const short = label ? label.replace(/^STI0/i, '').replace(/^STI/i, '').substring(0, 3) : '?';
  
  const html = `
    <div style="
      position: relative;
      width: ${W}px;
      height: ${H}px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      perspective: 1000px;
    ">
      <!-- Radar Pulse Ring -->
      ${isActive ? `
        <div class="map-pulse-ring" style="border: 1.5px solid ${mainColor}"></div>
        <div class="map-pulse-ring" style="border: 1.5px solid ${mainColor}; animation-delay: 0.8s;"></div>
      ` : ''}

      <!-- 3D-Look Car Container -->
      <div style="
        width: 30px;
        height: 44px;
        background: linear-gradient(145deg, ${mainColor} 0%, ${isActive ? '#ccaa00' : '#27272a'} 100%);
        border-radius: 10px;
        border: 2px solid ${selected ? '#fff' : 'rgba(0,0,0,0.6)'};
        box-shadow: ${glow}, 0 10px 20px rgba(0,0,0,0.5);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        padding: 4px 0;
        transform: ${selected ? 'scale(1.1) translateZ(20px)' : 'scale(1)'};
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 2;
      ">
        <!-- Roof/Antenna Detail -->
        <div style="width: 12px; height: 1.5px; background: rgba(0,0,0,0.3); border-radius: 1px;"></div>
        
        <!-- Center ID Label -->
        <div style="
          font-family: 'Inter', sans-serif;
          font-weight: 950;
          font-size: 10px;
          color: ${isActive ? 'white' : '#71717a'};
          letter-spacing: -0.5px;
          text-shadow: 0 1px 3px rgba(0,0,0,0.8);
          transform: skew(-5deg);
        ">
          ${short}
        </div>

        <!-- Light Bar / Tail lights -->
        <div style="
          width: 22px; 
          height: 3px; 
          background: ${isActive ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}; 
          border-radius: 2px;
          box-shadow: ${isActive ? '0 -2px 5px rgba(255,255,255,0.3)' : 'none'};
        "></div>
      </div>

      <!-- Arrow Indicator for Selected (Cyber style) -->
      ${selected ? `
        <div style="
          width: 2px; 
          height: 12px; 
          background: white;
          box-shadow: 0 0 10px white;
          position: absolute;
          top: -20px;
          animation: map-float 1.5s infinite ease-in-out;
        "></div>
      ` : ''}

      <style>
        .map-pulse-ring {
          position: absolute;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          animation: map-pulse 2.5s infinite linear;
          opacity: 0;
        }
        @keyframes map-pulse {
          0% { transform: scale(0.6); opacity: 0; }
          20% { opacity: 0.8; }
          100% { transform: scale(3.5); opacity: 0; }
        }
        @keyframes map-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      </style>
    </div>
  `;

  return L.divIcon({
    className: '',
    html,
    iconSize: [W, H],
    iconAnchor: [W / 2, H / 2],
    popupAnchor: [0, -H / 2],
  });
};

const createClusterIcon = (cluster: any) => {
  const n = cluster.getChildCount();
  const size = n < 10 ? 44 : n < 50 ? 52 : 64;
  return L.divIcon({
    html: `
      <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; inset: 0; background: rgba(250,212,0,0.1); border: 2.5px solid #fad400; border-radius: 50%; box-shadow: 0 0 20px rgba(250,212,0,0.3); animation: cluster-spin 10s infinite linear;"></div>
        <div style="position: relative; font-family: 'Inter', sans-serif; font-weight: 950; font-size: 13px; color: #fad400; text-shadow: 0 0 10px rgba(250,212,0,0.5);">${n}</div>
        <style>
          @keyframes cluster-spin {
             from { transform: rotate(0deg); } to { transform: rotate(360deg); }
          }
        </style>
      </div>
    `,
    className: '',
    iconSize: L.point(size, size, true),
  });
};

// ============================================
// INTERFACES
// ============================================
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
  heatmapData?: any[];
  center?: [number, number];
  zoom?: number;
  mode?: 'live' | 'heatmap';
  selectedId?: string | null;
  recentPath?: any[];
  mapTheme?: 'dark' | 'light';
  heatmapIntensity?: number;
  heatmapRadius?: number;
  onClearSelection?: () => void;
  onViewHistory?: (v: MapLocation) => void;
  onSyncCommand?: (v: MapLocation) => void;
}

// ============================================
// MAP CONTROLLER — handles camera + events
// ============================================
function MapController({ center, zoom, onMapClick }: { center: [number, number]; zoom: number; onMapClick: () => void }) {
  const map = useMap();

  useEffect(() => {
    map.on('click', onMapClick);
    return () => { map.off('click', onMapClick); };
  }, [map, onMapClick]);

  useEffect(() => {
    const dist = L.latLng(center).distanceTo(map.getCenter());
    if (dist < 100_000) {
      map.flyTo(center, zoom, { duration: 1.2, animate: true });
    } else {
      map.setView(center, zoom, { animate: false });
    }
  }, [center, zoom, map]);

  return null;
}

function GeofenceLayer() {
  return (
    <Polyline
      positions={[...POLIGONO_CENTRAL, POLIGONO_CENTRAL[0]]}
      pathOptions={{
        color: '#fad400',
        weight: 1,
        dashArray: '10, 10',
        fillColor: '#fad400',
        fillOpacity: 0.03,
      }}
    />
  );
}

const MapView: React.FC<MapViewProps> = ({
  locations = [],
  heatmapData = [],
  center = [19.4544, -70.6923], // Santiago, RD
  zoom = 13,
  mode = 'live',
  selectedId = null,
  recentPath = [],
  mapTheme = 'dark',
  heatmapIntensity = 0.5,
  heatmapRadius = 28,
  onClearSelection,
  onViewHistory,
  onSyncCommand,
}) => {
  const [ready, setReady] = useState(false);

  useEffect(() => { 
    setReady(true); 
  }, []);

  // Función Ray-Casting para detectar punto en polígono
  const isPointInPolygon = useCallback((lat: number, lng: number) => {
    let intersect = false;
    for (let i = 0, j = POLIGONO_CENTRAL.length - 1; i < POLIGONO_CENTRAL.length; j = i++) {
      const xi = POLIGONO_CENTRAL[i][0], yi = POLIGONO_CENTRAL[i][1];
      const xj = POLIGONO_CENTRAL[j][0], yj = POLIGONO_CENTRAL[j][1];
      const intersectPoint = ((yi > lng) !== (yj > lng)) && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
      if (intersectPoint) intersect = !intersect;
    }
    return intersect;
  }, []);

  const trail = useMemo(() => {
    if (!recentPath || recentPath.length < 2) return [];
    return recentPath.map((p) => [p.latitude, p.longitude] as [number, number]);
  }, [recentPath]);

  const handleClear = useCallback(() => onClearSelection?.(), [onClearSelection]);

  if (!ready) return (
    <div className="w-full h-full bg-[#171719] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-tad-yellow/20 border-t-tad-yellow rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={center}
        zoom={zoom}
        maxZoom={18}
        minZoom={7}
        style={{ height: '100%', width: '100%', background: '#0a0a0b' }}
        zoomControl={false}
      >
        <TileLayer
          key={mapTheme}
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={mapTheme === 'dark' 
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          }
          maxZoom={18}
        />

        <ZoomControl position="bottomright" />
        <MapController center={center} zoom={zoom} onMapClick={handleClear} />
        
        {/* GEOFENCE LAYER — Cobertura Oficial */}
        <GeofenceLayer />

        {/* TRAIL — shown when vehicle is selected */}
        {selectedId && trail.length > 0 && (
          <Polyline
            positions={trail}
            pathOptions={{ color: '#fad400', weight: 3, opacity: 0.7, dashArray: '6,8', lineCap: 'round' }}
          />
        )}

        {/* LIVE MARKERS */}
        {mode === 'live' && useMemo(() => (
          <MarkerClusterGroup chunkedLoading iconCreateFunction={createClusterIcon} maxClusterRadius={50} showCoverageOnHover={false}>
            {locations.map((loc, i) => {
              if (!loc.lastLat || !loc.lastLng) return null;
              const sel = selectedId === loc.deviceId;
              const inFence = loc.lastLat && loc.lastLng ? isPointInPolygon(loc.lastLat, loc.lastLng) : true;
              const status = !loc.isOnline ? 'offline' : loc.subscriptionStatus !== 'ACTIVE' ? 'unpaid' : 'active';
              
              // Si está fuera de rango y online, forzamos alerta
              const markerStatus = (loc.isOnline && !inFence) ? 'unpaid' : status;

              const label = loc.taxiNumber || loc.deviceId?.replace(/TADSTI-?/i, '') || '?';
              return (
                <Marker
                  key={loc.deviceId || i}
                  position={[loc.lastLat, loc.lastLng]}
                  icon={createIcon(markerStatus, sel, label)}
                  zIndexOffset={sel ? 1000 : 0}
                >
                  <Popup className="popup-clean" offset={[0, -12]}>
                    <VehiclePopup
                      device={{...loc, isOutsideFence: !inFence} as any}
                      onViewHistory={() => onViewHistory?.(loc)}
                      onSyncCommand={() => onSyncCommand?.(loc)}
                    />
                  </Popup>
                </Marker>
              );
            })}
          </MarkerClusterGroup>
        ), [locations, selectedId, isPointInPolygon, onViewHistory, onSyncCommand])}

        {/* HEATMAP — Optimized Layer */}
        {mode === 'heatmap' && heatmapData.length > 0 && (
          <HeatmapLayer 
            points={heatmapData.map(p => [p.lat, p.lng, (p.count || 1) / 100])}
            radius={heatmapRadius}
            blur={Math.max(15, heatmapRadius * 0.7)}
            max={heatmapIntensity}
            gradient={{
              0.2: 'rgba(250, 212, 0, 0.05)',
              0.4: 'rgba(250, 212, 0, 0.25)',
              0.6: 'rgba(250, 212, 0, 0.55)',
              0.8: 'rgba(250, 212, 0, 0.85)',
              1.0: '#ffffff'
            }}
          />
        )}
      </MapContainer>

      {/* NEW: HIGH-TECH OVERLAYS */}
      <div className={clsx(
        "absolute inset-0 pointer-events-none z-[1000] transition-opacity duration-700",
        mapTheme === 'light' ? 'opacity-30' : 'opacity-100'
      )}>
        {/* Vignette Blur / Fade to Dashboard (Softer centering) */}
        <div className="absolute inset-0 shadow-[inset_0_0_200px_rgba(0,0,0,0.95)] opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0b] via-transparent to-[#0a0a0b] opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0b] via-transparent to-[#0a0a0b] opacity-25" />
        
        {/* Animated Scanline (Subtle) */}
        {mapTheme === 'dark' && (
          <div className="absolute top-0 left-0 w-full h-[80px] bg-gradient-to-b from-transparent via-tad-yellow/5 to-transparent animate-map-scan" />
        )}
        
        {/* Corner Accents */}
        <div className="absolute top-8 left-8 w-12 h-12 border-t-2 border-l-2 border-white/10 rounded-tl-2xl" />
        <div className="absolute top-8 right-16 w-12 h-12 border-t-2 border-r-2 border-white/10 rounded-tr-2xl" />
        <div className="absolute bottom-8 left-8 w-12 h-12 border-b-2 border-l-2 border-white/10 rounded-bl-2xl" />
        <div className="absolute bottom-8 right-24 w-12 h-12 border-b-2 border-r-2 border-white/10 rounded-br-2xl" />
      </div>

      {/* MAP THEME TOGGLE is now managed by parent page — button removed from MapView */}

      <style jsx global>{`
        .leaflet-container { font-family: 'Outfit', sans-serif !important; background: #0a0a0a !important; }
        .popup-clean .leaflet-popup-content-wrapper { background: transparent !important; box-shadow: none !important; padding: 0 !important; }
        .popup-clean .leaflet-popup-content { margin: 0 !important; width: auto !important; }
        .popup-clean .leaflet-popup-tip-container { display: none !important; }
        .leaflet-control-zoom { border: none !important; margin: 30px !important; }
        .leaflet-control-zoom a {
          background: rgba(10,10,10,.9) !important;
          color: #fad400 !important;
          border: 1px solid rgba(255,255,255,.06) !important;
          width: 44px !important; height: 44px !important; line-height: 44px !important;
          border-radius: 12px !important;
          margin-bottom: 8px !important;
          font-weight: 900 !important;
          transition: all .3s;
          backdrop-blur: 10px;
        }
        .leaflet-control-zoom a:hover { 
          background: #fad400 !important; 
          color: #000 !important; 
          transform: translateY(-2px);
          shadow: 0 10px 20px rgba(250,212,0,0.3);
        }
        
        @keyframes map-scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(800% ); }
        }
      `}</style>
    </div>
  );
};

export default MapView;
