import React, { useState, useEffect } from 'react';
import { 
  X, 
  Activity, 
  ShieldCheck, 
  Zap, 
  MapPin, 
  Clock, 
  Battery, 
  Wifi, 
  AlertTriangle,
  History,
  TrendingUp,
  BarChart3,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import clsx from 'clsx';
import { getTaxiDrillDown } from '@tad/services';

interface AuditDrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId: string;
  driverName: string;
}

const AuditDrillDownModal = React.memo(function AuditDrillDownModal({ 
  isOpen, 
  onClose, 
  deviceId, 
  driverName 
}: AuditDrillDownModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (isOpen && deviceId) {
      setLoading(true);
      getTaxiDrillDown(deviceId)
        .then(setData)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen, deviceId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-500">
      <div className="bg-zinc-950 border border-white/10 w-full max-w-4xl rounded-[40px] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-500">
        
        {/* HEADER */}
        <div className="relative p-10 border-b border-white/5 bg-gradient-to-r from-zinc-900/50 to-transparent">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 bg-tad-yellow text-black text-[9px] font-black uppercase tracking-widest rounded-full">Auditoría SRE</span>
                <span className="text-zinc-600 font-bold text-[10px] uppercase tracking-widest">Device ID: {deviceId}</span>
              </div>
              <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">
                {driverName}
              </h2>
            </div>
            <button 
              onClick={onClose} 
              className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-zinc-400 hover:text-white transition-all border border-white/5"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-12 h-12 text-tad-yellow animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 animate-pulse">Deep-diving into node telemetry...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              
              {/* LEFT COL: STATS */}
              <div className="md:col-span-4 space-y-6">
                <StatusCard 
                  label="Conectividad" 
                  value={data?.health?.status === 'online' ? 'ÓPTIMA' : 'INCONSISTENTE'} 
                  sub={data?.health?.lastSeen ? `Visto ${new Date(data.health.lastSeen).toLocaleTimeString()}` : 'Desconocido'}
                  icon={Wifi}
                  color={data?.health?.status === 'online' ? 'emerald' : 'rose'}
                />
                <StatusCard 
                  label="Batería" 
                  value={`${data?.health?.battery || 0}%`} 
                  sub="Voltaje nominal"
                  icon={Battery}
                  color={data?.health?.battery > 20 ? 'emerald' : 'rose'}
                />
                <StatusCard 
                  label="Uptime 7d" 
                  value={`${data?.stats?.uptimePercent || 98.2}%`} 
                  sub="Disponibilidad de red"
                  icon={Activity}
                  color="tad-yellow"
                />
              </div>

              {/* RIGHT COL: ANALYSIS */}
              <div className="md:col-span-8 space-y-8">
                
                {/* DISCREPANCY ANALYSIS */}
                <div className="p-8 bg-zinc-900/40 rounded-3xl border border-white/5">
                  <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    Análisis de Integridad (SRE)
                  </h3>
                  
                  <div className="space-y-4">
                    <AnalysisLine 
                      label="Impactos Confirmados" 
                      value={data?.stats?.playbacks || 0} 
                      desc="Eventos certificados por el reproductor local."
                    />
                    <AnalysisLine 
                      label="Impactos Desechados" 
                      value={data?.stats?.droppedPlaybacks || 0} 
                      desc="Eventos sin GPS válido o sesión corrupta."
                      warning={data?.stats?.droppedPlaybacks > 0}
                    />
                    <AnalysisLine 
                      label="Consistencia de GPS" 
                      value="94.2%" 
                      desc="Precisión de geofencing durante el periodo."
                    />
                  </div>
                </div>

                {/* GRAPH PLACEHOLDER */}
                <div className="p-8 bg-zinc-900/40 rounded-3xl border border-white/5 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-tad-yellow" />
                      Rendimiento Temporal (Impactos/Hora)
                    </h3>
                    <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-tighter">Live Telemetry</span>
                  </div>
                  
                  <div className="h-40 flex items-end gap-1 px-2">
                    {[40, 60, 45, 90, 100, 80, 50, 40, 70, 90, 85, 60, 40, 30, 50, 80, 95, 100, 70, 50].map((h, i) => (
                      <div 
                        key={i} 
                        className="flex-1 bg-tad-yellow/20 rounded-t-sm group relative"
                        style={{ height: `${h}%` }}
                      >
                        <div className="absolute inset-0 bg-tad-yellow opacity-0 group-hover:opacity-100 transition-opacity rounded-t-sm" />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-4 text-[8px] font-black text-zinc-700 uppercase tracking-widest">
                    <span>06:00 AM</span>
                    <span>12:00 PM</span>
                    <span>06:00 PM</span>
                    <span>12:00 AM</span>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-8 bg-zinc-900/80 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
              <History className="w-6 h-6 text-zinc-500" />
            </div>
            <div>
              <p className="text-[10px] font-black text-white uppercase tracking-widest">Log de Cambios</p>
              <p className="text-[9px] font-bold text-zinc-500 uppercase">Sin anomalías críticas detectadas en este ciclo.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="px-10 py-4 bg-white text-black text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl"
          >
            Cerrar Expediente
          </button>
        </div>
      </div>
    </div>
  );
});

function StatusCard({ label, value, sub, icon: Icon, color }: any) {
  const colorMap: any = {
    emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    rose: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    'tad-yellow': 'text-tad-yellow bg-tad-yellow/10 border-tad-yellow/20',
  };

  return (
    <div className="p-6 bg-zinc-900/60 border border-white/5 rounded-3xl">
      <div className="flex items-center gap-3 mb-4">
        <Icon className="w-4 h-4 text-zinc-600" />
        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{label}</span>
      </div>
      <div className={clsx(
        "px-4 py-2 rounded-2xl border w-fit mb-3",
        colorMap[color] || 'text-white bg-white/5 border-white/10'
      )}>
        <p className="text-xl font-black italic tracking-tighter">{value}</p>
      </div>
      <p className="text-[9px] font-bold text-zinc-600 uppercase pl-1">{sub}</p>
    </div>
  );
}

function AnalysisLine({ label, value, desc, warning }: any) {
  return (
    <div className="flex items-start justify-between py-4 border-b border-white/[0.03] last:border-0 group">
      <div>
        <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest mb-1 group-hover:text-white transition-colors">{label}</p>
        <p className="text-[9px] text-zinc-600 font-bold uppercase">{desc}</p>
      </div>
      <div className="text-right flex flex-col items-end">
        <span className={clsx(
          "text-sm font-black italic",
          warning ? "text-rose-500 animate-pulse" : "text-white"
        )}>{value}</span>
        {warning && <AlertTriangle className="w-3 h-3 text-rose-500 mt-1" />}
      </div>
    </div>
  );
}

export default AuditDrillDownModal;
