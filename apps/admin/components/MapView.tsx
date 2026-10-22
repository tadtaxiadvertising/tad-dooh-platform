"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  CircleMarker,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { TaxiData } from "@/types/tracking";
import { getDriverStatusInfo } from "@/utils/driverStatus";
import { VehiclePopup } from "@/components/ui/VehiclePopup";

interface MapLocation {
  id?: string;
  deviceId?: string;
  taxiNumber?: string;
  lastLat?: number;
  lastLng?: number;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  lon?: number;
  isOnline?: boolean;
  city?: string;
  driverName?: string;
  phone?: string;
  plate?: string;
  batteryLevel?: number | null;
  lastSeen?: string | null;
  subscriptionStatus?: string;
  subscriptionEnd?: string | null;
  driverStatus?: string;
  speed?: number;
  assignedAdvertiser?: string;
  assignedCampaign?: string;
  assignedCampaignId?: string;
}

interface MapViewProps {
  // Legacy props
  taxis?: TaxiData[];
  center?: [number, number];
  zoom?: number;
  heatmapMode?: boolean;

  // New props from realtime.tsx
  locations?: any[];
  heatmapData?: any[];
  mode?: "normal" | "heatmap" | "live";
  mapTheme?: "light" | "dark";
  heatmapIntensity?: number;
  heatmapRadius?: number;
  selectedId?: string | null;
  recentPath?: any[];
  onClearSelection?: () => void;
  onViewHistory?: (v: any) => void;
  onSyncCommand?: (deviceId: string) => void;
}

// ─────────────────────────────────────────────────────────────────────
// 3-STATUS MARKER ICON (Green/Yellow/Red based on connection)
// ─────────────────────────────────────────────────────────────────────
const createStatusIcon = (
  isOnline: boolean,
  lastSeen?: string | null,
  isSelected?: boolean,
  taxiNumber?: string,
  deviceId?: string,
): L.DivIcon => {
  const statusInfo = getDriverStatusInfo(isOnline, lastSeen);
  const color = statusInfo.color;
  const shadowColor = statusInfo.shadowColor;
  const shortLabel = (taxiNumber || deviceId || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-3)
    .toUpperCase();

  const scale = isSelected ? 1.15 : 1;
  const pulse = isOnline
    ? `
    <div style="position:absolute;inset:-6px;border-radius:50%;border:2px solid ${color};opacity:0;animation:markerPulse 2s ease-out infinite;"></div>
  `
    : "";

  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;width:40px;height:40px;transform:scale(${scale});transition:transform 0.3s ease;">
        ${pulse}
        <div style="
          width:36px;height:36px;border-radius:50%;
          background:${color};
          border:3px solid rgba(255,255,255,0.9);
          box-shadow:0 2px 12px ${shadowColor}66, 0 0 ${isSelected ? 20 : 0}px ${shadowColor}44;
          display:flex;align-items:center;justify-content:center;
          font-family:'Inter',sans-serif;font-size:11px;font-weight:900;
          color:#000;text-align:center;line-height:1;
        ">
          ${shortLabel}
        </div>
        <style>
          @keyframes markerPulse {
            0% { opacity:0.6;transform:scale(1); }
            100% { opacity:0;transform:scale(1.8); }
          }
        </style>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

// Heatmap cluster icon
const createClusterIcon = (cluster: L.MarkerCluster) => {
  const count = cluster.getChildCount();
  let size = 40;
  if (count > 50) size = 60;
  else if (count > 20) size = 50;

  return L.divIcon({
    html: `
      <div style="
        width:${size}px;height:${size}px;border-radius:50%;
        background:#fad400;border:2px solid rgba(255,255,255,0.2);
        display:flex;align-items:center;justify-content:center;
        font-family:'Inter',sans-serif;font-size:${size > 50 ? 14 : 11}px;font-weight:900;
        color:#000;box-shadow:0 0 15px rgba(250,212,0,0.3);
      ">
        ${count}
      </div>
    `,
    className: "custom-cluster",
    iconSize: [size, size],
  });
};

// Component to update map view based on props
function MapUpdater({
  center,
  zoom,
}: {
  center?: [number, number];
  zoom?: number;
}) {
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
  center = [18.4861, -69.9312],
  zoom = 12,
  heatmapMode = false,
  mode = "normal",
  mapTheme = "dark",
  heatmapIntensity = 0.5,
  heatmapRadius = 25,
  selectedId,
  recentPath = [],
  onClearSelection,
  onViewHistory,
  onSyncCommand,
}: MapViewProps) {
  const [isClient, setIsClient] = useState(false);
  const [darkMode, setDarkMode] = useState(mapTheme === "dark");

  useEffect(() => {
    setIsClient(true);
  }, []);

  // The map has its own explicit theme control. Do not override it with the
  // document/system theme; keep the raster tiles and controls in sync with props.
  useEffect(() => {
    setDarkMode(mapTheme === "dark");
  }, [mapTheme]);

  if (!isClient) {
    return (
      <div className="w-full h-full bg-[#07080d] flex items-center justify-center">
        <div className="text-gray-400">Loading map...</div>
      </div>
    );
  }

  // Use OpenStreetMap's public raster tiles so the admin map does not
  // depend on CARTO's legacy basemap endpoint or an API key.
  const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const attribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  // Support both old (taxis) and new (locations) data format
  const dataToRender: MapLocation[] = locations || taxis || [];
  const currentMode = mode === "heatmap" || heatmapMode ? true : false;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ width: "100%", height: "100%" }}
      className={darkMode ? "tad-map tad-map-dark" : "tad-map tad-map-light"}
    >
      <TileLayer
        url={tileUrl}
        attribution={attribution}
        className={darkMode ? "map-tiles-dark" : ""}
      />
      <MapUpdater center={center} zoom={zoom} />

      {dataToRender.map((item: MapLocation) => {
        // Support both TaxiData interface and generic location object
        const latitude = item.lastLat || item.latitude || item.lat;
        const longitude =
          item.lastLng || item.longitude || item.lng || item.lon;

        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          latitude == null ||
          longitude == null
        ) return null;

        const position: [number, number] = [latitude, longitude];
        const isSelected = selectedId === (item.deviceId || item.id);

        // ALL-SEEING EYE PATCH (v12.1.3, MAP-SPEC-2026):
        // Backend FleetService.getFleetMap() returns isOnline: boolean
        // and status: SystemStatus (OPERATIVO | PENDIENTE_PAGO | BLOQUEADO),
        // NEVER status: 'online'. The previous version evaluated
        // item.status === 'online', which was false for all records.
        const isOnline =
          !!item.isOnline ||
          (item as any).online === true ||
          String((item as any).status).toLowerCase() === "online";

        if (currentMode) {
          // Heatmap mode: show density with circle markers using 3-color system
          const statusInfo = getDriverStatusInfo(isOnline, item.lastSeen);
          const opacity = isOnline ? heatmapIntensity : heatmapIntensity * 0.5;
          const radius = heatmapRadius || (isOnline ? 30 : 15);

          return (
            <CircleMarker
              key={item.deviceId || item.id}
              center={position}
              radius={radius}
              color={statusInfo.color}
              fillColor={statusInfo.color}
              fillOpacity={opacity}
              weight={1}
            />
          );
        }

        // Normal mode: show markers with 3-color status system
        return (
          <Marker
            key={item.deviceId || item.id}
            position={position}
            icon={createStatusIcon(
              isOnline,
              item.lastSeen,
              isSelected,
              item.taxiNumber,
              item.deviceId || item.id,
            )}
            eventHandlers={{
              click: () => onViewHistory?.(item),
            }}
          >
            <Popup className="popup-clean" maxWidth={400} minWidth={340}>
              <VehiclePopup
                device={{
                  deviceId: item.deviceId || "N/A",
                  taxiNumber: item.taxiNumber,
                  city: item.city,
                  batteryLevel: item.batteryLevel,
                  lastSeen: item.lastSeen,
                  isOnline: isOnline,
                  speed: item.speed,
                  subscriptionStatus: item.subscriptionStatus,
                  subscriptionEnd: item.subscriptionEnd,
                  driverStatus: item.driverStatus,
                  driverName: item.driverName,
                  phone: item.phone,
                  plate: item.plate,
                  assignedCampaign: item.assignedCampaign,
                  assignedAdvertiser: item.assignedAdvertiser,
                  lastLat: item.lastLat,
                  lastLng: item.lastLng,
                }}
                onViewHistory={() => onViewHistory?.(item)}
                onSyncCommand={() => onSyncCommand?.(item.deviceId || "")}
              />
            </Popup>
          </Marker>
        );
      })}

      {/* Global Leaflet styles */}
      <style jsx global>{`
        .tad-map.leaflet-container {
          font-family: "Inter", sans-serif !important;
          background: #e8eef3 !important;
          outline: none;
        }
        .tad-map-dark.leaflet-container {
          background: #101923 !important;
        }
        /* OSM tiles stay free; only the raster layer is filtered, never markers/popups. */
        .map-tiles-dark {
          filter: invert(100%) hue-rotate(180deg) brightness(0.82) contrast(0.88) saturate(0.72);
        }
        .tad-map .leaflet-control-attribution {
          background: rgba(255,255,255,0.82) !important;
          color: #334155 !important;
          border-radius: 8px 0 0 0;
          padding: 3px 7px !important;
          font-size: 10px !important;
        }
        .tad-map-dark .leaflet-control-attribution {
          background: rgba(15,23,42,0.82) !important;
          color: #cbd5e1 !important;
        }
        .tad-map .leaflet-control-attribution a {
          color: #0f766e !important;
        }
        .tad-map-dark .leaflet-control-attribution a {
          color: #5eead4 !important;
        }
        .popup-clean .leaflet-popup-content-wrapper {
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
          border-radius: 0 !important;
        }
        .popup-clean .leaflet-popup-content {
          margin: 0 !important;
          width: auto !important;
        }
        .popup-clean .leaflet-popup-tip-container {
          display: none !important;
        }
        .leaflet-control-zoom {
          border: none !important;
          margin: 24px !important;
        }
        .leaflet-control-zoom a {
          background: rgba(255, 255, 255, 0.94) !important;
          color: #0f766e !important;
          border: 1px solid rgba(15, 23, 42, 0.12) !important;
          width: 40px !important;
          height: 40px !important;
          line-height: 40px !important;
          border-radius: 10px !important;
          margin-bottom: 6px !important;
          font-weight: 900 !important;
          transition: all 0.2s;
        }
        .tad-map-dark .leaflet-control-zoom a {
          background: rgba(15, 23, 42, 0.94) !important;
          color: #5eead4 !important;
          border-color: rgba(255, 255, 255, 0.12) !important;
        }
        .leaflet-control-zoom a:hover {
          background: #10b981 !important;
          color: #000 !important;
          transform: translateY(-2px);
        }
        .custom-marker {
          background: none !important;
          border: none !important;
        }
        .custom-cluster {
          background: none !important;
          border: none !important;
        }
      `}</style>
    </MapContainer>
  );
}
