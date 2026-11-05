// advertiser/pages/network.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import type {
  FleetVehicle,
  HeatmapPoint,
  PathPoint,
} from "../../types/tracking";
import { useRouter } from "next/router";
import {
  Navigation,
  Activity,
  RefreshCw,
  Map as MapIcon,
  Layers,
  Sun,
  Moon,
} from "lucide-react";
import clsx from "clsx";
import {
  getTrackingSummary,
  getFleetLocations,
  getHeatmapData,
  getDeviceRecentPath,
} from "@tad/services";
import "@tad/ui";
import dynamic from "next/dynamic";
import { AdvertiserLayout } from "../../components/layout/AdvertiserLayout";
import { FleetSidebar } from "../../components/ui/FleetSidebar";
import type { GetServerSideProps } from "next";
// Force dynamic rendering — prevents "No QueryClient set" SSR errors
export const getServerSideProps: GetServerSideProps = async () => ({
  props: {},
});

const MapView = dynamic(() => import("../../components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#070707] flex flex-col items-center justify-center text-zinc-600 gap-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(250,212,0,0.03),transparent)] animate-pulse" />
      <div className="relative">
        <div className="w-20 h-20 border-r-2 border-tad-yellow rounded-full animate-spin transition-all duration-1000" />
        <Navigation className="absolute inset-0 m-auto w-8 h-8 text-tad-yellow/40 animate-pulse rotate-45" />
      </div>
      <div className="text-center z-10 font-bold uppercase tracking-[0.4em] text-[10px] text-zinc-500 animate-pulse">
        Link de Telemetría v4.5...
      </div>
    </div>
  ),
});

interface TrackingDriver {
  driverId: string;
  driverName: string;
  phone: string;
  taxiNumber: string;
  plate: string;
  status: string;
  subscriptionPaid: boolean;
  device: {
    deviceId: string;
    taxiNumber: string;
    city: string;
    batteryLevel: number | null;
    lastSeen: string | null;
  } | null;
  tracking: {
    isActive: boolean;
    pointsToday: number;
    totalPoints: number;
    avgSpeedToday: number;
    lastPosition: {
      lat: number;
      lng: number;
      speed: number;
      timestamp: string;
    } | null;
  };
}

export default function NetworkPage() {
  const [mounted, setMounted] = useState(false);
  useRouter();
  const [, setSummary] = useState<TrackingDriver[]>([]);
  const [fleetLocations, setFleetLocations] = useState<FleetVehicle[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapPoint[]>([]);
  const [, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mapMode, setMapMode] = useState<"live" | "heatmap">("live");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [fleetFilter, setFleetFilter] = useState<
    "all" | "active" | "offline" | "unpaid"
  >("all");
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    19.4544, -70.6923,
  ]);
  const [mapZoom, setMapZoom] = useState(13);
  const [mapTheme, setMapTheme] = useState<"dark" | "light">(() => {
    if (typeof window !== "undefined") {
      return (
        (localStorage.getItem("tad_map_theme") as "dark" | "light") || "dark"
      );
    }
    return "dark";
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recentPath, setRecentPath] = useState<PathPoint[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const [sum, locations, heat] = await Promise.all([
        getTrackingSummary(),
        getFleetLocations(),
        getHeatmapData(),
      ]);
      setSummary(sum || []);
      setFleetLocations(locations || []);
      setHeatmap(heat || []);
      setError(null);
    } catch (err: unknown) {
      console.error("Error fetching tracking data:", err);
      setError("Error de conexión con el satélite.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // 30s update
    return () => clearInterval(interval);
  }, [fetchData]);

  const toggleMapTheme = () => {
    const next = mapTheme === "dark" ? "light" : "dark";
    setMapTheme(next);
    localStorage.setItem("tad_map_theme", next);
  };

  const currentVehicles = useMemo(() => {
    return fleetLocations.filter((v) => {
      const matchesSearch =
        !search ||
        v.deviceId?.toLowerCase().includes(search.toLowerCase()) ||
        v.taxiNumber?.toLowerCase().includes(search.toLowerCase()) ||
        v.driverName?.toLowerCase().includes(search.toLowerCase()) ||
        v.plate?.toLowerCase().includes(search.toLowerCase());

      const matchesFilter =
        fleetFilter === "all" ||
        (fleetFilter === "active" && v.isOnline) ||
        (fleetFilter === "offline" && !v.isOnline) ||
        (fleetFilter === "unpaid" && v.subscriptionStatus !== "ACTIVE");

      return matchesSearch && matchesFilter;
    });
  }, [fleetLocations, search, fleetFilter]);

  const handleSelectVehicle = async (v: FleetVehicle) => {
    setSelectedId(v.deviceId);
    if (v.lastLat && v.lastLng) {
      setMapCenter([v.lastLat, v.lastLng]);
      setMapZoom(16);
    }
    // Fetch path
    try {
      const path = await getDeviceRecentPath(v.deviceId);
      setRecentPath(path);
    } catch (e) {
      console.error("Error fetching path:", e);
    }
  };

  if (!mounted) return null;

  return (
    <AdvertiserLayout title="Red de Pantallas" subtitle="Inventario & Alcance">
      <div className="flex flex-col h-[calc(100vh-180px)] overflow-hidden rounded-3xl border border-white/5 bg-[#0a0a0b] relative">
        {/* Header Overlay */}
        <div className="absolute top-0 inset-x-0 z-[1001] pointer-events-none p-6 flex flex-col gap-4">
          {/* Primary Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 pointer-events-auto">
              <div className="flex p-1 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
                <ModeBtn
                  active={mapMode === "live"}
                  onClick={() => setMapMode("live")}
                  label="En Vivo"
                  icon={<Activity className="w-3.5 h-3.5" />}
                />
                <ModeBtn
                  active={mapMode === "heatmap"}
                  onClick={() => setMapMode("heatmap")}
                  label="Calor"
                  icon={<Layers className="w-3.5 h-3.5" />}
                />
              </div>

              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={clsx(
                  "w-12 h-12 flex items-center justify-center rounded-2xl border transition-all shadow-2xl backdrop-blur-xl",
                  sidebarOpen
                    ? "bg-tad-yellow border-tad-yellow text-black"
                    : "bg-black/60 border-white/10 text-white hover:bg-zinc-900",
                )}
              >
                <MapIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 pointer-events-auto">
              <div className="hidden lg:flex flex-col items-end px-6 py-2 bg-black/40 backdrop-blur-md rounded-2xl border border-white/5">
                <span className="text-[9px] font-black text-tad-yellow uppercase tracking-[0.2em] mb-0.5">
                  Estado Global
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">
                    Red Operativa
                  </span>
                </div>
              </div>

              <button
                onClick={toggleMapTheme}
                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-black/60 border border-white/10 text-white hover:bg-zinc-900 transition-all shadow-2xl backdrop-blur-xl"
              >
                {mapTheme === "dark" ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>

              <button
                onClick={fetchData}
                disabled={isRefreshing}
                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-black/60 border border-white/10 text-white hover:text-tad-yellow transition-all shadow-2xl backdrop-blur-xl disabled:opacity-50"
              >
                <RefreshCw
                  className={clsx("w-5 h-5", isRefreshing && "animate-spin")}
                />
              </button>
            </div>
          </div>
        </div>

        {/* The Map */}
        <div className="flex-1 relative">
          <MapView
            locations={fleetLocations}
            heatmapData={heatmap}
            mode={mapMode}
            center={mapCenter}
            zoom={mapZoom}
            selectedId={selectedId}
            recentPath={recentPath}
            mapTheme={mapTheme}
            onClearSelection={() => setSelectedId(null)}
            onViewHistory={handleSelectVehicle}
          />

          {/* Sidebar Component */}
          <div
            className={clsx(
              "absolute top-0 right-0 h-full w-[400px] z-[1002] transition-transform duration-700 ease-in-out transform shadow-[-20px_0_60px_rgba(0,0,0,0.5)]",
              sidebarOpen ? "translate-x-0" : "translate-x-full",
            )}
          >
            <FleetSidebar
              isOpen={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
              vehicles={currentVehicles}
              searchQuery={search}
              onSearchChange={setSearch}
              onSelectVehicle={handleSelectVehicle}
              filter={fleetFilter}
              onFilterChange={setFleetFilter}
            />
          </div>
        </div>

        {/* Legend / Status Bar */}
        <div className="p-4 bg-black border-t border-white/5 flex items-center justify-between z-[1001]">
          <div className="flex items-center gap-6">
            <LegendItem color="bg-tad-yellow" label="Activa con Mis Anuncios" />
            <LegendItem color="bg-rose-500" label="Sincronización Pendiente" />
            <LegendItem color="bg-zinc-800" label="Fuera de Red" />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">
              Vista:
            </span>
            <span className="text-[10px] font-black text-white uppercase tracking-tighter bg-white/5 px-3 py-1 rounded-lg border border-white/5 italic">
              {mapMode === "live" ? "TELEMETRÍA_RT" : "DENSIDAD_CALOR"}
            </span>
          </div>
        </div>
      </div>
    </AdvertiserLayout>
  );
}

const ModeBtn = ({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={clsx(
      "px-6 py-3 rounded-xl flex items-center gap-3 transition-all active:scale-95",
      active
        ? "bg-tad-yellow text-black shadow-lg"
        : "text-zinc-500 hover:text-white",
    )}
  >
    {icon}
    <span className="text-[10px] font-black uppercase tracking-tight">
      {label}
    </span>
  </button>
);

const LegendItem = ({ color, label }: { color: string; label: string }) => (
  <div className="flex items-center gap-2.5">
    <div className={clsx("w-2 h-2 rounded-full", color)} />
    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
      {label}
    </span>
  </div>
);
