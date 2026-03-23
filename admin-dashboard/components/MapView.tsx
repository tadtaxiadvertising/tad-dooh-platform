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

// Coordenadas aproximadas del Polígono Central de Santo Domingo
const POLIGONO_CENTRAL: [number, number][] = [
  [18.4868, -69.9452], // Noroeste (Kennedy con Lincoln)
  [18.4900, -69.9200], // Noreste (Kennedy con Gomez)
  [18.4650, -69.9150], // Sureste (27 con Gomez)
  [18.4630, -69.9400], // Suroeste (27 con Lincoln)
];

// label = taxi number e.g. "T-01", trimmed to fit
const createIcon = (status: string, selected: boolean, label = '') => {
  const fill   = COLORS[status] || COLORS.offline;
  const stroke = selected ? '#ffffff' : 'rgba(0,0,0,0.4)';
  const sw     = selected ? 2.5 : 1.5;
  // Pin total size. Selected is bigger.
  const W = selected ? 52 : 40;
  const H = selected ? 64 : 50;
  // Circle radius inside pin head
  const R = selected ? 17 : 13;
  // Center of circle (top section of teardrop)
  const cx = W / 2;
  const cy = R + 4;
  // Tip of the pin (bottom point)
  const tipY = H - 2;
  // Short label (max 4 chars to fit)
  const short = label ? label.replace(/^TAD[-_]?/i, '').replace(/TADSTI[-_]?/i, '').substring(0, 5) : '?';
  const fs = selected ? 9 : 7;

  const glowAnim = selected
    ? `<circle cx="${cx}" cy="${cy}" r="${R + 8}" fill="${fill}" opacity="0.25">
        <animate attributeName="r" values="${R+6};${R+14};${R+6}" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.25;0.05;0.25" dur="2s" repeatCount="indefinite"/>
       </circle>`
    : '';

  // Teardrop path: circle top + converging lines to tip
  const leftX  = cx - R * 0.7;
  const rightX = cx + R * 0.7;
  const baseY  = cy + R * 0.9;

  return L.divIcon({
    className: '',
    html: `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="overflow:visible;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.6))">
      ${glowAnim}
      <!-- Pin body: circle + triangle point -->
      <circle cx="${cx}" cy="${cy}" r="${R}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
      <polygon points="${leftX},${baseY} ${rightX},${baseY} ${cx},${tipY}"
               fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>
      <!-- Taxi icon: simple car silhouette (top-down from Segoe / Unicode) -->
      <text x="${cx}" y="${cy + fs * 0.38}" 
            text-anchor="middle" dominant-baseline="middle"
            font-family="system-ui,sans-serif" font-size="${fs}" font-weight="800"
            fill="#ffffff" letter-spacing="-0.5">${short}</text>
      <!-- Small status dot at top-right of circle -->
      <circle cx="${cx + R - 3}" cy="${cy - R + 3}" r="3.5"
              fill="${status === 'active' ? '#22c55e' : status === 'unpaid' ? '#f97316' : '#94a3b8'}"
              stroke="#000" stroke-width="1"/>
    </svg>`,
    iconSize:    [W, H],
    iconAnchor:  [W / 2, H],
    popupAnchor: [0, -H],
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

// ============================================
// MAIN COMPONENT
// ============================================
const MapView: React.FC<MapViewProps> = ({
  locations = [],
  heatmapData = [],
  center = [18.4861, -69.9312],
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

  const trail = useMemo(() => {
    if (!recentPath || recentPath.length < 2) return [];
    return recentPath.map((p) => [p.latitude, p.longitude] as [number, number]);
  }, [recentPath]);

  const handleClear = useCallback(() => onClearSelection?.(), [onClearSelection]);

  if (!ready) return (
    <div className="w-full h-full bg-[#0a0a0a] flex items-center justify-center">
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
              const status = !loc.isOnline ? 'offline' : loc.subscriptionStatus !== 'ACTIVE' ? 'unpaid' : 'active';

              const label = loc.taxiNumber || loc.deviceId?.replace(/TADSTI-?/i, '') || '?';
              return (
                <Marker
                  key={loc.deviceId || i}
                  position={[loc.lastLat, loc.lastLng]}
                  icon={createIcon(status, sel, label)}
                  zIndexOffset={sel ? 1000 : 0}
                >
                  <Popup className="popup-clean" offset={[0, -12]}>
                    <VehiclePopup
                      device={loc as any}
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
