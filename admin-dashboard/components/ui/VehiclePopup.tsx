import React from 'react';
import { 
  Battery, Signal, Smartphone, Clock, 
  MapPin, Navigation, User, CreditCard, ShieldCheck, XCircle
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
    <div className="w-[280px] bg-black/95 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300">
      {/* Header with Background Accent */}
      <div className={clsx(
        "h-2 relative overflow-hidden",
        !isOnline ? "bg-red-500/50" : isPaid ? "bg-emerald-500" : "bg-tad-yellow"
      )} />
      
      <div className="p-5">
        {/* Profile / ID Section */}
        <div className="flex items-start gap-4 mb-5">
          <div className="relative">
            <div className={clsx(
              "w-14 h-14 rounded-2xl border flex items-center justify-center transition-all bg-zinc-900",
              isOnline ? "border-tad-yellow/30 text-tad-yellow shadow-[0_0_15px_rgba(250,212,0,0.1)]" : "border-zinc-800 text-zinc-600"
            )}>
              <User className="w-8 h-8 opacity-40" />
            </div>
            {isOnline && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-black rounded-full animate-pulse" />
            )}
          </div>
          
          <div className="min-w-0">
            <h4 className="text-sm font-black text-white uppercase truncate mb-0.5 tracking-tight group-hover:text-tad-yellow transition-colors">
              {device.driverName || "CHOFER NO ASIG."}
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-tad-yellow bg-tad-yellow/10 px-1.5 py-0.5 rounded border border-tad-yellow/20">
                {device.taxiNumber || "TAD-N/A"}
              </span>
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest truncate">
                {device.plate || "PLACA-—"}
              </span>
            </div>
          </div>
        </div>

        {/* Telemetry Grid */}
        <div className="grid grid-cols-2 gap-2 mb-6 text-[10px] font-bold uppercase tracking-wider">
          <div className="bg-white/[0.03] border border-white/5 p-2.5 rounded-xl flex flex-col gap-1">
             <div className="flex items-center gap-1.5 text-zinc-500">
                <Battery className={clsx("w-3 h-3", (device.batteryLevel || 0) < 20 ? "text-red-500" : "text-emerald-500")} />
                Batería
             </div>
             <p className="text-white">{device.batteryLevel ?? 0}%</p>
          </div>
          <div className="bg-white/[0.03] border border-white/5 p-2.5 rounded-xl flex flex-col gap-1">
             <div className="flex items-center gap-1.5 text-zinc-500">
                <Gauge className="w-3 h-3 text-tad-yellow" />
                Velocidad
             </div>
             <p className="text-white">{speed.toFixed(1)} km/h</p>
          </div>
          <div className="bg-white/[0.03] border border-white/5 p-2.5 rounded-xl flex flex-col gap-1">
             <div className="flex items-center gap-1.5 text-zinc-500">
                <Signal className={clsx("w-3 h-3", isOnline ? "text-emerald-500" : "text-zinc-600")} />
                Señal
             </div>
             <p className={clsx(isOnline ? "text-emerald-500" : "text-zinc-600")}>
               {isOnline ? "SAT_LINK" : "LOST_LINK"}
             </p>
          </div>
          <div className="bg-white/[0.03] border border-white/5 p-2.5 rounded-xl flex flex-col gap-1">
             <div className="flex items-center gap-1.5 text-zinc-500">
                <Clock className="w-3 h-3 text-zinc-500" />
                Sync.
             </div>
             <p className="text-white truncate">
               {device.lastSeen ? new Date(device.lastSeen).toLocaleTimeString('es-DO', { hour:'2-digit', minute:'2-digit' }) : "—"}
             </p>
          </div>
        </div>

        {/* Subscription / Status Banner */}
        <div className={clsx(
          "px-4 py-2.5 rounded-xl border flex items-center justify-between mb-6",
          isPaid ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-red-500/10 border-red-500/20 text-red-500"
        )}>
          <div className="flex items-center gap-2">
            {isPaid ? <ShieldCheck className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            <span className="text-[10px] font-black uppercase tracking-widest">
              {isPaid ? "SUSCRIPCIÓN ACTIVA" : "MORA / BLOQUEADO"}
            </span>
          </div>
          <CreditCard className="w-3.5 h-3.5 opacity-40" />
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={onViewHistory}
            className="py-3 px-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
          >
            <Navigation className="w-3 h-3 text-tad-yellow" />
            Historial
          </button>
          <button 
            onClick={onSyncCommand}
            className="py-3 px-2 bg-tad-yellow text-black hover:bg-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-[0_5px_15px_rgba(250,212,0,0.2)]"
          >
            <Signal className="w-3 h-3" />
            Sync Now
          </button>
        </div>
      </div>
      
      {/* Footer ID */}
      <div className="px-5 py-3 bg-zinc-950 border-t border-white/5 flex items-center justify-between">
         <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-tighter truncate max-w-[150px]">
           ID_REF: {device.deviceId}
         </span>
         <div className="flex gap-1">
            <MapPin className="w-2.5 h-2.5 text-zinc-700" />
            <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">
              {device.city || "DOMINICANA"}
            </span>
         </div>
      </div>
    </div>
  );
};

const Gauge = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m12 14 4-4" /><path d="M3.34 19a10 10 0 1 1 17.32 0" />
  </svg>
);
