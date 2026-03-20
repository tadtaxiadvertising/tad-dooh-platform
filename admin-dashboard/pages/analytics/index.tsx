import { useEffect, useState, useCallback, useMemo } from 'react';
import { getTopTaxis, getHourlyPlays, getRecentPlays, getAnalyticsSummary } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { 
  BarChart3, 
  Clock, 
  TrendingUp, 
  RefreshCcw, 
  Activity,  Tablet, 
  Target, 
  Map as MapIcon,
  MousePointer2,
  Users,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Cpu,
  Zap
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useTabSync } from '../../hooks/useTabSync';
import Link from 'next/link';
import clsx from 'clsx';

interface RecentPlay {
  deviceId: string;
  timestamp: string;
  taxiNumber?: string;
  videoId?: string;
}

interface SummaryData {
  totalImpressions: number;
  activeNodes: number;
  ctr: number;
  hourlyAverage: number;
}

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [topTaxis, setTopTaxis] = useState<{ name: string; Plays: number }[]>([]);
  const [hourlyPlays, setHourlyPlays] = useState<{ time: string; impressions: number }[]>([]);
  const [recentPlays, setRecentPlays] = useState<RecentPlay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumData, topData, hourData, recData] = await Promise.all([
        getAnalyticsSummary(),
        getTopTaxis(),
        getHourlyPlays(),
        getRecentPlays()
      ]);

      setSummary(sumData);
      setTopTaxis((topData as { device_id: string; plays: number }[]).map((d) => ({ 
        name: d.device_id.slice(0, 8).toUpperCase(), 
        Plays: Number(d.plays) 
      })));
      
      const formattedHours = Array.isArray(hourData) ? (hourData as { hour: string; plays: number }[]).sort((a, b) => a.hour.localeCompare(b.hour)) : [];
      setHourlyPlays(formattedHours.map((d) => ({ 
        time: `${d.hour}:00`, 
        impressions: Number(d.plays) 
      })));

      setRecentPlays(Array.isArray(recData) ? recData : []);
    } catch (err) {
      console.error("Analytics Load Error", err);
      setError("INTERRUPCIÓN EN EL FLUJO DE TELEMETRÍA. REINTENTANDO VINCULACIÓN...");
    } finally {
      setLoading(false);
    }
  }, []);

  useTabSync('MEDIA', loadData);
  useTabSync('CAMPAIGNS', loadData);
  useTabSync('DEVICES', loadData);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, [loadData]);

  const sectors = useMemo(() => [
    { label: "Santo Domingo Centro (Polígono)", perc: 65, color: "yellow" },
    { label: "Santo Domingo Este", perc: 20, color: "white" },
    { label: "Santo Domingo Norte", perc: 10, color: "white" },
    { label: "Haina / Industrial", perc: 5, color: "white" }
  ], []);

  return (
    <div className="min-h-screen pb-12 animate-in fade-in duration-1000 relative selection:bg-tad-yellow selection:text-black font-sans mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 pt-6">
      {/* Background Decor */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-tad-yellow/[0.04] blur-[150px] rounded-full animate-pulse-soft" />
         <div className="absolute bottom-[0%] right-[-5%] w-[40%] h-[40%] bg-white/[0.01] blur-[120px] rounded-full" />
      </div>

      {/* Page Context Transition */}
      <div className="flex items-center gap-3 mb-8 opacity-60">
        <div className="w-8 h-px bg-white/20" />
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.4em]">Integrated Telemetrics / Core v4.2</p>
      </div>

      <div className="flex justify-end mb-10">
        <div className="flex items-center gap-4 bg-zinc-900/40 backdrop-blur-3xl p-2 rounded-2xl border border-white-[0.03] shadow-inner pl-6">
             <div className="flex items-center gap-2 pr-4 border-r border-white/5">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
               <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest leading-none">Nominal Feed</span>
             </div>
             <button 
               onClick={loadData}
               disabled={loading}
               className="p-3 bg-gray-900 border border-gray-700 text-gray-400 rounded-xl hover:bg-tad-yellow hover:text-black transition-all group disabled:opacity-50"
               aria-label="Refrescar Datos"
             >
                <RefreshCcw className={clsx("w-4 h-4 transition-transform duration-500", loading ? "animate-spin" : "group-hover:rotate-180")} />
             </button>
        </div>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-500 animate-in zoom-in duration-300">
           <Activity className="w-5 h-5 animate-pulse" />
           <p className="text-xs font-bold uppercase tracking-wider">{error}</p>
        </div>
      )}

      {/* KPI Cluster */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <StatsCard 
               icon={<Target className="w-5 h-5" />}
               label="Total Impressions"
               value={summary?.totalImpressions?.toLocaleString() || '0'}
               sub="Audited SSL Link"
               trend="+14% vol"
               color="yellow"
               loading={loading && !summary}
               delay="100ms"
            />
            <StatsCard 
               icon={<Users className="w-5 h-5" />}
               label="Operational Nodes"
               value={summary?.activeNodes?.toString() || '0'}
               sub="Hardware Verified"
               trend="Stable"
               color="white"
               loading={loading && !summary}
               delay="200ms"
            />
            <StatsCard 
               icon={<MousePointer2 className="w-5 h-5" />}
               label="Engagement Ratio"
               value={`${summary?.ctr?.toFixed(2) || '4.2'}%`}
               sub="Active Interactions"
               trend="+0.6% ctr"
               color="yellow"
               loading={loading && !summary}
               delay="300ms"
            />
            <StatsCard 
               icon={<Clock className="w-5 h-5" />}
               label="Stream Frequency"
               value={summary?.hourlyAverage?.toString() || '0'}
               sub="Updates / Hr"
               trend="Peak Rate"
               color="white"
               loading={loading && !summary}
               delay="400ms"
            />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        {/* Main Telemetry Visualization */}
        <div className="lg:col-span-2 space-y-6">
           <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 p-6 lg:p-8 rounded-2xl shadow-sm relative overflow-hidden group hover:border-tad-yellow/30 transition-all duration-500">
              <div className="absolute top-0 right-0 w-64 h-64 bg-tad-yellow/[0.03] blur-[100px] -z-10 group-hover:bg-tad-yellow/[0.05] transition-colors duration-1000" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-tad-yellow/10 rounded-xl text-tad-yellow border border-tad-yellow/20 shadow-sm shrink-0">
                       <Activity className="w-5 h-5" />
                    </div>
                    <div>
                       <h4 className="text-xl font-black text-white uppercase tracking-tight">Patrón Operacional Diario</h4>
                       <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Sincronización (24H)</p>
                    </div>
                 </div>
                 <div className="flex gap-2 items-center bg-gray-900/50 px-4 py-2 rounded-lg border border-gray-700 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-tad-yellow animate-pulse shadow-[0_0_8px_#fad400]" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Live Feed</span>
                 </div>
              </div>

              <div className="h-80 w-full relative">
                {mounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={hourlyPlays} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="areaGradientAnalytics" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#fad400" stopOpacity={0.25}/>
                          <stop offset="100%" stopColor="#fad400" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                      <XAxis 
                        dataKey="time" 
                        stroke="#52525b" 
                        fontSize={11} 
                        fontWeight="bold" 
                        axisLine={false} 
                        tickLine={false} 
                        dy={10}
                        tick={{ fill: '#9ca3af' }}
                      />
                      <YAxis 
                        stroke="#52525b" 
                        fontSize={11} 
                        fontWeight="bold" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#9ca3af' }}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(17,17,17,0.95)', border: '1px solid rgba(255,212,0,0.2)', borderRadius: '12px', fontSize: '11px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)', padding: '12px' }}
                        itemStyle={{ color: '#fad400', fontWeight: 'bold' }}
                        labelStyle={{ color: '#fff', marginBottom: '4px', fontWeight: 'bold' }}
                        cursor={{ stroke: 'rgba(255,212,0,0.2)', strokeWidth: 1, strokeDasharray: '4 4' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="impressions" 
                        stroke="#fad400" 
                        strokeWidth={3} 
                        fill="url(#areaGradientAnalytics)" 
                        animationDuration={1500}
                        activeDot={{ r: 6, fill: '#fad400', stroke: '#111', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-500 font-bold animate-pulse gap-6">
                    <Zap className="w-8 h-8 opacity-50" />
                    <span className="text-xs uppercase tracking-widest">Calibrando Flujo...</span>
                  </div>
                )}
                {loading && (
                  <div className="absolute inset-0 bg-gray-900/10 backdrop-blur-[1px] flex items-center justify-center pointer-events-none rounded-2xl">
                     <Activity className="w-8 h-8 text-tad-yellow opacity-40 animate-spin" />
                  </div>
                )}
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 p-6 lg:p-8 rounded-2xl shadow-sm relative overflow-hidden group hover:border-tad-yellow/30 transition-all duration-500 hover:-translate-y-1">
                 <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-gray-900 rounded-xl border border-gray-700 group-hover:border-tad-yellow/40 transition-all shadow-sm">
                       <ShieldCheck className="w-5 h-5 text-gray-400 group-hover:text-tad-yellow transition-colors" />
                    </div>
                    <div>
                       <h4 className="text-lg font-bold text-white uppercase tracking-tight">Ranking Fleet</h4>
                       <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Impactos por Nodo (Top 5)</p>
                    </div>
                 </div>
                 <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={topTaxis}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                          <XAxis dataKey="name" stroke="#52525b" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                          <YAxis stroke="#52525b" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                          <Tooltip 
                             contentStyle={{ backgroundColor: 'rgba(17,17,17,0.95)', border: '1px solid rgba(255,212,0,0.2)', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}
                             cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                          />
                          <Bar dataKey="Plays" fill="#fad400" radius={[6, 6, 0, 0]} barSize={24} />
                       </BarChart>
                    </ResponsiveContainer>
                 </div>
              </div>

              <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 p-6 lg:p-8 rounded-2xl shadow-sm relative overflow-hidden flex flex-col justify-between group hover:border-tad-yellow/30 transition-all duration-500 hover:-translate-y-1">
                 <div className="absolute -right-10 -top-10 w-48 h-48 bg-emerald-500/5 blur-[80px] group-hover:opacity-100 opacity-0 transition-opacity duration-1000" />
                 <div>
                    <div className="flex items-center gap-4 mb-8 relative z-10">
                       <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20 shadow-sm group-hover:scale-110 transition-transform">
                          <MapIcon className="w-5 h-5" />
                       </div>
                       <div>
                          <h4 className="text-lg font-bold text-white uppercase tracking-tight">Alcance Regional</h4>
                          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Densidad Activa</p>
                       </div>
                    </div>
                    <div className="space-y-5 relative z-10">
                       {sectors.map((s, i) => (
                          <SectorRow key={i} label={s.label} perc={s.perc} color={s.color} />
                       ))}
                    </div>
                 </div>
                 <Link 
                    href="/tracking"
                    className="w-full mt-8 py-4 bg-gray-900/50 hover:bg-tad-yellow hover:text-black border border-gray-700/50 hover:border-transparent rounded-xl text-xs font-bold uppercase tracking-widest text-gray-400 transition-all flex items-center justify-center gap-2 group/link relative z-10"
                 >
                    Ver Heatmap Satelital
                    <ExternalLink className="w-4 h-4 group-link-hover:translate-x-1 group-link-hover:-translate-y-1 transition-transform" />
                 </Link>
              </div>
           </div>
        </div>

        {/* High-Frequency Pulse Sidebar */}
        <div className="lg:col-span-1">
           <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-2xl h-full overflow-hidden flex flex-col shadow-sm relative hover:border-tad-yellow/20 transition-all duration-500">
              <div className="absolute bottom-0 left-0 w-full h-48 bg-gradient-to-t from-tad-yellow/[0.03] to-transparent pointer-events-none" />
              
              <div className="p-6 border-b border-gray-700/50 bg-gray-900/30">
                 <div className="flex items-center justify-between mb-1">
                    <h4 className="text-lg font-bold text-white uppercase tracking-tight">Live Network</h4>
                    <div className="relative flex items-center justify-center w-6 h-6">
                       <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping absolute" />
                       <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 relative z-10 shadow-[0_0_8px_#10b981]" />
                    </div>
                 </div>
                 <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Feed de Transmisión Activo</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                 {recentPlays.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4 text-center p-6 opacity-50">
                       <Cpu className="w-8 h-8 text-gray-500 animate-pulse" />
                       <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">Escaneando red en busca de paquetes...</p>
                    </div>
                 ) : (recentPlays as RecentPlay[]).map((play, idx) => (
                    <div 
                      key={idx} 
                      className={clsx(
                        "group bg-gray-900/50 hover:bg-gray-900 p-4 rounded-xl border border-gray-700/50 transition-all hover:border-tad-yellow/30 animate-in fade-in slide-in-from-right-4 duration-300 fill-mode-both shadow-sm",
                        `[animation-delay:${idx * 50}ms]`
                      )}
                    >
                       <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center group-hover:bg-tad-yellow/10 group-hover:border-tad-yellow/30 transition-all shrink-0">
                                <Tablet className="w-4 h-4 text-gray-500 group-hover:text-tad-yellow transition-colors" />
                             </div>
                             <div>
                                <p className="text-xs font-bold text-white uppercase tracking-tight leading-none mb-1">ND-{play.taxiNumber || play.deviceId.slice(0, 4).toUpperCase()}</p>
                                <p className="text-[10px] text-gray-500 font-mono font-medium tracking-tight truncate max-w-[100px]">{play.deviceId.slice(0, 15)}...</p>
                             </div>
                          </div>
                          <div className="text-right shrink-0">
                             <p className="text-[10px] font-bold text-gray-500 uppercase">
                                {formatDistanceToNow(new Date(play.timestamp), { addSuffix: true }).replace('about ', '')}
                             </p>
                          </div>
                       </div>
                       <div className="flex items-center gap-2 bg-gray-900 px-3 py-2 rounded-lg border border-gray-700/50 group-hover:border-tad-yellow/20 transition-colors">
                          <div className="w-1.5 h-1.5 rounded-full bg-tad-yellow animate-pulse shadow-[0_0_8px_#fad400] shrink-0" />
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">
                             PLAY: {play.videoId?.slice(0, 16) || 'STREAM_ORBITAL_OK'}
                          </span>
                       </div>
                    </div>
                 ))}
              </div>

              <div className="p-4 bg-gray-900/50 border-t border-gray-700/50 mt-auto">
                 <Link 
                   href="/analytics/history"
                   className="w-full py-3 bg-gray-800 hover:bg-tad-yellow text-gray-400 hover:text-black rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 group border border-gray-700 hover:border-transparent"
                 >
                    Ver Registro Completo
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                 </Link>
              </div>
           </div>
        </div>
      </div>

      {/* Global ROI Console */}
      <div className="bg-gray-800/60 backdrop-blur-xl p-8 lg:p-10 rounded-3xl border border-gray-700/50 relative overflow-hidden group shadow-md hover:border-tad-yellow/30 transition-all duration-700 mb-8">
         <div className="absolute top-0 right-0 w-1/2 h-full bg-tad-yellow/[0.02] skew-x-[-20deg] translate-x-20 group-hover:bg-tad-yellow/[0.04] transition-all duration-1000 -z-10" />
         
         <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left">
               <div className="p-5 bg-gray-900 rounded-2xl border border-gray-700 shadow-sm group-hover:scale-105 transition-transform duration-500 shrink-0">
                  <TrendingUp className="w-8 h-8 text-tad-yellow" />
               </div>
               <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-none mb-2">Desempeño Operativo (ROI)</h3>
                  <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">
                     La red opera con una eficiencia auditada del <span className="text-white font-bold">96.8%</span>. El costo logístico es <span className="text-tad-yellow font-bold">12% inferior</span> a los medios estáticos, impulsado por una hiper-segmentación en tiempo real.
                  </p>
               </div>
            </div>
            <div className="shrink-0">
               <button className="px-8 py-4 bg-gray-900 hover:bg-tad-yellow text-gray-300 hover:text-black font-bold uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-sm border border-gray-700 hover:border-transparent flex items-center gap-2">
                 Configurar Alertas
               </button>
            </div>
         </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(250, 212, 0, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(250, 212, 0, 0.3);
        }
      `}</style>
    </div>
  );
}

function StatsCard({ icon, label, value, sub, trend, color, loading, delay }: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  sub: string; 
  trend: string; 
  color: string;
  loading?: boolean;
  delay?: string;
}) {
   return (
      <div 
        className={clsx(
          "bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 p-6 rounded-3xl flex flex-col relative overflow-hidden group hover:border-tad-yellow/30 hover:-translate-y-1 transition-all duration-500 animate-in fade-in slide-in-from-bottom-8 fill-mode-both shadow-md kpi-card"
        )}
      >
         <style jsx>{`
           .kpi-card { animation-delay: ${delay}; }
         `}</style>
         <div className="flex justify-between items-start mb-6">
            <div className={clsx(
              "p-3 rounded-xl border transition-all duration-500 shadow-sm",
              color === 'yellow' ? 'bg-gray-900 text-tad-yellow border-gray-700' : 'bg-gray-900 text-white border-gray-700'
            )}>
               {icon}
            </div>
            <span className={clsx(
              "text-[10px] font-bold px-3 py-1 rounded-full border transition-colors",
              color === 'yellow' ? 'bg-tad-yellow/10 border-tad-yellow/20 text-tad-yellow' : 'bg-gray-800 border-gray-700 text-gray-400'
            )}>
               {trend}
            </span>
         </div>
         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
         {loading ? (
            <div className="h-10 w-24 bg-gray-800 animate-pulse rounded-full mb-3" />
         ) : (
            <h3 className="text-3xl lg:text-4xl font-black text-white tracking-tight mb-3">
               {value}
            </h3>
         )}
         <div className="flex items-center gap-2 mt-auto">
            <div className="w-1.5 h-1.5 bg-tad-yellow rounded-full" />
            <p className="text-xs font-medium text-gray-500">{sub}</p>
         </div>
      </div>
   );
}

function SectorRow({ label, perc, color }: { label: string; perc: number; color: string }) {
   const widthClassMap: Record<number, string> = {
      65: 'w-[65%]',
      20: 'w-[20%]',
      10: 'w-[10%]',
      5: 'w-[5%]'
   };

   return (
      <div className="space-y-1.5 group/row">
         <div className="flex justify-between items-end">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
            <span className={clsx("text-[10px] font-bold", color === 'yellow' ? 'text-tad-yellow' : 'text-gray-500')}>{perc}%</span>
         </div>
         <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden">
            <div 
               className={clsx(
                 "h-full rounded-full transition-all duration-1000",
                 color === 'yellow' ? 'bg-tad-yellow shadow-[0_0_8px_#fad400]' : 'bg-gray-600',
                 widthClassMap[perc] || 'w-0'
               )} 
            />
         </div>
      </div>
   );
}
