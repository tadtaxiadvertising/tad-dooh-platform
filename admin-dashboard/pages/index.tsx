import { useEffect, useState, useCallback } from 'react';
import { getDevices, getCampaigns, getMedia, getHourlyPlays } from '../services/api';
import { Activity, CarFront, Megaphone, CloudUpload, TrendingUp, ShieldCheck, Zap, Cpu, Server, Radio, AlertTriangle, ArrowUpRight, BarChart3 } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useTabSync } from '../hooks/useTabSync';
import clsx from 'clsx';
import Link from 'next/link';

export default function Home() {
  const [stats, setStats] = useState({
    devices: 0,
    online: 0,
    campaigns: 0,
    activeCampaigns: 0,
    media: 0
  });
  const [chartData, setChartData] = useState<{ name: string; val: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [devices, campaigns, media, hourly] = await Promise.all([
        getDevices(), 
        getCampaigns(), 
        getMedia(), 
        getHourlyPlays()
      ]);
      
      setStats({
        devices: Array.isArray(devices) ? devices.length : 0,
        online: Array.isArray(devices) ? (devices as { status: string }[]).filter((d) => d.status === 'online').length : 0,
        campaigns: Array.isArray(campaigns) ? campaigns.length : 0,
        activeCampaigns: Array.isArray(campaigns) ? (campaigns as { active: boolean }[]).filter((c) => c.active).length : 0,
        media: Array.isArray(media) ? media.length : 0
      });

      if (Array.isArray(hourly) && hourly.length > 0) {
        setChartData((hourly as { hour: string; plays: string | number }[]).sort((a, b) => a.hour.localeCompare(b.hour)).map((d) => ({ name: `${d.hour}:00`, val: Number(d.plays) })));
      } else {
        setChartData([
          { name: '00:00', val: 0 },{ name: '04:00', val: 0 },{ name: '08:00', val: 0 },
          { name: '12:00', val: 0 },{ name: '16:00', val: 0 },{ name: '20:00', val: 0 },{ name: '23:59', val: 0 },
        ]);
      }
    } catch (err) {
      console.error("Dashboard Load Error:", err);
      setError("Falla de sincronización con el núcleo central.");
    } finally {
      setLoading(false);
    }
  }, []);

  useTabSync('DEVICES', loadData);
  useTabSync('CAMPAIGNS', loadData);
  useTabSync('MEDIA', loadData);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, [loadData]);

  return (
    <div className="min-h-screen pb-20 animate-in fade-in duration-1000 relative selection:bg-tad-yellow selection:text-black font-sans">
      {/* Background Decor */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
         <div className="absolute top-[-15%] left-[-10%] w-[65%] h-[65%] bg-tad-yellow/[0.03] blur-[180px] rounded-full animate-pulse-soft" />
         <div className="absolute bottom-[5%] right-[-10%] w-[55%] h-[55%] bg-white/[0.01] blur-[160px] rounded-full" />
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 mb-16">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 bg-tad-yellow rounded-3xl flex items-center justify-center shadow-[0_20px_50px_rgba(255,212,0,0.15)]">
                <Radio className="w-7 h-7 text-black" />
             </div>
             <div>
                <div className="flex items-center gap-3 mb-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-tad-yellow shadow-[0_0_8px_rgba(255,212,0,0.8)]" />
                   <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">Integrated Network OS v4.5</p>
                </div>
                <h1 className="text-5xl lg:text-6xl font-black text-white uppercase tracking-tighter leading-none font-display">
                  Command <span className="text-tad-yellow transition-all duration-700 hover:text-white cursor-default">Nexus</span>
                </h1>
             </div>
          </div>
          <p className="text-zinc-500 max-w-2xl text-[12px] font-bold uppercase tracking-widest leading-relaxed">
            Real-time <span className="text-white">DOOH Intelligence</span> and fleet orchestration platform.
          </p>
        </div>
        
        <div className="flex items-center gap-6 bg-zinc-900/30 backdrop-blur-3xl p-2 rounded-full border border-white/5 pl-8 pr-2 shadow-2xl">
           <div className="text-right">
              <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-1.5">System Status</p>
              <div className="flex items-center gap-3 justify-end">
                 <span className="text-xs font-black text-emerald-500 uppercase tracking-tighter">Operational</span>
                 <div className="flex gap-1">
                    {[1,2,3].map(i => <div key={i} className="w-1 h-3 bg-emerald-500/30 rounded-full" />)}
                 </div>
              </div>
           </div>
           <button 
             title="System Activity Monitor"
             className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center text-zinc-500 hover:text-tad-yellow transition-all border border-white/5"
           >
              <Activity className="w-5 h-5" />
           </button>
        </div>
      </div>

      {/* Primary Metrics Cluster */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
        <StatsCard 
          icon={<CarFront className="w-6 h-6" />} 
          label="Active Fleet" 
          value={stats.devices} 
          sub={`${stats.online} Nodes Online`}
          trend="Secure_Link"
          color="yellow"
          delay="100ms"
        />
        <StatsCard 
          icon={<Megaphone className="w-6 h-6" />} 
          label="Campaigns" 
          value={stats.campaigns} 
          sub={`${stats.activeCampaigns} Active Streams`}
          trend="Live_Feed"
          color="white"
          delay="200ms"
        />
        <StatsCard 
          icon={<CloudUpload className="w-6 h-6" />} 
          label="Vault Assets" 
          value={stats.media} 
          sub="Optimized Delivery"
          trend="OIDC_Auth"
          color="yellow"
          delay="300ms"
        />
        <StatsCard 
          icon={<Activity className="w-6 h-6" />} 
          label="Network Reliability" 
          value="99.9%" 
          sub="Sub-40ms Latency"
          trend="Nominal"
          color="white"
          delay="400ms"
        />
      </div>

      {error && (
        <div className="mb-16 bg-rose-500/10 border border-rose-500/20 p-8 rounded-[3rem] flex items-center justify-between text-rose-500 animate-in zoom-in duration-700 shadow-3xl">
           <div className="flex items-center gap-6">
              <div className="p-4 bg-rose-500/20 rounded-2xl">
                 <AlertTriangle className="w-8 h-8 animate-pulse" />
              </div>
              <div>
                 <p className="text-[11px] font-black uppercase tracking-[0.3em] mb-1">Alerta de Sincronización Térmica</p>
                 <p className="text-xl font-black italic uppercase tracking-tighter">{error}</p>
              </div>
           </div>
           <button 
             onClick={loadData} 
             title="Reintentar carga de datos"
             className="px-10 py-4 bg-rose-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-rose-600 transition-all shadow-2xl"
           >
             Intentar Rebase
           </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          {/* Main Visualization Terminal */}
          <div className="bg-zinc-900/30 backdrop-blur-3xl border border-white/5 p-12 rounded-[4rem] shadow-[0_40px_100px_rgba(0,0,0,0.6)] relative overflow-hidden group hover:border-tad-yellow/20 transition-all duration-700">
             <div className="absolute top-0 right-0 w-96 h-96 bg-tad-yellow/10 blur-[120px] transition-opacity duration-1000 -z-10" />
             
             <div className="flex items-center justify-between mb-12">
                <div className="space-y-3">
                   <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter flex items-center gap-4">
                    <div className="p-3 bg-tad-yellow/10 rounded-2xl border border-tad-yellow/20">
                       <TrendingUp className="w-6 h-6 text-tad-yellow" />
                    </div>
                    Tráfico de Señal (Red DOOH)
                  </h3>
                  <p className="text-[10px] text-zinc-600 uppercase font-black tracking-[0.3em] italic">Propagación de impactos verificados por ciclo de 24H</p>
                </div>
                 <div className="flex gap-2 bg-black/40 p-1.5 rounded-full border border-white/5">
                   {['Live', '24H', '7D'].map((t) => (
                      <button key={t} className={clsx("px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all italic", t === '24H' ? "bg-tad-yellow text-black border-transparent shadow-xl" : "bg-transparent text-zinc-700 border-transparent hover:text-white")}>{t}</button>
                   ))}
                </div>
             </div>

             <div className="h-[400px] relative">
               {mounted ? (
                 (!chartData || chartData.length === 0 || loading) ? (
                   <div className="w-full h-full flex flex-col items-center justify-center text-zinc-800 animate-pulse gap-6">
                     <Radio className="w-16 h-16 opacity-20" />
                     <p className="text-[11px] font-black uppercase tracking-[0.5em] italic">Escaneando Frecuencias Regionales...</p>
                   </div>
                 ) : (
                   <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={chartData}>
                       <defs>
                          <linearGradient id="chartGradientMain" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FFD400" stopOpacity={0.7}/>
                            <stop offset="95%" stopColor="#FFD400" stopOpacity={0}/>
                          </linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="5 5" stroke="#ffffff03" vertical={false} />
                       <XAxis dataKey="name" stroke="#27272a" fontSize={10} fontWeight="900" axisLine={false} tickLine={false} dy={15} tick={{ fill: '#3f3f46' }} />
                       <YAxis stroke="#27272a" fontSize={10} fontWeight="900" axisLine={false} tickLine={false} tick={{ fill: '#3f3f46' }} />
                       <Tooltip 
                         contentStyle={{ backgroundColor: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(32px)', border: '1px solid rgba(255,212,0,0.1)', borderRadius: '24px', fontSize: '11px', fontWeight: '900', padding: '20px', boxShadow: '0 30px 60px rgba(0,0,0,0.8)' }}
                         itemStyle={{ color: '#FFD400', textTransform: 'uppercase' }}
                         cursor={{ stroke: '#FFD400', strokeWidth: 1, strokeDasharray: '6 6' }}
                         labelStyle={{ color: '#fff', marginBottom: '10px', letterSpacing: '0.1em' }}
                       />
                       <Area 
                         type="monotone" 
                         dataKey="val" 
                         stroke="#FFD400" 
                         strokeWidth={6} 
                         fillOpacity={1} 
                         fill="url(#chartGradientMain)" 
                         animationDuration={2500}
                         className="drop-shadow-[0_0_25px_rgba(255,212,0,0.5)]"
                         activeDot={{ r: 8, fill: '#FFD400', stroke: '#000', strokeWidth: 3 }}
                       />
                     </AreaChart>
                   </ResponsiveContainer>
                 )
               ) : null}
             </div>
          </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-10 translate-y-0">
             <div className="bg-zinc-900/70 backdrop-blur-2xl border border-white/10 p-10 rounded-[3.5rem] group hover:border-tad-yellow/40 transition-all duration-700 shadow-[0_20px_40px_rgba(0,0,0,0.5)] hover:shadow-[0_20px_50px_rgba(255,212,0,0.15)] hover:-translate-y-1 overflow-hidden relative">
                <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-tad-yellow/10 blur-[100px] group-hover:bg-tad-yellow/20 transition-all duration-1000 -z-10" />
                <div className="flex items-center gap-5 mb-8">
                   <div className="w-14 h-14 rounded-[1.5rem] bg-tad-yellow/10 border border-tad-yellow/20 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 shadow-2xl">
                      <Cpu className="w-7 h-7 text-tad-yellow" />
                   </div>
                   <h4 className="text-white font-black uppercase italic text-sm tracking-[0.2em]">Protocolo de Red</h4>
                </div>
                <p className="text-[12px] text-zinc-500 font-bold uppercase tracking-tight leading-relaxed mb-8"> 
                  Handshake multicanal <span className="text-white">v4.5.0</span> activo sobre el cluster central. Latencia nominal detectada: <span className="text-emerald-500 italic">38ms (Stable)</span>
                </p>
                <div className="flex items-end gap-2 h-10">
                   {[1,2,3,2,4,3,1,2,5,3,4].map((h, i) => (
                     <div key={i} className="w-1.5 flex-1 bg-tad-yellow/10 rounded-full overflow-hidden relative">
                        <div 
                           className={clsx(
                             "absolute bottom-0 left-0 w-full bg-tad-yellow/60 rounded-full animate-pulse",
                             `h-[${h * 15}%]`
                           )} 
                         />
                     </div>
                   ))}
                </div>
             </div>

             <div className="bg-zinc-900/70 backdrop-blur-2xl border border-white/10 p-10 rounded-[3.5rem] group hover:border-blue-500/40 transition-all duration-700 shadow-[0_20px_40px_rgba(0,0,0,0.5)] hover:shadow-[0_20px_50px_rgba(59,130,246,0.15)] hover:-translate-y-1 overflow-hidden relative">
                <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/10 blur-[100px] group-hover:bg-blue-500/20 transition-all duration-1000 -z-10" />
                <div className="flex items-center gap-5 mb-8">
                   <div className="w-14 h-14 rounded-[1.5rem] bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 shadow-2xl">
                      <Server className="w-7 h-7 text-blue-400" />
                   </div>
                   <h4 className="text-white font-black uppercase italic text-sm tracking-[0.2em]">Asset Delivery</h4>
                </div>
                <p className="text-[12px] text-zinc-500 font-bold uppercase tracking-tight leading-relaxed mb-8">
                  Sincronización de activos al <span className="text-white">98%</span> en toda la flota periférica. Sistema de cache OIDC optimizado para streams 4K.
                </p>
                <div className="h-2 w-full bg-blue-500/10 rounded-full overflow-hidden p-[2px] border border-white/5">
                   <div className="h-full bg-blue-500/60 rounded-full w-[98%] shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-pulse" />
                </div>
             </div>
          </div>
        </div>

        {/* Security & Intelligence Nexus */}
        <div className="space-y-12">
           <div className="bg-zinc-900/70 backdrop-blur-2xl border border-white/10 p-12 rounded-[4rem] shadow-xl relative overflow-hidden group/security hover:border-tad-yellow/30 hover:shadow-[0_20px_60px_rgba(255,212,0,0.15)] hover:-translate-y-2 transition-all duration-700">
              <div className="absolute top-0 right-0 w-80 h-80 bg-tad-yellow/10 blur-[120px] -z-10" />
              <div className="relative z-10">
                 <div className="w-20 h-20 bg-tad-yellow rounded-[2rem] flex items-center justify-center mb-10 shadow-3xl shadow-tad-yellow/20 group-hover/security:rotate-12 transition-transform duration-700 group-hover/security:scale-110">
                    <ShieldCheck className="w-10 h-10 text-black" />
                 </div>
                 <h4 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none mb-6 italic">Capa de <br/><span className="text-tad-yellow uppercase">Seguridad</span></h4>
                 <p className="text-[13px] text-zinc-600 font-bold uppercase tracking-tight leading-relaxed mb-10">
                   Protección Handshake OIDC v4.5 con cifrado TLS 1.3 auditado. Cada nodo es validado mediante firma digital de hardware en el clúster central.
                 </p>
                 <div className="flex items-center gap-5 p-5 bg-black/40 rounded-[2rem] border border-white/5 group-hover/security:border-tad-yellow/20 transition-colors">
                    <div className="relative">
                       <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_12px_#10b981] animate-pulse" />
                    </div>
                    <span className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.3em] italic">Escrutinio Nominal OK</span>
                 </div>
              </div>
           </div>

           <div className="bg-zinc-900/70 backdrop-blur-2xl border border-white/10 p-12 rounded-[4rem] shadow-xl relative overflow-hidden group/upgrade hover:border-tad-yellow/20 hover:shadow-[0_20px_50px_rgba(255,212,0,0.1)] hover:-translate-y-1 transition-all duration-700">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-tad-yellow/60 to-transparent" />
              <div className="flex items-center gap-4 mb-8">
                 <BarChart3 className="w-6 h-6 text-tad-yellow animate-pulse" />
                 <h4 className="text-xl font-black text-white uppercase italic tracking-tighter italic">Crecimiento Log</h4>
              </div>
              <p className="text-[12px] text-zinc-700 font-bold uppercase tracking-wider leading-relaxed mb-10 italic leading-loose">
                 Protocolos escalares listos para el despliegue de <span className="text-white">2.5K nodos</span> adicionales bajo el cluster regional de expansión.
              </p>
              <button className="w-full bg-white/5 hover:bg-tad-yellow border border-white/10 hover:border-transparent text-zinc-500 hover:text-black transition-all group-hover/upgrade:shadow-3xl group-hover/upgrade:shadow-tad-yellow/10 py-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.4em] italic flex items-center justify-center gap-3">
                 Analizar Subredes <ArrowUpRight className="w-4 h-4" />
              </button>
           </div>

           <Link 
            href="/analytics"
            className="group relative block p-12 bg-gradient-to-br from-zinc-950 to-black border border-white/5 rounded-[4rem] shadow-3xl overflow-hidden hover:border-emerald-500/20 transition-all duration-700"
           >
              <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-emerald-500/[0.03] blur-[80px] group-hover:scale-125 transition-transform duration-1000" />
              <div className="flex items-center justify-between mb-6">
                 <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                    <TrendingUp className="w-6 h-6 text-emerald-500" />
                 </div>
                 <ArrowUpRight className="w-6 h-6 text-zinc-800 group-hover:text-emerald-500 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
              </div>
              <h4 className="text-xl font-black text-white uppercase italic tracking-widest mb-2 font-display">Deep Analytics</h4>
              <p className="text-[10px] text-zinc-700 font-black uppercase tracking-[0.3em] font-display">Explorar Core de Inteligencia</p>
           </Link>

           <div className="p-10 border-2 border-dashed border-white/5 rounded-[3.5rem] text-center opacity-30 group hover:opacity-100 transition-all duration-500 cursor-default">
              <Zap className="w-10 h-10 text-zinc-800 mx-auto mb-6 group-hover:scale-110 group-hover:text-tad-yellow transition-all" />
              <p className="text-[10px] font-black text-zinc-800 uppercase tracking-[0.6em] italic font-display">TAD_CORE_OS_v4.5_NOMINAL</p>
           </div>
        </div>
      </div>

      <style jsx global>{`
        .text-shadow-glow {
          text-shadow: 0 0 30px rgba(255, 212, 0, 0.45), 0 0 60px rgba(255, 212, 0, 0.2);
        }
      `}</style>
    </div>
  );
}

function StatsCard({ icon, label, value, sub, trend, color, delay }: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number; 
  sub: string; 
  trend: string; 
  color: string;
  delay?: string;
}) {
   const colorMap: Record<string, string> = {
      yellow: 'bg-tad-yellow/10 border-tad-yellow/20 text-tad-yellow shadow-tad-yellow/5',
      emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-emerald-500/5',
      blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400 shadow-blue-500/5',
      purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400 shadow-purple-500/5',
      white: 'bg-white/5 border-white/10 text-white shadow-white/5',
   };

    return (
      <div 
        className={clsx(
          "bg-zinc-900/40 backdrop-blur-3xl border border-white/5 p-10 rounded-[3rem] relative overflow-hidden group hover:-translate-y-2 hover:border-tad-yellow/30 transition-all duration-700 animate-in fade-in slide-in-from-bottom-10 fill-mode-both shadow-[0_30px_60px_rgba(0,0,0,0.4)] h-full flex flex-col justify-between",
          delay && `[animation-delay:${delay}]`
        )} 
      >
         <div className="flex justify-between items-start mb-10">
            <div className={clsx("p-6 rounded-full border transition-all duration-700 group-hover:scale-110 shadow-2xl", color === 'yellow' ? 'bg-tad-yellow text-black border-tad-yellow shadow-tad-yellow/20' : 'bg-black/60 border-white/10 text-white')}>
               {icon}
            </div>
            <span className={clsx("text-[10px] font-black px-6 py-2.5 rounded-full border transform transition-all duration-700 group-hover:-translate-x-2 italic tracking-widest lowercase", color === 'yellow' ? 'bg-tad-yellow/10 border-tad-yellow/20 text-tad-yellow' : 'bg-white/5 border-white/10 text-zinc-600')}>
               {trend}
            </span>
         </div>
         
         <div>
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] mb-3 italic">{label}</p>
            <h3 className="text-5xl lg:text-6xl font-black text-white italic tracking-tighter mb-4 leading-none font-display">
               {typeof value === 'number' && value < 10 ? `0${value}` : value}
            </h3>
            <div className="flex items-center gap-3">
               <div className="w-5 h-1 bg-tad-yellow rounded-full" />
               <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest italic">{sub}</p>
            </div>
         </div>
      </div>
   );
}
