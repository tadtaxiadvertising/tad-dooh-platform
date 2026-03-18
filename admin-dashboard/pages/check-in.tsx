/**
 * TAD DRIVER — Mobile Gateway PWA Page
 * =====================================
 * Página que el conductor abre en su celular al escanear el QR de la tablet.
 */

import { useEffect, useState, useCallback } from 'react';
import { MapPin, CheckCircle2, AlertCircle, Loader2, Wifi, WifiOff, Navigation, Ban, Activity, Radio, Database, ShieldCheck, Zap, RefreshCw } from 'lucide-react';
import {
  startTadTracking,
  stopTadTracking,
  onGatewayStateChange,
  type GatewayState,
  type GatewayStatus,
} from '../lib/mobile-gateway';
import clsx from 'clsx';

const STATUS_CONFIG: Record<GatewayStatus, {
  icon: React.ReactNode;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  pulse: boolean;
  glowColor: string;
}> = {
  IDLE: {
    icon: <Navigation className="w-10 h-10" />,
    label: 'PREPARANDO GPS...',
    color: 'text-zinc-400',
    bgColor: 'bg-zinc-950/40',
    borderColor: 'border-white/5',
    pulse: false,
    glowColor: 'rgba(255,255,255,0.02)',
  },
  INITIALIZING: {
    icon: <Loader2 className="w-10 h-10 animate-spin" />,
    label: 'INICIANDO RASTREO...',
    color: 'text-tad-yellow',
    bgColor: 'bg-tad-yellow/5',
    borderColor: 'border-tad-yellow/20',
    pulse: true,
    glowColor: 'rgba(250,212,0,0.1)',
  },
  TRACKING: {
    icon: <Navigation className="w-10 h-10 animate-pulse" />,
    label: 'GPS ACTIVO',
    color: 'text-tad-yellow',
    bgColor: 'bg-tad-yellow/5',
    borderColor: 'border-tad-yellow/20',
    pulse: true,
    glowColor: 'rgba(250,212,0,0.15)',
  },
  BUFFERING: {
    icon: <MapPin className="w-10 h-10" />,
    label: 'BUFFERING DATA',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/5',
    borderColor: 'border-blue-500/20',
    pulse: false,
    glowColor: 'rgba(59,130,246,0.1)',
  },
  SYNCING: {
    icon: <Loader2 className="w-10 h-10 animate-spin" />,
    label: 'SINCRONIZANDO...',
    color: 'text-tad-yellow',
    bgColor: 'bg-tad-yellow/5',
    borderColor: 'border-tad-yellow/20',
    pulse: true,
    glowColor: 'rgba(250,212,0,0.1)',
  },
  SYNCED: {
    icon: <CheckCircle2 className="w-10 h-10" />,
    label: 'SINCRONIZADO!',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/5',
    borderColor: 'border-emerald-500/20',
    pulse: false,
    glowColor: 'rgba(16,185,129,0.1)',
  },
  OFFLINE: {
    icon: <WifiOff className="w-10 h-10" />,
    label: 'OFFLINE BUFFER',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/5',
    borderColor: 'border-yellow-500/20',
    pulse: false,
    glowColor: 'rgba(250,204,21,0.1)',
  },
  GPS_ERROR: {
    icon: <AlertCircle className="w-10 h-10" />,
    label: 'GPS ERROR',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/5',
    borderColor: 'border-rose-500/20',
    pulse: false,
    glowColor: 'rgba(244,63,94,0.1)',
  },
  SUSPENDED: {
    icon: <Ban className="w-10 h-10" />,
    label: 'SERVICIO SUSPENDIDO',
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
    pulse: false,
    glowColor: 'rgba(244,63,94,0.2)',
  },
  DEVICE_NOT_FOUND: {
    icon: <AlertCircle className="w-10 h-10" />,
    label: 'SIN REGISTRO',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/5',
    borderColor: 'border-orange-500/20',
    pulse: false,
    glowColor: 'rgba(251,146,60,0.1)',
  },
};

export default function CheckIn() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [invalidQR, setInvalidQR] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [gatewayState, setGatewayState] = useState<GatewayState>({
    status: 'IDLE',
    batchSize: 0,
    totalSynced: 0,
    lastSyncAt: null,
    deviceId: null,
    error: null,
  });

  const formatTime = useCallback((iso: string | null) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleTimeString('es-DO', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      });
    } catch { return '—'; }
  }, []);

  useEffect(() => {
    setIsMounted(true);
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const params = new URLSearchParams(window.location.search);
    const id = params.get('deviceId');

    if (!id) {
      setInvalidQR(true);
      return;
    }

    setDeviceId(id);
    onGatewayStateChange((state) => {
      setGatewayState({ ...state });
    });

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
    startTadTracking(id, apiBaseUrl);

    return () => {
      stopTadTracking();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (invalidQR) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden font-sans">
        <div className="fixed inset-0 bg-rose-500/5 blur-[120px] rounded-full animate-pulse" />
        <div className="w-full max-w-md bg-zinc-950/80 backdrop-blur-3xl border border-rose-500/20 rounded-[3rem] p-12 shadow-3xl text-center relative z-10">
          <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl">
             <AlertCircle className="w-12 h-12 text-rose-400" />
          </div>
          <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-4 font-display">QR INVÁLIDO</h1>
          <p className="text-zinc-500 text-[11px] font-bold leading-relaxed mb-10 uppercase tracking-widest italic">
            Escanea el código QR directamente de la tablet.
          </p>
          <div className="pt-8 border-t border-white/5 opacity-30">
            <p className="text-[10px] text-zinc-600 uppercase font-black tracking-[0.4em] italic leading-none">
              TAD SYSTEMS &middot; v4.2
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (gatewayState.status === 'SUSPENDED') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden font-sans">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-rose-500/10 blur-[150px] rounded-full animate-pulse" />
        <div className="w-full max-w-md bg-zinc-950/80 backdrop-blur-3xl border border-rose-500/30 rounded-[3.5rem] p-12 shadow-3xl relative overflow-hidden z-10">
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-rose-500/10 rounded-full mb-10 shadow-3xl border border-rose-500/20">
              <Ban className="w-12 h-12 text-rose-500" />
            </div>

            <h1 className="text-3xl font-black text-rose-500 mb-4 font-display italic tracking-tighter uppercase leading-none">
              Inhibición <br/>de Servicio
            </h1>

            <p className="text-zinc-500 text-[11px] font-bold leading-relaxed mb-10 uppercase tracking-widest italic">
              Este vehículo tiene una restricción activa. Contacta soporte.
            </p>

            <button
              onClick={() => window.location.reload()}
              className="w-full bg-tad-yellow text-black font-black py-6 px-8 rounded-full text-[11px] uppercase tracking-[0.2em] transition-all shadow-3xl shadow-tad-yellow/10 italic"
            >
              Reintentar Enlace
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[gatewayState.status] || STATUS_CONFIG.IDLE;

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-tad-yellow selection:text-black">
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
         <div className="absolute top-[-15%] left-[-10%] w-[65%] h-[65%] bg-tad-yellow/[0.04] blur-[180px] rounded-full animate-pulse-soft" />
         <div className="absolute bottom-[5%] right-[-10%] w-[55%] h-[55%] bg-white/[0.01] blur-[160px] rounded-full" />
      </div>

      <div className="w-full max-w-md bg-zinc-950/80 backdrop-blur-3xl border border-white/10 rounded-[4rem] p-10 shadow-[0_50px_100px_rgba(0,0,0,0.5)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />
        
        <div className="relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-6 p-1.5 bg-zinc-900/10 backdrop-blur-3xl rounded-full border border-white/5 mb-6 pl-8 pr-1.5 shadow-2xl">
               <h1 className="text-2xl font-black italic tracking-tighter text-white uppercase leading-none font-display">
                TAD<span className="text-tad-yellow italic">DRIVER</span>
              </h1>
              <div className="w-12 h-12 bg-tad-yellow rounded-full flex items-center justify-center">
                 <Radio className="w-6 h-6 text-black" />
              </div>
            </div>
            <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.5em] italic">Gateway Terminal v4.2</p>
          </div>

          <div className={clsx(
            "p-12 rounded-[3.5rem] border transition-all duration-1000 flex flex-col items-center gap-8 shadow-3xl relative overflow-hidden",
            statusConfig.bgColor,
            statusConfig.borderColor
          )}>
            <div className={clsx(
              "w-24 h-24 rounded-full bg-black/40 border border-white/5 flex items-center justify-center shadow-2xl transition-all duration-700",
              statusConfig.color,
              statusConfig.pulse && "animate-pulse"
            )}>
              {statusConfig.icon}
            </div>
            <div className="space-y-4 text-center">
               <p className={clsx("font-black text-xl leading-none uppercase italic tracking-tighter font-display", statusConfig.color)}>
                 {statusConfig.label}
               </p>
               {gatewayState.error ? (
                 <p className="text-[10px] text-rose-500 font-black uppercase tracking-widest">{gatewayState.error}</p>
               ) : (
                 <div className="flex items-center justify-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                    <span className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.4em] italic pt-1">SECURE_LINK_OK</span>
                 </div>
               )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-10">
            <MetricBox 
              label="Buffer" 
              value={`${gatewayState.batchSize}/10`} 
              icon={<Database className="w-3.5 h-3.5" />}
              progress={Math.min(10, gatewayState.batchSize) * 10}
            />
            <MetricBox 
              label="Sync" 
              value={gatewayState.totalSynced} 
              icon={<Activity className="w-3.5 h-3.5" />}
              color="text-emerald-500"
            />
            <MetricBox 
              label="Time" 
              value={formatTime(gatewayState.lastSyncAt)} 
              icon={<ShieldCheck className="w-3.5 h-3.5" />}
              size="text-[12px]"
            />
          </div>

          {deviceId && (
            <div className="mt-10 bg-black/40 rounded-[2.5rem] p-8 border border-white/5 text-center group transition-all duration-500">
              <div className="flex items-center justify-center gap-4 mb-4 opacity-30">
                 <div className="h-px w-8 bg-zinc-800" />
                 <p className="text-[9px] text-zinc-600 font-black uppercase tracking-[0.4em] italic">Linked_Node</p>
                 <div className="h-px w-8 bg-zinc-800" />
              </div>
              <div className="flex items-center justify-center gap-4">
                 <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center border border-white/5">
                    <Zap className="w-6 h-6 text-tad-yellow" />
                 </div>
                 <p className="font-black text-white text-2xl italic tracking-tighter uppercase font-display">{deviceId}</p>
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-center gap-4 p-4 rounded-full bg-white/[0.02] w-fit mx-auto border border-white/5">
            {isMounted && (
              isOnline ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                  <span className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.4em] italic">Uplink Nominal</span>
                  <Wifi className="w-4 h-4 text-emerald-500" />
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_8px_#eab308]" />
                  <span className="text-[10px] text-yellow-500 font-black uppercase tracking-[0.4em] italic">Offline Buffer</span>
                  <WifiOff className="w-4 h-4 text-yellow-500" />
                </>
              )
            )}
          </div>
        </div>

        <div className="mt-12 pt-10 border-t border-white/5 text-center opacity-30">
          <p className="text-[9px] text-zinc-800 font-black uppercase tracking-[0.6em] italic">
            © 2026 TAD DOMINICANA &middot; v4.2
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse-soft {
          0%, 100% { opacity: 0.1; transform: scale(1); }
          50% { opacity: 0.15; transform: scale(1.05); }
        }
        .animate-pulse-soft {
          animation: pulse-soft 8s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}

interface MetricBoxProps {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  progress?: number;
  color?: string;
  size?: string;
}

function MetricBox({ label, value, icon, progress, color, size = "text-xl" }: MetricBoxProps) {
  return (
    <div className="bg-zinc-900/40 backdrop-blur-md rounded-[2rem] p-5 border border-white/5 text-center relative overflow-hidden">
      <div className="flex items-center justify-center gap-2 mb-3 text-zinc-600">
         {icon}
         <p className="text-[9px] uppercase font-black tracking-widest italic">{label}</p>
      </div>
      <p className={clsx("font-black italic tracking-tighter leading-none mb-2 font-display", size, color || "text-white")}>
        {value}
      </p>
      
      {progress !== undefined && (
        <div className="w-full h-1 bg-black/60 rounded-full mt-3 overflow-hidden border border-white/5">
          <div className="h-full bg-tad-yellow transition-all duration-700 shadow-tad-glow progress-bar-fill" />
          <style jsx>{`
            .progress-bar-fill {
              width: ${progress}%;
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
