// admin-dashboard/components/ui/VehiclePopup.tsx
import React from 'react';
import {
  Battery, Signal, Smartphone, Clock,
  MapPin, Navigation, User, CreditCard, ShieldCheck, XCircle,
  Gauge as SpeedIcon, Phone, Calendar, AlertTriangle, Car,
  Hash, Wifi, WifiOff, Circle
} from 'lucide-react';
import clsx from 'clsx';

interface VehiclePopupProps {
  device: {
    deviceId: string;
    taxiNumber?: string;
    city?: string;
    batteryLevel?: number | null;
    lastSeen?: string | null;
    isOnline?: boolean;
    speed?: number;
    subscriptionStatus?: string;
    subscriptionEnd?: string | null;
    driverStatus?: string;
    driverName?: string;
    phone?: string;
    plate?: string;
  };
  onViewHistory?: () => void;
  onSyncCommand?: () => void;
}

export const VehiclePopup: React.FC<VehiclePopupProps> = ({ device, onViewHistory, onSyncCommand }) => {
  const isOnline = device.isOnline;
  const isPaid = device.subscriptionStatus === 'ACTIVE';
  const isExpired = device.subscriptionStatus === 'EXPIRED';
  const speed = device.speed || 0;
  const battery = device.batteryLevel ?? 0;
  const driverStatus = device.driverStatus || 'PENDIENTE_PAGO';

  const driverStatusLabel =
    driverStatus === 'OPERATIVO' ? 'ACTIVO' :
      driverStatus === 'BLOQUEADO' ? 'BLOQUEADO' :
        driverStatus === 'PENDIENTE_PAGO' ? 'PENDIENTE PAGO' :
          driverStatus;

  const subscriptionLabel = isPaid ? 'ACTIVA' : isExpired ? 'EXPIRADA' : 'PENDIENTE';

  return (
    <div className="w-[340px] bg-[#0c0c0c]/95 backdrop-blur-2xl border border-white/5 rounded-3xl overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.85)] animate-in zoom-in-95 fade-in duration-300 origin-bottom">
      {/* ── Status Header Bar ── */}
      <div className={clsx(
        "h-1.5 relative overflow-hidden",
        !isOnline ? "bg-zinc-800" : isPaid ? "bg-emerald-500 shadow-[0_0_15px_#10b981]" : "bg-tad-yellow shadow-[0_0_15px_#fad400]"
      )} />

      <div className="p-5">
        {/* ── Driver Identity ── */}
        <div className="flex items-start gap-4 mb-5">
          <div className="relative shrink-0">
            <div className={clsx(
              "w-14 h-14 rounded-2xl border flex items-center justify-center transition-all bg-black shadow-inner",
              isOnline ? "border-tad-yellow/20 text-tad-yellow" : "border-white/5 text-zinc-800"
            )}>
              <User className={clsx("w-8 h-8", isOnline ? "opacity-60" : "opacity-10")} />
            </div>
            {isOnline ? (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-[3px] border-[#0c0c0c] rounded-full animate-pulse shadow-lg" />
            ) : (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-zinc-600 border-[3px] border-[#0c0c0c] rounded-full" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="text-[13px] font-black text-white uppercase tracking-tight mb-0.5 truncate">
              {device.driverName || "TAD DRIVER INDEFINIDO"}
            </h4>

            {/* OUT OF RANGE alert */}
            {(device as any).isOutsideFence && (
              <div className="mb-2 flex items-center gap-2 px-2 py-1 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 animate-pulse">
                <XCircle className="w-3 h-3" />
                <span className="text-[8px] font-black uppercase tracking-widest">Fuera de Rango</span>
              </div>
            )}

            {/* Phone & Plate row */}
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {device.phone && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                  <Phone className="w-2.5 h-2.5 text-zinc-500" />
                  {device.phone}
                </span>
              )}
              <span className="text-[10px] font-mono font-black text-tad-yellow bg-tad-yellow/5 px-2 py-0.5 rounded-lg border border-tad-yellow/10">
                {device.taxiNumber || "TAD-N/A"}
              </span>
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                {device.plate || "SIN-REF"}
              </span>
            </div>
          </div>
        </div>

        {/* ── Telemetry Grid ── */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          <TelemetryCard
            icon={<Battery className={clsx("w-3.5 h-3.5", battery < 20 ? "text-rose-500" : "text-emerald-500")} />}
            label="Batería"
            value={`${battery}%`}
            statusColor={battery < 20 ? 'text-rose-400' : 'text-emerald-400'}
          />
          <TelemetryCard
            icon={<SpeedIcon className="w-3.5 h-3.5 text-tad-yellow" />}
            label="Velocidad"
            value={`${speed.toFixed(1)}`}
            sub="km/h"
            statusColor="text-tad-yellow/90"
          />
          <TelemetryCard
            icon={
              isOnline
                ? <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                : <WifiOff className="w-3.5 h-3.5 text-zinc-700" />
            }
            label="Enlace"
            value={isOnline ? "ONLINE" : "OFFLINE"}
            statusColor={isOnline ? "text-emerald-500" : "text-zinc-700"}
          />
        </div>

        {/* ── Driver Status & Subscription ── */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className={clsx(
            "px-3 py-2.5 rounded-2xl border flex items-center gap-2.5 backdrop-blur-md",
            driverStatus === 'OPERATIVO'
              ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400"
              : driverStatus === 'BLOQUEADO'
                ? "bg-rose-500/5 border-rose-500/10 text-rose-500"
                : "bg-amber-500/5 border-amber-500/10 text-amber-400"
          )}>
            {driverStatus === 'OPERATIVO' ? <ShieldCheck className="w-3.5 h-3.5" /> :
              driverStatus === 'BLOQUEADO' ? <XCircle className="w-3.5 h-3.5" /> :
                <AlertTriangle className="w-3.5 h-3.5" />}
            <div className="flex flex-col">
              <span className="text-[7px] font-black uppercase tracking-[0.2em] opacity-60">Driver</span>
              <span className="text-[10px] font-black uppercase tracking-[0.1em]">{driverStatusLabel}</span>
            </div>
          </div>

          <div className={clsx(
            "px-3 py-2.5 rounded-2xl border flex items-center gap-2.5 backdrop-blur-md",
            isPaid ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400"
              : "bg-rose-500/5 border-rose-500/10 text-rose-500"
          )}>
            <CreditCard className="w-3.5 h-3.5" />
            <div className="flex flex-col">
              <span className="text-[7px] font-black uppercase tracking-[0.2em] opacity-60">Suscripción</span>
              <span className="text-[10px] font-black uppercase tracking-[0.1em]">{subscriptionLabel}</span>
            </div>
          </div>
        </div>

        {/* ── Subscription End Date ── */}
        {device.subscriptionEnd && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-white/[0.02] border border-white/5 rounded-2xl">
            <Calendar className="w-3 h-3 text-zinc-500" />
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
              Vence:{' '}
              <span className="text-zinc-300 ml-1">
                {new Date(device.subscriptionEnd).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </span>
          </div>
        )}

        {/* ── Last Sync ── */}
        <div className="flex items-center justify-between mb-5 px-3 py-2 bg-white/[0.02] border border-white/5 rounded-2xl">
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-zinc-500" />
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Último Sync</span>
          </div>
          <span className="text-[10px] font-mono font-black text-zinc-400">
            {device.lastSeen
              ? new Date(device.lastSeen).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : "---"}
          </span>
        </div>

        {/* ── Action Buttons ── */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onViewHistory}
            className="group py-3.5 px-2 bg-zinc-950 border border-white/5 hover:bg-zinc-900 text-gray-400 hover:text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
          >
            <Navigation className="w-3.5 h-3.5 text-zinc-600 group-hover:text-tad-yellow transition-colors" />
            Histórico
          </button>
          <button
            onClick={onSyncCommand}
            className="py-3.5 px-2 bg-tad-yellow text-black hover:bg-white rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-[0_10px_20px_rgba(250,212,0,0.2)] hover:shadow-tad-yellow/40 active:scale-95"
          >
            <Signal className="w-3.5 h-3.5" />
            WAKE_UP
          </button>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="px-5 py-3.5 bg-black/40 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Hash className="w-3 h-3 text-zinc-600 shrink-0" />
          <span className="text-[9px] font-mono font-bold text-zinc-500 truncate">
            {device.deviceId}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <MapPin className="w-3 h-3 text-tad-yellow/30" />
          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
            {device.city || "DOM"}
          </span>
        </div>
      </div>
    </div>
  );
};

const TelemetryCard = ({ icon, label, value, sub, statusColor }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  statusColor: string;
}) => (
  <div className="bg-black/40 border border-white/5 p-2.5 rounded-2xl flex flex-col gap-1 hover:border-white/10 transition-colors">
    <div className="flex items-center gap-1.5 text-zinc-600">
      {icon}
      <span className="text-[7px] font-black uppercase tracking-widest">{label}</span>
    </div>
    <p className={clsx("text-[12px] font-black leading-none", statusColor)}>
      {value}
      {sub && <span className="text-[7px] font-bold text-zinc-600 ml-0.5">{sub}</span>}
    </p>
  </div>
);