// admin-dashboard/components/MapView.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl, GeoJSON, Polyline } from 'react-leaflet';
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
// CUSTOM MINIMALIST MARKER ICON (IMPROVED SIZE)
// ============================================
const createMinimalistIcon = (status: 'active' | 'offline' | 'unpaid', isSelected: boolean, zoom: number) => {
  const color = status === 'active' ? '#fad400' : status === 'unpaid' ? '#ef4444' : '#94a3b8';
  const shadow = status === 'active' ? 'rgba(250,212,0,0.6)' : status === 'unpaid' ? 'rgba(239,68,68,0.6)' : 'rgba(148,163,184,0.4)';
  
  // Scale size based on zoom to avoid "tiny dots" when zooming in
  const baseSize = zoom > 15 ? 45 : zoom > 12 ? 30 : 20;
  const size = isSelected ? baseSize * 1.4 : baseSize;
  const dotSize = zoom > 15 ? 18 : zoom > 12 ? 14 : 10;
  
  return L.divIcon({
    className: 'custom-minimalist-marker',
    html: `
      <div class="relative flex items-center justify-center transition-all duration-500" style="width: ${size}px; height: ${size}px;">
        <!-- Glowing Pulse (Selected or Active) -->
        ${(status === 'active' || isSelected) ? `
          <div class="absolute inset-0 rounded-full animate-ping" style="background: ${color}; opacity: ${isSelected ? 0.5 : 0.3}; animation-duration: ${isSelected ? '1.5s' : '2.5s'};"></div>
        ` : ''}
        
        <!-- Outer Aura -->
        <div class="absolute inset-0 rounded-full shadow-[0_0_20px_${shadow}]" style="background: ${color}; opacity: ${isSelected ? 0.3 : 0.15};"></div>
        
        <!-- Central Dot -->
        <div class="relative rounded-full border-2 border-white shadow-lg transition-all duration-500" 
             style="background: ${color}; z-index: 10; width: ${isSelected ? dotSize + 4 : dotSize}px; height: ${isSelected ? dotSize + 4 : dotSize}px;"></div>

        <!-- Spotlight Pointer -->
        ${isSelected ? `
           <div class="absolute -bottom-2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white"></div>
        ` : ''}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

const createClusterCustomIcon = (cluster: any) => {
  const count = cluster.getChildCount();
  return L.divIcon({
    html: `<div class="flex items-center justify-center w-10 h-10 rounded-full bg-black/80 border-2 border-tad-yellow text-tad-yellow text-xs font-black shadow-[0_0_20px_rgba(250,212,0,0.4)] backdrop-blur-md transition-transform hover:scale-110 duration-300">
            ${count}
          </div>`,
    className: 'custom-cluster-icon',
    iconSize: L.point(40, 40, true),
  });
};

interface MapLocation {
  deviceId?: string;
  taxiNumber?: string;
  lastLat?: number;
  lastLng?: number;
  isOnline?: boolean;
  subscriptionStatus?: string;
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

function MapController({ center, zoom, onMapClick, onZoomChange }: { center: [number, number], zoom: number, onMapClick: () => void, onZoomChange: (z: number) => void }) {
  const map = useMap();
  
  useEffect(() => {
    map.on('click', onMapClick);
    map.on('zoomend', () => onZoomChange(map.getZoom()));
    return () => { 
      map.off('click', onMapClick); 
      map.off('zoomend');
    };
  }, [map, onMapClick, onZoomChange]);

  useEffect(() => {
    const currentCenter = map.getCenter();
    const distance = L.latLng(center).distanceTo(currentCenter);

    if (distance < 100000) { 
        map.flyTo(center, zoom, { duration: 1.5, easeLinearity: 0.25, animate: true });
    } else {
        map.setView(center, zoom, { animate: false });
    }
  }, [center, zoom, map]);
  return null;
}

// NEON PROVINCE COLORS
const NEON_COLORS = [
  '#fad400', // Yellow
  '#00f2ff', // Cyan
  '#ff00ff', // Magenta
  '#39ff14', // Neon Green
  '#ff3131', // Neon Red
  '#bc13fe', // Neon Purple
  '#00d4ff'  // Sky Blue
];

const MapView: React.FC<MapViewProps> = ({ 
  locations = [], 
  heatmapData = [], 
  center = [18.4861, -69.9312], 
  zoom: initialZoom = 13,
  mode = 'live',
  selectedId = null,
  recentPath = [],
  onClearSelection,
  onViewHistory,
  onSyncCommand
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [provincesGeoJSON, setProvincesGeoJSON] = useState<any>(null);
  const [currentZoom, setCurrentZoom] = useState(initialZoom);

  useEffect(() => {
    setIsMounted(true);
    fetch('/geo/provinces.json')
      .then(res => res.json())
      .then(data => setProvincesGeoJSON(data))
      .catch(err => console.error('GeoJSON Load failed:', err));
  }, []);

  const trailCoordinates = useMemo(() => {
    if (!recentPath || recentPath.length < 2) return [];
    return recentPath.map(p => [p.latitude, p.longitude] as [number, number]);
  }, [recentPath]);

  if (!isMounted) return (
    <div className="w-full h-full bg-[#070707] flex items-center justify-center">
       <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-tad-yellow/20 border-t-tad-yellow rounded-full animate-spin" />
          <p className="text-[10px] font-black text-tad-yellow uppercase tracking-widest animate-pulse">Initializing Master Console Map...</p>
       </div>
    </div>
  );

  return (
    <div className="w-full h-full relative group">
      {/* SPOTLIGHT OVERLAY */}
      <div className={`absolute inset-0 bg-black/40 z-[1] pointer-events-none transition-opacity duration-1000 ${selectedId ? 'opacity-100' : 'opacity-0'}`} />

      <MapContainer 
        center={center} 
        zoom={initialZoom} 
        maxZoom={19}
        minZoom={7}
        style={{ height: '100%', width: '100%', background: '#070707' }}
        zoomControl={false}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png"
          className="map-tiles-filter"
        />
        
        <ZoomControl position="bottomright" />
        <MapController 
          center={center} 
          zoom={initialZoom} 
          onMapClick={() => onClearSelection?.()} 
          onZoomChange={(z) => setCurrentZoom(z)}
        />

        {provincesGeoJSON && (
           <GeoJSON 
             data={provincesGeoJSON} 
             style={(feature) => {
               // Assign a stable neon color based on feature index or name
               const idx = provincesGeoJSON.features?.indexOf(feature) || 0;
               const neonColor = NEON_COLORS[idx % NEON_COLORS.length];
               
               return {
                 color: neonColor,
                 weight: 3,
                 opacity: selectedId ? 0.2 : 0.6,
                 fillOpacity: 0,
                 dashArray: '5, 10'
               };
             }}
           />
        )}

        {/* VEHICLE RECENT TRAIL (Glow Path) */}
        {selectedId && trailCoordinates.length > 0 && (
           <>
              <Polyline 
                positions={trailCoordinates} 
                pathOptions={{ color: '#fad400', weight: 8, opacity: 0.1, lineCap: 'round', lineJoin: 'round' }} 
              />
              <Polyline 
                positions={trailCoordinates} 
                pathOptions={{ color: '#fad400', weight: 2, opacity: 0.6, dashArray: '5, 10', lineCap: 'round', lineJoin: 'round' }} 
              />
           </>
        )}

        {mode === 'live' && (
          <MarkerClusterGroup
            chunkedLoading
            iconCreateFunction={createClusterCustomIcon}
            maxClusterRadius={50}
            showCoverageOnHover={false}
          >
            {locations.map((loc, idx) => {
              if (!loc.lastLat || !loc.lastLng) return null;
              const isSelected = selectedId === loc.deviceId;
              const status = !loc.isOnline ? 'offline' : loc.subscriptionStatus !== 'ACTIVE' ? 'unpaid' : 'active';
              
              // Key change here: passing currentZoom to keep icons visible when zooming in
              const icon = createMinimalistIcon(status, isSelected, currentZoom);

              return (
                <Marker 
                  key={loc.deviceId || idx} 
                  position={[loc.lastLat, loc.lastLng]}
                  icon={icon}
                  zIndexOffset={isSelected ? 1000 : 0}
                >
                  <Popup className="custom-popup-premium" offset={[0, isSelected ? -20 : -10]}>
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

        {mode === 'heatmap' && heatmapData.map((point: any, idx) => (
           <Marker 
             key={idx} 
             position={[point.lat, point.lng]}
             icon={L.divIcon({
                className: 'heat-dot',
                html: `<div style="background: linear-gradient(to bottom, #fad400, #f87171); width: 24px; height: 24px; border-radius: 50%; filter: blur(6px); opacity: 0.4;"></div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
             })}
           />
        ))}
      </MapContainer>

      <style jsx global>{`
        .map-tiles-filter { filter: contrast(1.1) brightness(0.9) saturate(0.8); transition: filter 1s ease; }
        ${selectedId ? '.map-tiles-filter { filter: contrast(1.1) brightness(0.5) saturate(0.5); }' : ''}
        .custom-popup-premium .leaflet-popup-content-wrapper { background: transparent !important; box-shadow: none !important; padding: 0 !important; }
        .custom-popup-premium .leaflet-popup-content { margin: 0 !important; width: auto !important; }
        .custom-popup-premium .leaflet-popup-tip-container { display: none !important; }
        .leaflet-container { font-family: 'Outfit', sans-serif !important; background: #070707 !important; border-radius: 0 !important; }
        
        .leaflet-control-zoom { border: none !important; margin: 30px !important; }
        .leaflet-control-zoom-in, .leaflet-control-zoom-out { 
           background: rgba(0,0,0,0.85) !important; 
           color: #fad400 !important; 
           border: 1px solid rgba(255,255,255,0.05) !important; 
           width: 44px !important; 
           height: 44px !important; 
           line-height: 44px !important; 
           border-radius: 12px !important; 
           margin-bottom: 8px !important; 
           transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
           backdrop-filter: blur(12px);
           font-weight: black !important;
        }
        .leaflet-control-zoom-in:hover, .leaflet-control-zoom-out:hover { 
           background: #fad400 !important; 
           color: #000 !important; 
           border-color: #fad400 !important; 
           transform: translateY(-2px);
           box-shadow: 0 10px 25px rgba(250,212,0,0.3);
        }
      `}</style>
    </div>
  );
};

export default MapView;
