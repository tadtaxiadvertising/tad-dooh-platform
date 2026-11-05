"use client";

// apps/driver/components/dashboard/SettingsTab.tsx
/**
 * SettingsTab — Vista de Ajustes y Soporte
 *
 * Acciones tácticas del conductor:
 * - Soporte WhatsApp, Reportar falla
 * - Sincronización forzada
 * - Referir conductores
 * - Cerrar sesión
 * - Información de versión y debug
 *
 * Reemplaza los ActionButton del dashboard original con un layout
 * tipo "settings list" optimizado para móvil (hitboxes grandes, 48px+).
 */

import React from "react";
import { motion } from "framer-motion";
import {
  MessageCircle,
  AlertTriangle,
  RefreshCw,
  UserPlus,
  LogOut,
  Info,
  Smartphone,
  Wifi,
} from "lucide-react";

interface SettingsTabProps {
  connectionStatus: "online" | "offline" | "syncing";
  batchCount: number;
  offlineCount: number;
  isTracking: boolean;
  onSync: () => void;
  onSupport: () => void;
  onReportFalla: () => void;
  onReferir: () => void;
  onLogout: () => void;
  syncingNow: boolean;
}

interface SettingsItemProps {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onClick: () => void;
  disabled?: boolean;
  color?: string;
}

function SettingsItem({
  icon,
  label,
  sublabel,
  onClick,
  disabled = false,
  color = "text-zinc-400",
}: SettingsItemProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-4 rounded-2xl border border-white/[0.04] bg-white/[0.02] px-5 py-4 text-left transition hover:border-white/[0.08] hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40 active:bg-white/[0.06]"
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.04] bg-white/[0.03] ${color}`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-white">{label}</p>
        {sublabel && (
          <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-600">
            {sublabel}
          </p>
        )}
      </div>
      <svg
        className="h-4 w-4 shrink-0 text-zinc-700"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </motion.button>
  );
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  connectionStatus,
  batchCount,
  offlineCount,
  isTracking,
  onSync,
  onSupport,
  onReportFalla,
  onReferir,
  onLogout,
  syncingNow,
}) => {
  const isOffline = connectionStatus === "offline";

  return (
    <section aria-labelledby="settings-tab-title" className="space-y-5">
      {/* Title */}
      <div>
        <h2
          id="settings-tab-title"
          className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500"
        >
          Ajustes
        </h2>
        <p className="mt-1 text-base font-bold text-zinc-300">
          Soporte y configuración
        </p>
      </div>

      {/* Connectivity Status Card */}
      <div className="rounded-[2rem] border border-white/[0.04] bg-white/[0.02] p-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
              isOffline
                ? "border-red-500/20 bg-red-500/5 text-red-400"
                : "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
            }`}
          >
            <Wifi className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-white">
              {isOffline ? "Sin conexión" : "Conectado"}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-600">
              {isTracking ? "GPS activo" : "GPS detenido"} · Batch {batchCount}
              /10 ·{" "}
              {offlineCount > 0
                ? `${offlineCount} pts offline`
                : "0 pts pendientes"}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <SettingsItem
          icon={<MessageCircle className="h-5 w-5" />}
          label="Soporte por WhatsApp"
          sublabel="Respuesta rápida en minutos"
          onClick={onSupport}
          color="text-emerald-400"
        />

        <SettingsItem
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Reportar falla"
          sublabel="Dispositivo, app o telemetría"
          onClick={onReportFalla}
          color="text-red-400"
        />

        <SettingsItem
          icon={
            <RefreshCw
              className={`h-5 w-5 ${syncingNow ? "animate-spin" : ""}`}
            />
          }
          label="Sincronizar datos"
          sublabel={
            offlineCount > 0
              ? `${offlineCount} puntos offline pendientes`
              : "Todo al día"
          }
          onClick={onSync}
          disabled={offlineCount === 0 || syncingNow}
          color="text-[#FFD400]"
        />

        <SettingsItem
          icon={<UserPlus className="h-5 w-5" />}
          label="Referir conductor"
          sublabel="Gana bonos por cada referido activo"
          onClick={onReferir}
          color="text-blue-400"
        />

        <SettingsItem
          icon={<LogOut className="h-5 w-5" />}
          label="Cerrar sesión"
          sublabel="Desconectar de la plataforma"
          onClick={onLogout}
          color="text-zinc-400"
        />
      </div>

      {/* Version Info */}
      <div className="flex items-center gap-3 rounded-2xl border border-white/[0.02] bg-white/[0.01] px-4 py-3">
        <Info className="h-4 w-4 shrink-0 text-zinc-700" />
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-700">
            TAD Driver Portal v12.0.0
          </p>
          <p className="mt-0.5 text-[9px] font-mono text-zinc-800">
            GPS: {isTracking ? "ACTIVO" : "INACTIVO"} · Red:{" "}
            {connectionStatus.toUpperCase()} · Build:{" "}
            {process.env.NEXT_PUBLIC_BUILD_HASH || "dev"}
          </p>
        </div>
        <Smartphone className="h-4 w-4 shrink-0 text-zinc-800" />
      </div>

      {/* Debug trigger (dev only) */}
      {process.env.NODE_ENV !== "production" && (
        <p className="pt-2 text-center text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-800">
          Debug: usa el botón en la vista Inicio para forzar bloqueo 402
        </p>
      )}
    </section>
  );
};

export default SettingsTab;
