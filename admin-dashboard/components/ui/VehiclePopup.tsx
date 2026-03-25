// admin-dashboard/components/ui/VehiclePopup.tsx
import React from 'react';
import { 
  Battery, Signal, Smartphone, Clock, 
  MapPin, Navigation, User, CreditCard, ShieldCheck, XCircle,
  Gauge as SpeedIcon
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
    driverName?: string;
    plate?: string;
  };
  onViewHistory?: () => void;
  onSyncCommand?: () => void;
}

export const VehiclePopup: React.FC<VehiclePopupProps> = ({ device, onViewHistory, onSyncCommand }) => {
  const isOnline = device.isOnline;
  const isPaid = device.subscriptionStatus === 'ACTIVE';
  const speed = device.speed || 0;
  
  return (
    <div className="w-[300px] bg-[#0c0c0c]/90 backdrop-blur-2xl border border-white/5 rounded-3xl overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.8)] animate-in zoom-in-95 fade-in duration-300 origin-bottom">
      {/* Visual Accent Header */}
      <div className={clsx(
        "h-1.5 relative overflow-hidden",
        !isOnline ? "bg-zinc-800" : isPaid ? "bg-emerald-500 shadow-[0_0_15px_#10b981]" : "bg-tad-yellow shadow-[0_0_15px_#fad400]"
      )} />
      
      <div className="p-6">
        {/* User / ID Section with Clean Contrast */}
        <div className="flex items-start gap-4 mb-6">
          <div className="relative">
            <div className={clsx(
              "w-16 h-16 rounded-2xl border flex items-center justify-center transition-all bg-black shadow-inner",
              isOnline ? "border-tad-yellow/20 text-tad-yellow" : "border-white/5 text-zinc-800"
            )}>
              <User className={clsx("w-9 h-9", isOnline ? "opacity-60" : "opacity-10")} />
            </div>
            {isOnline && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-[#0c0c0c] rounded-full animate-pulse shadow-lg" />
            )}
          </div>
          
          <div className="min-w-0">
            <h4 className="text-[13px] font-black text-white uppercase tracking-tight mb-1 truncate">
              {device.driverName || "TAD DRIVER INDEFINIDO"}
            </h4>
            
            {/* ALERT: OUT OF RANGE */}
            {(device as any).isOutsideFence && (
              <div className="mb-2 flex items-center gap-2 px-2 py-1 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 animate-pulse">
                <XCircle className="w-3 h-3" />
                <span className="text-[8px] font-black uppercase tracking-widest">Fuera de Rango</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black text-tad-yellow bg-tad-yellow/5 px-2 py-0.5 rounded-lg border border-tad-yellow/10">
                {device.taxiNumber || "TAD-N/A"}
              </span>
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                {device.plate || "SIN-REF"}
              </span>
            </div>
          </div>
        </div>

        {/* Telemetry Grid - Bold Contrast Labels */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <TelemetryCard 
            icon={<Battery className={clsx("w-3.5 h-3.5", (device.batteryLevel || 0) < 20 ? "text-rose-500" : "text-emerald-500")} />}
            label="Batería"
            value={`${device.batteryLevel ?? 0}%`}
            statusColor={ (device.batteryLevel || 0) < 20 ? 'text-rose-400' : 'text-emerald-400' }
          />
          <TelemetryCard 
            icon={<SpeedIcon className="w-3.5 h-3.5 text-tad-yellow" />}
            label="Velocidad"
            value={`${speed.toFixed(1)} km/h`}
            statusColor="text-tad-yellow/90"
          />
          <TelemetryCard 
            icon={<Signal className={clsx("w-3.5 h-3.5", isOnline ? "text-emerald-500" : "text-zinc-700")} />}
            label="Enlace"
            value={isOnline ? "OPERATIVO" : "OFFLINE"}
            statusColor={isOnline ? "text-emerald-500" : "text-zinc-700"}
          />
          <TelemetryCard 
            icon={<Clock className="w-3.5 h-3.5 text-zinc-600" />}
            label="Último Sync"
            value={device.lastSeen ? new Date(device.lastSeen).toLocaleTimeString('es-DO', { hour:'2-digit', minute:'2-digit' }) : "---"}
            statusColor="text-zinc-600"
          />
        </div>

        {/* Subscription Status Banner */}
        <div className={clsx(
          "px-4 py-3 rounded-2xl border flex items-center justify-between mb-6 backdrop-blur-md transition-colors",
          isPaid ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400" : "bg-rose-500/5 border-rose-500/10 text-rose-500"
        )}>
          <div className="flex items-center gap-3">
            {isPaid ? <ShieldCheck className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">
              {isPaid ? "ESTADO: ACTIVO" : "ESTADO: BLOQUEADO"}
            </span>
          </div>
          <CreditCard className="w-3.5 h-3.5 opacity-30" />
        </div>

        {/* Master Commands */}
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={onViewHistory}
            className="group py-4 px-2 bg-zinc-950 border border-white/5 hover:bg-zinc-900 text-gray-400 hover:text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
          >
            <Navigation className="w-3.5 h-3.5 text-zinc-600 group-hover:text-tad-yellow transition-colors" />
            Historico
          </button>
          <button 
            onClick={onSyncCommand}
            className="py-4 px-2 bg-tad-yellow text-black hover:bg-white rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-[0_10px_20px_rgba(250,212,0,0.2)] hover:shadow-tad-yellow/40 active:scale-95"
          >
            <Signal className="w-3.5 h-3.5" />
            WAKE_UP
          </button>
        </div>
      </div>
      
      {/* Footer System ID with High Contrast Labels */}
      <div className="px-6 py-4 bg-black/40 border-t border-white/5 flex items-center justify-between">
         <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest truncate max-w-[150px]">
           ID: <span className="text-zinc-400 ml-1">{device.deviceId}</span>
         </span>
         <div className="flex items-center gap-2">
            <MapPin className="w-3 h-3 text-tad-yellow/30" />
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest leading-none">
              {device.city || "DOM"}
            </span>
         </div>
      </div>
    </div>
  );
};

const TelemetryCard = ({ icon, label, value, statusColor }: any) => (
  <div className="bg-black/40 border border-white/5 p-3 rounded-2xl flex flex-col gap-1.5 hover:border-white/10 transition-colors">
     <div className="flex items-center gap-2 text-zinc-600">
        {icon}
        <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
     </div>
     <p className={clsx("text-[11px] font-black leading-none", statusColor)}>
       {value}
     </p>
  </div>
);
