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
// SIMPLE SVG MARKER — Clean, performant, no Tailwind dependency
// ============================================
const COLORS: Record<string, string> = {
  active: '#fad400',
  offline: '#6b7280',
  unpaid: '#ef4444',
};

const createIcon = (status: string, selected: boolean) => {
  const c = COLORS[status] || COLORS.offline;
  const r = selected ? 10 : 7;
  const s = selected ? 36 : 26;
  const glow = selected ? `<circle cx="${s/2}" cy="${s/2}" r="${r+6}" fill="${c}" opacity=".2"><animate attributeName="r" values="${r+6};${r+10};${r+6}" dur="2s" repeatCount="indefinite"/></circle>` : '';

  return L.divIcon({
    className: '',
    html: `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" xmlns="http://www.w3.org/2000/svg">
      ${glow}
      <circle cx="${s/2}" cy="${s/2}" r="${r}" fill="${c}" stroke="#fff" stroke-width="2"/>
    </svg>`,
    iconSize: [s, s],
    iconAnchor: [s / 2, s / 2],
    popupAnchor: [0, -(s / 2)],
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

              return (
                <Marker
                  key={loc.deviceId || i}
                  position={[loc.lastLat, loc.lastLng]}
                  icon={createIcon(status, sel)}
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
