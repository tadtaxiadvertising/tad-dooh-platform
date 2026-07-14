// apps/driver/components/dashboard/RoutesTab.tsx
/**
 * RoutesTab — Vista de Rutas / Mapa de Telemetría
 *
 * Muestra estadísticas en vivo del GPS del conductor:
 * - Velocidad actual y bearing
 * - Estado del batch de telemetría
 * - Efecto visual de mapa con glow pulsante
 * - Acción rápida para compartir ubicación
 *
 * Totalmente estática (no requiere Leaflet ni librerías externas pesadas).
 * Los datos en vivo vienen del shell (useTelemetry).
 */
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Navigation,
  Signal,
  MapPin,
  Activity,
  RefreshCw,
} from 'lucide-react';

interface RoutesTabProps {
  connectionStatus: 'online' | 'offline' | 'syncing';
  batchCount: number;
  offlineCount: number;
  isTracking: boolean;
  onSync: () => void;
  syncingNow: boolean;
}

export const RoutesTab: React.FC<RoutesTabProps> = ({
  connectionStatus,
  batchCount,
  offlineCount,
  isTracking,
  onSync,
  syncingNow,
}) => {
  const isOffline = connectionStatus === 'offline';
  const isSyncing = connectionStatus === 'syncing';

  return (
    <section aria-labelledby="routes-tab-title" className="space-y-5">
      {/* Title */}
      <div>
        <h2
          id="routes-tab-title"
          className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500"
        >
          Monitoreo de ruta
        </h2>
        <p className="mt-1 text-base font-bold text-zinc-300">
          Telemetría GPS en vivo
        </p>
      </div>

      {/* Map Preview Card — decorativo, estilo shine glass */}
      <div className="relative h-48 overflow-hidden rounded-[2.5rem] border border-white/[0.04] bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,212,0,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,212,0,0.3) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Scan line animation */}
        <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#FFD400]/20 to-transparent animate-map-scan" />

        {/* Center pin */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[#FFD400]/10 blur-[30px] animate-pulse-soft" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-[#FFD400]/20 bg-black/60 backdrop-blur-xl shadow-[0_0_40px_rgba(255,212,0,0.15)]">
              <MapPin className="h-6 w-6 text-[#FFD400]" />
            </div>
          </div>
        </div>

        {/* Bottom status strip */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-xl border border-white/[0.04] bg-black/40 px-3.5 py-2 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div
              className={`h-2 w-2 rounded-full ${
                isOffline
                  ? 'bg-red-500'
                  : isSyncing
                    ? 'bg-[#FFD400] animate-pulse-soft'
                    : 'bg-emerald-500'
              }`}
            />
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
              {isOffline
                ? 'Sin conexión'
                : isSyncing
                  ? 'Sincronizando...'
                  : isTracking
                    ? 'Rastreo activo'
                    : 'GPS detenido'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-600">
            BATCH {batchCount}/10
          </span>
        </div>
      </div>

      {/* GPS Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: 'Tracking',
            value: isTracking ? 'ACTIVO' : 'INACTIVO',
            color: isTracking ? 'text-emerald-400' : 'text-zinc-600',
            icon: Activity,
          },
          {
            label: 'Batch GPS',
            value: `${batchCount}/10`,
            color: 'text-[#FFD400]',
            icon: Signal,
          },
          {
            label: 'Offline',
            value: `${offlineCount} pts`,
            color: offlineCount > 0 ? 'text-amber-400' : 'text-emerald-400',
            icon: Navigation,
          },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="flex flex-col items-center gap-2 rounded-2xl border border-white/[0.03] bg-white/[0.02] px-3 py-4 text-center"
            >
              <Icon className={`h-4 w-4 ${stat.color}`} />
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-600">
                {stat.label}
              </p>
              <p className={`text-xs font-black ${stat.color}`}>
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Sync Button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onSync}
        disabled={offlineCount === 0 || syncingNow}
        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-4 text-sm font-black uppercase tracking-[0.15em] text-zinc-300 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        <RefreshCw
          className={`h-4 w-4 ${syncingNow ? 'animate-spin' : ''}`}
        />
        <span>
          {syncingNow
            ? 'Sincronizando...'
            : offlineCount > 0
              ? `Sincronizar ${offlineCount} puntos pendientes`
              : 'Todo sincronizado ✓'}
        </span>
      </motion.button>
    </section>
  );
};

export default RoutesTab;