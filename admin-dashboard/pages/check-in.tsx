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

  const [isRetrying, setIsRetrying] = useState(false);
  const [toastMsg, setToastMsg] = useState<{title: string, msg: string, type: 'error' | 'info' | 'success'} | null>(null);

  const handleRetry = async () => {
    setIsRetrying(true);
    
    // Simulate slight delay for UX (loading state visibility)
    await new Promise(r => setTimeout(r, 600));

    if (!navigator.onLine) {
      setToastMsg({
        title: 'Modo Offline',
        msg: 'Guardado localmente, se sincronizará luego (Sin Red)',
        type: 'info'
      });
      setIsRetrying(false);
      return;
    }

    window.location.reload();
  };

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
        <div className="w-full max-w-md bg-gray-900/80 backdrop-blur-xl border border-rose-500/20 rounded-3xl p-10 text-center relative z-10 shadow-lg">
          <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
             <AlertCircle className="w-10 h-10 text-rose-500" />
          </div>
          <h1 className="text-2xl font-bold text-white uppercase tracking-tight mb-3">QR INVÁLIDO</h1>
          <p className="text-gray-400 text-xs font-bold leading-relaxed mb-8 uppercase tracking-widest">
            Escanea el código QR directamente de la tablet.
          </p>
          <div className="pt-6 border-t border-gray-800 opacity-50">
            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest leading-none">
              TAD SYSTEMS &middot; v4.5
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
        <div className="w-full max-w-md bg-gray-900/80 backdrop-blur-xl border border-rose-500/30 rounded-3xl p-10 shadow-lg relative overflow-hidden z-10">
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-rose-500/10 rounded-full mb-8 shadow-md border border-rose-500/20">
              <Ban className="w-10 h-10 text-rose-500" />
            </div>

            <h1 className="text-2xl font-bold text-rose-500 mb-4 tracking-tight uppercase leading-none">
              Servicio Suspendido
            </h1>

            <p className="text-gray-400 text-xs font-bold leading-relaxed mb-8 uppercase tracking-widest">
              Este vehículo tiene una restricción activa.
            </p>

            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full bg-tad-yellow hover:bg-white text-black font-bold py-4 rounded-xl text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 group"
            >
              {isRetrying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-black" />
                  <span>Verificando...</span>
                </>
              ) : (
                <span>Reintentar</span>
              )}
            </button>
          </div>
        </div>
        
        {/* Toast Notification Layer */}
        {toastMsg && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[90%] bg-gray-900 border border-t border-t-gray-800 rounded-2xl p-4 shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5">
             <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <Database className="w-5 h-5 text-blue-500" />
             </div>
             <div>
                <p className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">{toastMsg.title}</p>
                <p className="text-xs font-bold text-gray-300 leading-tight">{toastMsg.msg}</p>
             </div>
             <button title="Cerrar Notificación" aria-label="Cerrar Notificación" onClick={() => setToastMsg(null)} className="ml-auto w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition">
                 <Ban className="w-4 h-4 text-gray-500" />
             </button>
          </div>
        )}
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

      <div className="w-full max-w-md bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />
        
        <div className="relative z-10">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-4 p-1.5 bg-gray-800/50 backdrop-blur-xl rounded-full border border-gray-700 mb-4 pl-6 pr-1.5 shadow-sm">
               <h1 className="text-xl font-bold tracking-tight text-white uppercase leading-none">
                TAD<span className="text-tad-yellow">DRIVER</span>
              </h1>
              <div className="w-10 h-10 bg-tad-yellow rounded-full flex items-center justify-center">
                 <Radio className="w-5 h-5 text-black" />
              </div>
            </div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Gateway Terminal v4.5</p>
          </div>

          <div className={clsx(
            "p-8 rounded-3xl border transition-all duration-700 flex flex-col items-center gap-6 shadow-md relative overflow-hidden",
            statusConfig.bgColor,
            statusConfig.borderColor
          )}>
            <div className={clsx(
              "w-20 h-20 rounded-full bg-gray-900/50 border border-gray-700/50 flex items-center justify-center shadow-sm transition-all duration-500",
              statusConfig.color,
              statusConfig.pulse && "animate-pulse"
            )}>
              {statusConfig.icon}
            </div>
            <div className="space-y-2 text-center">
               <p className={clsx("font-bold text-lg leading-none uppercase tracking-wide", statusConfig.color)}>
                 {statusConfig.label}
               </p>
               {gatewayState.error ? (
                 <p className="text-xs text-rose-500 font-bold uppercase tracking-widest">{gatewayState.error}</p>
               ) : (
                 <div className="flex items-center justify-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">LINK_OK</span>
                 </div>
               )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-8">
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
            <div className="mt-8 bg-gray-900/50 rounded-2xl p-6 border border-gray-700/50 text-center group transition-all duration-500">
              <div className="flex items-center justify-center gap-3 mb-3">
                 <div className="h-px w-6 bg-gray-700" />
                 <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Dispositivo Enlazado</p>
                 <div className="h-px w-6 bg-gray-700" />
              </div>
              <div className="flex items-center justify-center gap-3">
                 <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center border border-gray-700/50">
                    <Zap className="w-5 h-5 text-tad-yellow" />
                 </div>
                 <p className="font-bold text-white text-xl tracking-tight uppercase">{deviceId}</p>
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-center gap-3 p-3 rounded-full bg-gray-800/30 w-fit mx-auto border border-gray-700/50 text-xs">
            {isMounted && (
              isOnline ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                  <span className="text-emerald-500 font-bold uppercase tracking-widest">Online</span>
                  <Wifi className="w-4 h-4 text-emerald-500" />
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_8px_#eab308]" />
                  <span className="text-yellow-500 font-bold uppercase tracking-widest">Offline</span>
                  <WifiOff className="w-4 h-4 text-yellow-500" />
                </>
              )
            )}
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-gray-800 text-center opacity-70">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
            © 2026 TAD DOMINICANA
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
    <div className="bg-gray-800/40 backdrop-blur-xl rounded-2xl p-4 border border-gray-700/50 text-center relative overflow-hidden">
      <div className="flex flex-col items-center justify-center gap-1.5 mb-2 text-gray-400">
         {icon}
         <p className="text-[10px] uppercase font-bold tracking-widest">{label}</p>
      </div>
      <p className={clsx("font-bold tracking-tight leading-none mb-1", size, color || "text-white")}>
        {value}
      </p>
      
      {progress !== undefined && (
        <div className="w-full h-1 bg-gray-900 rounded-full mt-2 overflow-hidden border border-gray-700/50">
          <div className="h-full bg-tad-yellow transition-all duration-500 progress-bar-fill" />
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
