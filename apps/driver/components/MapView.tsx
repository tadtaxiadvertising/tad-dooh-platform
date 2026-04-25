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

// Status-driven number colors: yellow = on/active, red = off
const NUMBER_COLOR_ACTIVE  = '#eab308'; // Yellow — encendido
const NUMBER_COLOR_OFFLINE = '#dc2626'; // Red   — apagado

// Coordenadas aproximadas del Centro de Santiago (Monumento y alrededores)
const POLIGONO_CENTRAL: [number, number][] = [
  [19.4630, -70.7050], // Noroeste
  [19.4650, -70.6750], // Noreste
  [19.4400, -70.6780], // Sureste
  [19.4380, -70.7020], // Suroeste
];

/**
 * createIcon — Taxi/Screen map marker
 *
 * Color rules (per design spec):
 *  • Number color : yellow (#eab308) = encendido/active  |  red (#dc2626) = apagado/offline
 *  • Car body     : white gradient in dark-map mode  |  dark/black gradient in light-map mode
 *  • Headlights   : match number color (yellow/red)
 *  • Taillights   : always red (#dc2626)
 */
const createIcon = (
  status: string,
  selected: boolean,
  label = '',
  lastSeen?: string | null,
  deviceId = '',
  mapTheme: 'dark' | 'light' = 'dark',
) => {
  const isActive = status === 'active';
  const W = 52;
  const H = 64;
  const short = label ? label.replace(/^STI0/i, '').replace(/^STI/i, '').substring(0, 3) : '?';
  const safeId = (deviceId || label || 'v').replace(/[^a-zA-Z0-9]/g, '');

  // ── Number & headlight color: simple binary rule ─────────────────────────
  const numberColor = isActive ? NUMBER_COLOR_ACTIVE : NUMBER_COLOR_OFFLINE;
  const textGlow    = isActive
    ? '0 0 10px rgba(234,179,8,0.85)'
    : '0 0 8px rgba(220,38,38,0.7)';

  // ── Car body colors adapt to map theme ───────────────────────────────────
  const bodyGrad = mapTheme === 'dark'
    ? { from: '#f1f5f9', mid: '#ffffff', to: '#e2e8f0' }  // white body
    : { from: '#1e293b', mid: '#0f172a', to: '#0a0a0b' }; // black body

  const bodyStroke  = mapTheme === 'dark' ? '#cbd5e1' : '#374151';
  const screenFill  = mapTheme === 'dark' ? '#f8fafc' : '#1e293b';
  const screenStrok = mapTheme === 'dark' ? '#e2e8f0' : '#334155';
  const shineStroke = mapTheme === 'dark' ? '#e2e8f0' : '#475569';
  const shineOpacity = mapTheme === 'dark' ? '0.6' : '0.3';
  const glassGrad = { from: '#1e293b', to: '#020617' };

  const pulseColor = isActive ? numberColor : 'transparent';

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
      <!-- Radar Pulse Ring (only when active) -->
      ${isActive ? `
        <div class="map-pulse-ring" style="border: 1.5px solid ${pulseColor}"></div>
        <div class="map-pulse-ring" style="border: 1.5px solid ${pulseColor}; animation-delay: 0.8s;"></div>
      ` : ''}

      <!-- Car SVG Container -->
      <div style="
        width: 35px;
        height: 45px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        transform: ${selected ? 'scale(1.15)' : 'scale(1)'};
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 2;
        filter: ${selected ? `drop-shadow(0 0 8px ${numberColor}80)` : 'none'};
      ">
        <svg width="100%" height="100%" viewBox="0 0 140 180" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="ds-${safeId}" x="-30%" y="-20%" width="160%" height="150%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000000" flood-opacity="0.35"/>
            </filter>
            <filter id="ts-${safeId}" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#000000" flood-opacity="0.25"/>
            </filter>
            <linearGradient id="bg-${safeId}" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stop-color="${bodyGrad.from}"/>
              <stop offset="50%"  stop-color="${bodyGrad.mid}"/>
              <stop offset="100%" stop-color="${bodyGrad.to}"/>
            </linearGradient>
            <linearGradient id="gg-${safeId}" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stop-color="${glassGrad.from}"/>
              <stop offset="100%" stop-color="${glassGrad.to}"/>
            </linearGradient>
          </defs>

          <rect x="25" y="10" width="90" height="160" rx="20" fill="url(#bg-${safeId})" stroke="${bodyStroke}" stroke-width="1" filter="url(#ds-${safeId})"/>
          <path d="M 32 60 Q 32 30 50 20" fill="none" stroke="${shineStroke}" stroke-width="2" stroke-linecap="round" opacity="${shineOpacity}"/>
          <path d="M 45 45 Q 70 38 95 45 L 96 58 Q 70 65 44 58 Z" fill="url(#gg-${safeId})"/>
          <rect x="30" y="65" width="80" height="55" rx="6" fill="${screenFill}" stroke="${screenStrok}" stroke-width="0.5"/>
          
          <text x="70" y="104" font-family="Inter, system-ui, -apple-system, sans-serif" font-size="36" font-weight="900" fill="${numberColor}" text-anchor="middle" letter-spacing="-1.5" filter="url(#ts-${safeId})" style="text-shadow: ${textGlow};">${short}</text>

          <path d="M 45 130 Q 70 123 95 130 L 96 143 Q 70 150 44 143 Z" fill="url(#gg-${safeId})"/>
          <rect x="42" y="15" width="16" height="5" rx="2" fill="${numberColor}"/>
          <rect x="82" y="15" width="16" height="5" rx="2" fill="${numberColor}"/>
          <rect x="42" y="160" width="18" height="5" rx="2" fill="#dc2626"/>
          <rect x="80" y="160" width="18" height="5" rx="2" fill="#dc2626"/>
          <path d="M 60 18 Q 70 15 80 18" fill="none" stroke="${shineStroke}" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </div>

      ${selected ? `
        <div style="
          width: 2px;
          height: 12px;
          background: ${numberColor};
          box-shadow: 0 0 10px ${numberColor};
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
          0%   { transform: scale(0.6); opacity: 0; }
          20%  { opacity: 0.8; }
          100% { transform: scale(3.5); opacity: 0; }
        }
        @keyframes map-float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-5px); }
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

  const liveMarkers = useMemo(() => {
    if (mode !== 'live') return null;
    return (
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
              icon={createIcon(markerStatus, sel, label, loc.lastSeen, loc.deviceId, mapTheme)}
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
    );
  }, [mode, locations, selectedId, isPointInPolygon, onViewHistory, onSyncCommand, mapTheme]);

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
        {liveMarkers}

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
        .leaflet-tile { border: none !important; opacity: 1 !important; outline: none !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; }
        .leaflet-tile-container { border: none !important; outline: none !important; }
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
          backdrop-filter: blur(10px);
        }
        .leaflet-control-zoom a:hover { 
          background: #fad400 !important; 
          color: #000 !important; 
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(250,212,0,0.3);
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




