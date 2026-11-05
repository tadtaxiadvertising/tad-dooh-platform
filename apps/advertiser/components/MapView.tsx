import React from "react";
import type { FleetVehicle, HeatmapPoint, PathPoint } from "../types/tracking";

interface MapViewProps {
  locations?: FleetVehicle[];
  heatmapData?: HeatmapPoint[];
  mode?: "live" | "heatmap";
  center?: [number, number];
  zoom?: number;
  selectedId?: string | null;
  recentPath?: PathPoint[];
  mapTheme?: "dark" | "light";
  onClearSelection?: () => void;
  onViewHistory?: (v: FleetVehicle) => void;
}

export default function MapView({ locations, mode }: MapViewProps) {
  return (
    <div className="w-full h-full bg-[#070707] flex flex-col items-center justify-center text-zinc-600 gap-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(250,212,0,0.03),transparent)]" />
      <div className="text-center z-10">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
          Map Module
        </p>
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-2">
          Leaflet map integration pending implementation
        </p>
        <p className="text-[8px] text-zinc-700 mt-1">
          {locations?.length || 0} locations loaded • Mode: {mode || "live"}
        </p>
      </div>
    </div>
  );
}
