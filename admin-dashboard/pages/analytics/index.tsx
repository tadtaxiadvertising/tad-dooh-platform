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
    <div className="min-h-screen pb-20 animate-in fade-in duration-1000 relative selection:bg-tad-yellow selection:text-black font-sans">
      {/* Background Decor */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
         <div className="absolute top-[-15%] left-[-10%] w-[65%] h-[65%] bg-tad-yellow/[0.04] blur-[180px] rounded-full animate-pulse-soft" />
         <div className="absolute bottom-[5%] right-[-10%] w-[55%] h-[55%] bg-white/[0.01] blur-[160px] rounded-full" />
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 mb-16">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 bg-tad-yellow rounded-3xl flex items-center justify-center shadow-[0_20px_50px_rgba(255,212,0,0.15)]">
                <BarChart3 className="w-7 h-7 text-black" />
             </div>
             <div>
                <div className="flex items-center gap-3 mb-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-tad-yellow shadow-[0_0_8px_rgba(255,212,0,0.8)]" />
                   <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">Integrated Intelligence Core v4.2</p>
                </div>
                <h1 className="text-5xl lg:text-6xl font-black text-white uppercase tracking-tighter leading-none font-display">
                  Audited <span className="text-tad-yellow transition-all duration-700 hover:text-white cursor-default italic">Intelligence</span>
                </h1>
             </div>
          </div>
          <p className="text-zinc-500 max-w-2xl text-[12px] font-bold uppercase tracking-widest leading-relaxed">
            Advanced <span className="text-white">DOOH telemetrics</span> and impact auditing terminal.
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-zinc-900/30 backdrop-blur-3xl p-1.5 rounded-full border border-white/5 pl-6 pr-1.5">
            <div className="flex items-center gap-3 pr-4 border-r border-white/10">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
               <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest italic leading-none">Status: Nominal</span>
            </div>
            <button 
              onClick={loadData}
              disabled={loading}
              title="Refresh Data"
              className="p-4 bg-zinc-900 text-white rounded-full hover:bg-tad-yellow hover:text-black transition-all group disabled:opacity-50 border border-white/5 shadow-xl"
            >
               <RefreshCcw className={clsx("w-5 h-5", loading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-700")} />
            </button>
        </div>
      </div>

      {error && (
        <div className="mb-12 p-6 bg-rose-500/10 border border-rose-500/20 rounded-[2rem] flex items-center gap-4 text-rose-500 animate-in zoom-in duration-500">
           <Activity className="w-6 h-6 animate-pulse" />
           <p className="text-xs font-black uppercase tracking-widest">{error}</p>
        </div>
      )}

      {/* KPI Cluster */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
            <StatsCard 
               icon={<Target className="w-6 h-6" />}
               label="Total Impressions"
               value={summary?.totalImpressions?.toLocaleString() || '0'}
               sub="Audited SSL Link"
               trend="+14% vol"
               color="yellow"
               loading={loading && !summary}
               delay="100ms"
            />
            <StatsCard 
               icon={<Users className="w-6 h-6" />}
               label="Operational Nodes"
               value={summary?.activeNodes?.toString() || '0'}
               sub="Hardware Verified"
               trend="Stable"
               color="white"
               loading={loading && !summary}
               delay="200ms"
            />
            <StatsCard 
               icon={<MousePointer2 className="w-6 h-6" />}
               label="Engagement Ratio"
               value={`${summary?.ctr?.toFixed(2) || '4.2'}%`}
               sub="Active Interactions"
               trend="+0.6% ctr"
               color="yellow"
               loading={loading && !summary}
               delay="300ms"
            />
            <StatsCard 
               icon={<Clock className="w-6 h-6" />}
               label="Stream Frequency"
               value={summary?.hourlyAverage?.toString() || '0'}
               sub="Updates / Hr"
               trend="Peak_Freq"
               color="white"
               loading={loading && !summary}
               delay="400ms"
            />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-12">
        {/* Main Telemetry Visualization */}
        <div className="lg:col-span-2 space-y-10">
           <div className="bg-zinc-900/60 backdrop-blur-3xl border border-white/10 p-10 rounded-[3.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] relative overflow-hidden group hover:border-tad-yellow/30 transition-all duration-700">
              <div className="absolute top-0 right-0 w-64 h-64 bg-tad-yellow/[0.03] blur-[100px] -z-10 group-hover:bg-tad-yellow/[0.05] transition-colors duration-1000" />
              <div className="flex items-center justify-between mb-10">
                 <div className="flex items-center gap-5">
                    <div className="p-4 bg-tad-yellow/10 rounded-2xl text-tad-yellow border border-tad-yellow/20 shadow-2xl">
                       <Activity className="w-6 h-6" />
                    </div>
                    <div>
                       <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter">Patrón de Tránsito Diário</h4>
                       <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mt-1">Sincronización de impactos (Últimas 24H)</p>
                    </div>
                 </div>
                 <div className="flex gap-4 items-center bg-black/40 px-5 py-2 rounded-2xl border border-white/5">
                    <span className="w-1.5 h-1.5 rounded-full bg-tad-yellow shadow-[0_0_10px_#fad400] animate-pulse" />
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">Live Feed</span>
                 </div>
              </div>

              <div className="h-96 w-full relative">
                {mounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={hourlyPlays}>
                      <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#fad400" stopOpacity={0.25}/>
                          <stop offset="100%" stopColor="#fad400" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                      <XAxis 
                        dataKey="time" 
                        stroke="#27272a" 
                        fontSize={10} 
                        fontWeight="900" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#3f3f46' }}
                      />
                      <YAxis 
                        stroke="#27272a" 
                        fontSize={10} 
                        fontWeight="900" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#3f3f46' }}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#09090b', border: '1px solid #ffffff10', borderRadius: '24px', fontSize: '10px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', padding: '16px' }}
                        itemStyle={{ color: '#fad400', fontWeight: '900', textTransform: 'uppercase' }}
                        labelStyle={{ color: '#fff', marginBottom: '8px', fontWeight: '900', letterSpacing: '0.1em' }}
                        cursor={{ stroke: '#fad400', strokeWidth: 1, strokeDasharray: '4 4' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="impressions" 
                        stroke="#fad400" 
                        strokeWidth={4} 
                        fill="url(#areaGradient)" 
                        animationDuration={2500}
                        activeDot={{ r: 8, fill: '#fad400', stroke: '#000', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-800 font-black italic animate-pulse gap-6">
                    <Zap className="w-12 h-12" />
                    CALIBRANDO FLUJO DE DATOS...
                  </div>
                )}
                {loading && (
                  <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px] flex items-center justify-center pointer-events-none rounded-[3rem]">
                     <Activity className="w-10 h-10 text-tad-yellow opacity-40 animate-spin" />
                  </div>
                )}
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="bg-zinc-900/60 backdrop-blur-3xl border border-white/10 p-10 rounded-[3.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] relative overflow-hidden group hover:border-tad-yellow/30 transition-all duration-700 hover:-translate-y-2">
                 <div className="flex items-center gap-5 mb-10">
                    <div className="p-4 bg-white/5 rounded-2xl text-white border border-white/10 group-hover:border-tad-yellow/40 transition-all shadow-xl group-hover:rotate-6">
                       <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                       <h4 className="text-xl font-black text-white uppercase italic tracking-tighter">Ranking de Flota</h4>
                       <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mt-1">Impactos por Nodo (Top 5)</p>
                    </div>
                 </div>
                 <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={topTaxis}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                          <XAxis dataKey="name" stroke="#27272a" fontSize={9} fontWeight="900" axisLine={false} tickLine={false} />
                          <YAxis stroke="#27272a" fontSize={9} fontWeight="900" axisLine={false} tickLine={false} />
                          <Tooltip 
                             contentStyle={{ backgroundColor: '#000', border: '1px solid #ffffff10', borderRadius: '16px', fontSize: '9px', fontWeight: '900' }}
                             cursor={{ fill: '#ffffff05' }}
                          />
                          <Bar dataKey="Plays" fill="#fad400" radius={[8, 8, 0, 0]} barSize={28} />
                       </BarChart>
                    </ResponsiveContainer>
                 </div>
              </div>

              <div className="bg-zinc-900/60 backdrop-blur-3xl border border-white/10 p-10 rounded-[3.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col justify-between group hover:border-tad-yellow/30 transition-all duration-700 hover:-translate-y-2">
                 <div className="absolute -right-10 -top-10 w-48 h-48 bg-emerald-500/5 blur-[80px] group-hover:opacity-100 opacity-0 transition-opacity duration-1000" />
                 <div>
                    <div className="flex items-center gap-5 mb-8">
                       <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500 border border-emerald-500/20 shadow-xl group-hover:scale-110 transition-transform">
                          <MapIcon className="w-6 h-6" />
                       </div>
                       <div>
                          <h4 className="text-xl font-black text-white uppercase italic tracking-tighter">Alcance Geográfico</h4>
                          <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mt-1">Densidad por Sectores</p>
                       </div>
                    </div>
                    <div className="space-y-6">
                       {sectors.map((s, i) => (
                          <SectorRow key={i} label={s.label} perc={s.perc} color={s.color} />
                       ))}
                    </div>
                 </div>
                 <Link 
                    href="/tracking"
                    className="w-full mt-10 py-5 bg-zinc-900/50 hover:bg-tad-yellow hover:text-black border border-white/5 hover:border-transparent rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-400 transition-all flex items-center justify-center gap-3 group/link shadow-2xl italic"
                 >
                    Ver Mapa Satelital de Calor
                    <ExternalLink className="w-4 h-4 group-link-hover:translate-x-1 group-link-hover:-translate-y-1 transition-transform" />
                 </Link>
              </div>
           </div>
        </div>

        {/* High-Frequency Pulse Sidebar */}
        <div className="lg:col-span-1">
           <div className="bg-zinc-900/60 backdrop-blur-3xl border border-white/10 rounded-[3.5rem] h-full overflow-hidden flex flex-col shadow-[0_50px_100px_rgba(0,0,0,0.5)] relative hover:border-tad-yellow/20 transition-all duration-700">
              <div className="absolute bottom-0 left-0 w-full h-48 bg-gradient-to-t from-tad-yellow/[0.03] to-transparent pointer-events-none" />
              
              <div className="p-10 border-b border-white/5 bg-white/[0.01]">
                 <div className="flex items-center justify-between mb-2">
                    <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter">Net Pulse</h4>
                    <div className="relative">
                       <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping absolute inset-0" />
                       <div className="w-3 h-3 rounded-full bg-emerald-500 relative z-10 shadow-[0_0_10px_#10b981]" />
                    </div>
                 </div>
                 <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.3em] italic">Transmisiones en Tiempo Real</p>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                 {recentPlays.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-6 text-center p-10 opacity-30">
                       <Cpu className="w-12 h-12 text-zinc-500 animate-pulse" />
                       <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.4em] leading-relaxed">Escaneando red en busca de paquetes de telemetría...</p>
                    </div>
                 ) : (recentPlays as RecentPlay[]).map((play, idx) => (
                    <div 
                      key={idx} 
                      className={clsx(
                        "group bg-zinc-900/40 hover:bg-zinc-900 p-5 rounded-[2rem] border border-white/5 transition-all hover:border-tad-yellow/30 animate-in fade-in slide-in-from-right-4 duration-500 fill-mode-both",
                        `[animation-delay:${idx * 100}ms]`
                      )}
                    >
                       <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-2xl bg-black border border-white/5 flex items-center justify-center group-hover:bg-tad-yellow/10 group-hover:border-tad-yellow/30 transition-all">
                                <Tablet className="w-5 h-5 text-zinc-600 group-hover:text-tad-yellow" />
                             </div>
                             <div>
                                <p className="text-sm font-black text-white uppercase italic tracking-tighter leading-none mb-1">NODE-{play.taxiNumber || play.deviceId.slice(0, 4).toUpperCase()}</p>
                                <p className="text-[9px] text-zinc-700 font-mono font-bold tracking-tight">{play.deviceId.slice(0, 15)}...</p>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className="text-[9px] font-black text-zinc-800 uppercase italic">
                                {formatDistanceToNow(new Date(play.timestamp), { addSuffix: true }).replace('about ', '')}
                             </p>
                          </div>
                       </div>
                       <div className="flex items-center gap-3 bg-black/60 px-4 py-2.5 rounded-xl border border-white/5 group-hover:border-tad-yellow/10 transition-colors">
                          <div className="w-2 h-2 rounded-full bg-tad-yellow animate-pulse shadow-[0_0_8px_#fad400]" />
                          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest italic truncate">
                             ASSET_HASH: {play.videoId?.slice(0, 16) || 'STREAM_ORBITAL_OK'}
                          </span>
                       </div>
                    </div>
                 ))}
              </div>

              <div className="p-8 bg-black/40 border-t border-white/5">
                 <Link 
                   href="/analytics/history"
                   className="w-full py-5 bg-white/5 hover:bg-tad-yellow text-zinc-500 hover:text-black rounded-2xl font-black uppercase tracking-widest text-[10px] italic shadow-2xl transition-all flex items-center justify-center gap-3 group shadow-tad-yellow/5 border border-white/5 hover:border-transparent"
                 >
                    Ver Registro Maestro
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                 </Link>
              </div>
           </div>
        </div>
      </div>

      {/* Global ROI Console */}
      <div className="bg-zinc-900/80 backdrop-blur-3xl p-12 rounded-[4rem] border border-white/10 relative overflow-hidden group shadow-[0_50px_120px_rgba(0,0,0,0.6)] mt-16 hover:border-tad-yellow/40 transition-all duration-1000">
         <div className="absolute top-0 right-0 w-[600px] h-full bg-tad-yellow/[0.02] skew-x-[-25deg] translate-x-32 group-hover:bg-tad-yellow/[0.04] transition-all duration-1000" />
         
         <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="flex gap-10 items-center">
               <div className="p-8 bg-zinc-900 rounded-[3rem] border border-white/5 shadow-3xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-700">
                  <TrendingUp className="w-12 h-12 text-tad-yellow" strokeWidth={3} />
               </div>
               <div>
                  <h3 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none mb-3 font-display">Desempeño Operativo (ROI)</h3>
                  <p className="text-zinc-500 font-bold max-w-2xl text-[13px] leading-relaxed uppercase tracking-tight">
                     La red opera con una eficiencia auditada del <span className="text-white">96.8%</span>. El costo de impacto se mantiene un <span className="text-tad-yellow italic">12% inferior</span> a los medios OOH convencionales, impulsado por una segmentación geográfica dinámica en tiempo real.
                  </p>
               </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-6">
               <button className="px-12 py-6 bg-tad-yellow text-black font-black uppercase text-[10px] tracking-[0.3em] rounded-3xl hover:-translate-y-2 active:translate-y-0 transition-all shadow-3xl shadow-tad-yellow/20 italic">
                 Configurar Alertas Operativas
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
          background: rgba(0, 0, 0, 0.1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(250, 212, 0, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(250, 212, 0, 0.2);
        }
        .text-shadow-glow {
          text-shadow: 0 0 20px rgba(250, 212, 0, 0.3);
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
          "bg-zinc-900/40 backdrop-blur-3xl border border-white/5 p-10 rounded-[3rem] relative overflow-hidden group hover:border-tad-yellow/40 hover:shadow-[0_20px_50px_rgba(255,212,0,0.15)] transition-all duration-700 animate-in fade-in slide-in-from-bottom-8 fill-mode-both shadow-[0_30px_60px_rgba(0,0,0,0.4)] hover:-translate-y-2",
          delay && `[animation-delay:${delay}]`
        )}
      >
         <div className="flex justify-between items-start mb-10">
            <div className={clsx(
              "p-6 rounded-full border transition-all duration-700 group-hover:scale-110 shadow-2xl",
              color === 'yellow' ? 'bg-tad-yellow text-black border-tad-yellow shadow-tad-yellow/20' : 'bg-black/60 border-white/10 text-white'
            )}>
               {icon}
            </div>
            <span className={clsx(
              "text-[10px] font-black px-6 py-2 rounded-full border transform transition-all duration-700 group-hover:-translate-x-2 italic tracking-widest lowercase",
              color === 'yellow' ? 'bg-tad-yellow/10 border-tad-yellow/20 text-tad-yellow' : 'bg-zinc-900 border-white/5 text-zinc-600'
            )}>
               {trend}
            </span>
         </div>
         <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] mb-3 italic">{label}</p>
         {loading ? (
            <div className="h-14 w-32 bg-zinc-900 animate-pulse rounded-full mb-4" />
         ) : (
            <h3 className="text-4xl lg:text-5xl font-black text-white italic tracking-tighter mb-4 transition-colors duration-700 leading-none font-display">
               {value}
            </h3>
         )}
         <div className="flex items-center gap-3">
            <div className="w-5 h-1 bg-tad-yellow rounded-full" />
            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest italic">{sub}</p>
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
      <div className="space-y-3 group/row">
         <div className="flex justify-between items-end">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic group-hover/row:text-zinc-300 transition-colors">{label}</span>
            <span className={clsx("text-[11px] font-black italic", color === 'yellow' ? 'text-tad-yellow' : 'text-zinc-700')}>{perc}%</span>
         </div>
         <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden p-[2px] border border-white/5">
            <div 
               className={clsx(
                 "h-full rounded-full transition-all duration-1000",
                 color === 'yellow' ? 'bg-tad-yellow shadow-[0_0_12px_#fad400]' : 'bg-zinc-700',
                 widthClassMap[perc] || 'w-0'
               )} 
            />
         </div>
      </div>
   );
}
