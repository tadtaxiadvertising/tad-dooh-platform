// admin-dashboard/components/MapView.tsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl, Polyline, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { VehiclePopup } from './ui/VehiclePopup';
import dynamic from 'next/dynamic';

const MarkerClusterGroup = dynamic(() => import('react-leaflet-cluster'), { ssr: false });

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
  const glow = isActive ? '0 0 15px rgba(255, 212, 0, 0.4)' : 'none';
  const W = 48;
  const H = 60;
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
      filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));
    ">
      <!-- Outer Pulse Ring -->
      ${isActive ? `
        <div style="
          position: absolute;
          width: 32px;
          height: 32px;
          border: 2px solid ${mainColor};
          border-radius: 50%;
          animation: map-pulse 2s infinite ease-out;
          opacity: 0;
        "></div>
      ` : ''}

      <!-- Car Body Stylized -->
      <div style="
        width: 28px;
        height: 42px;
        background: linear-gradient(135deg, ${mainColor} 0%, ${isActive ? '#ccaa00' : '#3f3f46'} 100%);
        border-radius: 8px;
        border: 1.5px solid ${selected ? '#fff' : 'rgba(0,0,0,0.4)'};
        box-shadow: ${glow}, inset 0 2px 4px rgba(255,255,255,0.2);
        display: flex;
        flex-direction: column;
        align-items: center;
        overflow: hidden;
      ">
        <!-- Windshield -->
        <div style="
          width: 20px;
          height: 10px;
          background: rgba(0,0,0,0.7);
          border-radius: 3px;
          margin-top: 4px;
          box-shadow: inset 0 1px 2px rgba(255,255,255,0.1);
        "></div>
        
        <!-- Label -->
        <div style="
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Inter', sans-serif;
          font-weight: 900;
          font-size: 9px;
          color: white;
          letter-spacing: -0.5px;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
          margin-top: -2px;
        ">
          ${short}
        </div>

        <!-- Rear Glass -->
        <div style="
          width: 18px;
          height: 4px;
          background: rgba(0,0,0,0.4);
          border-radius: 2px;
          margin-bottom: 2px;
        "></div>
      </div>

      <!-- Arrow Indicator for Selected -->
      ${selected ? `
        <div style="
          width: 0; 
          height: 0; 
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-bottom: 8px solid white;
          position: absolute;
          top: -12px;
        "></div>
      ` : ''}

      <style>
        @keyframes map-pulse {
          0% { transform: scale(0.6); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
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
  return L.divIcon({
    html: `<svg width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#111" stroke="#fad400" stroke-width="2"/><text x="20" y="24" text-anchor="middle" fill="#fad400" font-size="12" font-weight="bold">${n}</text></svg>`,
    className: '',
    iconSize: L.point(40, 40, true),
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
  onClearSelection,
  onViewHistory,
  onSyncCommand,
}) => {
  const [ready, setReady] = useState(false);

  useEffect(() => { setReady(true); }, []);

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
        maxZoom={19}
        minZoom={7}
        style={{ height: '100%', width: '100%', background: '#0a0a0a' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png"
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
        {mode === 'live' && (
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
        )}

        {/* HEATMAP DOTS */}
        {mode === 'heatmap' && heatmapData.map((pt: any, i) => (
          <CircleMarker
            key={i}
            center={[pt.lat, pt.lng]}
            radius={10}
            pathOptions={{ fillColor: '#fad400', fillOpacity: 0.35, color: '#fad400', weight: 1, opacity: 0.15 }}
          />
        ))}
      </MapContainer>

      <style jsx global>{`
        .leaflet-container { font-family: 'Outfit', sans-serif !important; background: #0a0a0a !important; }
        .popup-clean .leaflet-popup-content-wrapper { background: transparent !important; box-shadow: none !important; padding: 0 !important; }
        .popup-clean .leaflet-popup-content { margin: 0 !important; width: auto !important; }
        .popup-clean .leaflet-popup-tip-container { display: none !important; }
        .leaflet-control-zoom { border: none !important; margin: 20px !important; }
        .leaflet-control-zoom a {
          background: rgba(10,10,10,.9) !important;
          color: #fad400 !important;
          border: 1px solid rgba(255,255,255,.06) !important;
          width: 40px !important; height: 40px !important; line-height: 40px !important;
          border-radius: 10px !important;
          margin-bottom: 6px !important;
          font-weight: 700 !important;
          transition: background .2s, color .2s;
        }
        .leaflet-control-zoom a:hover { background: #fad400 !important; color: #000 !important; }
      `}</style>
    </div>
  );
};

export default MapView;
