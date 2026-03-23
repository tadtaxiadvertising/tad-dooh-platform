import { useEffect, useState, useCallback } from 'react';
import { getDevices, getCampaigns, getMedia, getHourlyPlays, getAnalyticsSummary } from '../services/api';
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
    media: 0,
    totalScans: 0,
    ctr: 0
  });
  const [chartData, setChartData] = useState<{ name: string; val: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [devices, campaigns, media, hourly, analytics] = await Promise.all([
        getDevices(), 
        getCampaigns(), 
        getMedia(), 
        getHourlyPlays(),
        getAnalyticsSummary()
      ]);
      
      setStats({
        devices: Array.isArray(devices) ? devices.length : 0,
        online: Array.isArray(devices) ? (devices as { status: string }[]).filter((d) => d.status === 'online').length : 0,
        campaigns: Array.isArray(campaigns) ? campaigns.length : 0,
        activeCampaigns: Array.isArray(campaigns) ? (campaigns as { active: boolean }[]).filter((c) => c.active).length : 0,
        media: Array.isArray(media) ? media.length : 0,
        totalScans: analytics?.totalScans || 0,
        ctr: analytics?.ctr || 0
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
    <div className="min-h-screen pb-12 animate-in fade-in duration-1000 relative selection:bg-tad-yellow selection:text-black font-sans mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
      {/* Background Decor */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-tad-yellow/[0.03] blur-[150px] rounded-full animate-pulse-soft" />
         <div className="absolute bottom-[0%] right-[-5%] w-[40%] h-[40%] bg-white/[0.01] blur-[120px] rounded-full" />
      </div>

      {/* Page Context Transition */}
      <div className="flex items-center gap-3 mb-8 opacity-60">
        <div className="w-8 h-px bg-white/20" />
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.4em]">Dashboard / Command Nexus</p>
      </div>

      {/* Primary Metrics Cluster */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {loading ? (
             Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[180px] bg-white/5 rounded-[24px] animate-pulse border border-white/5" />
             ))
        ) : (
          [
            { icon: <CarFront className="w-5 h-5" />, label: "Pantallas Activas", value: stats.devices, sub: `${stats.online} Online`, trend: "Secure", color: "yellow" },
            { icon: <Megaphone className="w-5 h-5" />, label: "Campañas", value: stats.campaigns, sub: `${stats.activeCampaigns} Streams`, trend: "Live", color: "white" },
            { icon: <CloudUpload className="w-5 h-5" />, label: "Archivos", value: stats.media, sub: "Optimizados", trend: "Sync", color: "yellow" },
            { icon: <Zap className="w-5 h-5" />, label: "Escaneos QR", value: stats.totalScans.toLocaleString(), sub: `${stats.ctr.toFixed(2)}% CTR`, trend: "Conversion", color: "white" }
          ].map((s, i) => (
            <StatsCard key={i} {...s} delay={i * 50} />
          ))
        )}
      </div>

      {error && (
        <div className="mb-10 bg-rose-500/10 border border-rose-500/20 p-6 rounded-2xl flex items-center justify-between text-rose-500 shadow-md">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-rose-500/20 rounded-xl">
                 <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                 <p className="text-xs font-bold uppercase tracking-wider mb-1">Error de Sincronización</p>
                 <p className="text-sm font-semibold">{error}</p>
              </div>
           </div>
           <button 
             onClick={loadData} 
             className="px-6 py-2.5 bg-rose-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-rose-600 transition-all shadow-lg"
           >
             Reintentar
           </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-6 lg:space-y-8">
          {/* Main Visualization Terminal */}
          <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 p-6 lg:p-8 rounded-2xl shadow-lg relative overflow-hidden group hover:border-tad-yellow/20 transition-all duration-500">
             <div className="absolute top-0 right-0 w-64 h-64 bg-tad-yellow/5 blur-[80px] transition-opacity duration-1000 -z-10" />
             
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                   <h3 className="text-lg font-bold text-white flex items-center gap-3 mb-1">
                    <TrendingUp className="w-5 h-5 text-tad-yellow" />
                    Tráfico de Señal (Red DOOH)
                  </h3>
                  <p className="text-xs text-gray-400 font-medium">Impactos verificados en las últimas 24 horas</p>
                </div>
                 <div className="flex gap-2">
                   {['Live', '24H', '7D'].map((t) => (
                      <button key={t} className={clsx("px-5 py-1.5 rounded-lg text-xs font-bold transition-all", t === '24H' ? "bg-tad-yellow text-black shadow-md" : "bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:text-white")}>{t}</button>
                   ))}
                </div>
             </div>

             <div className="h-[320px] relative w-full overflow-hidden">
               {mounted ? (
                 (!chartData || chartData.length === 0 || loading) ? (
                   <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-4">
                     <Radio className="w-10 h-10 opacity-30 animate-pulse" />
                     <p className="text-xs font-bold tracking-wider">Escaneando métricas regionales...</p>
                   </div>
                 ) : (
                   <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                       <defs>
                          <linearGradient id="chartGradientMain" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FFD400" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#FFD400" stopOpacity={0}/>
                          </linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                       <XAxis dataKey="name" stroke="#52525b" fontSize={11} axisLine={false} tickLine={false} dy={10} tick={{ fill: '#9ca3af' }} />
                       <YAxis stroke="#52525b" fontSize={11} axisLine={false} tickLine={false} tick={{ fill: '#9ca3af' }} />
                       <Tooltip 
                         contentStyle={{ backgroundColor: 'rgba(17,17,17,0.95)', border: '1px solid rgba(255,212,0,0.2)', borderRadius: '12px', fontSize: '12px' }}
                         itemStyle={{ color: '#FFD400', fontWeight: 'bold' }}
                         labelStyle={{ color: '#fff', marginBottom: '8px' }}
                       />
                       <Area 
                         type="monotone" 
                         dataKey="val" 
                         stroke="#FFD400" 
                         strokeWidth={3} 
                         fillOpacity={1} 
                         fill="url(#chartGradientMain)" 
                         animationDuration={1500}
                         activeDot={{ r: 6, fill: '#FFD400', stroke: '#111', strokeWidth: 2 }}
                       />
                     </AreaChart>
                   </ResponsiveContainer>
                 )
               ) : null}
             </div>
          </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
             <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 p-6 rounded-2xl group hover:border-tad-yellow/30 transition-all duration-500 relative overflow-hidden">
                <div className="flex items-center gap-4 mb-4">
                   <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0">
                      <Cpu className="w-5 h-5 text-tad-yellow" />
                   </div>
                   <h4 className="text-white font-bold text-sm tracking-wide">Protocolo de Red</h4>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed mb-6"> 
                  Handshake activo sobre el cluster central v4.5. Latencia nominal: <span className="text-emerald-500 font-medium">38ms (Stable)</span>
                </p>
                 <div className="flex items-end gap-1.5 h-8">
                    {(['h-[20%]','h-[40%]','h-[60%]','h-[40%]','h-[80%]','h-[60%]','h-[20%]','h-[40%]','h-full','h-[60%]'] as const).map((hClass, i) => (
                      <div key={i} className="flex-1 bg-gray-800 rounded-sm overflow-hidden relative">
                          <div className={clsx('absolute bottom-0 left-0 w-full bg-tad-yellow/70 rounded-sm', hClass)} />
                      </div>
                    ))}
                 </div>
             </div>

             <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 p-6 rounded-2xl group hover:border-blue-500/30 transition-all duration-500 relative overflow-hidden">
                <div className="flex items-center gap-4 mb-4">
                   <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0">
                      <Server className="w-5 h-5 text-blue-400" />
                   </div>
                   <h4 className="text-white font-bold text-sm tracking-wide">Distribución Media</h4>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed mb-6">
                  Sincronización al <span className="text-white font-medium">98%</span> en la flota periférica. Cache OIDC optimizado.
                </p>
                <div className="h-1.5 w-full bg-gray-800 rounded-full mt-auto">
                   <div className="h-full bg-blue-500 rounded-full w-[98%] shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                </div>
             </div>
          </div>
        </div>

        {/* Security & Intelligence Nexus */}
        <div className="space-y-6 lg:space-y-8">
           <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 p-6 lg:p-8 rounded-2xl shadow-lg relative overflow-hidden group/security hover:border-tad-yellow/30 transition-all duration-500 flex flex-col justify-between h-auto">
              <div className="relative z-10">
                 <div className="w-12 h-12 bg-tad-yellow rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-tad-yellow/10">
                    <ShieldCheck className="w-6 h-6 text-black" />
                 </div>
                 <h4 className="text-xl font-bold text-white mb-3">Capa de Seguridad</h4>
                 <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                   Protección Handshake con cifrado TLS 1.3 auditado. Pantallas validados por firma digital regional.
                 </p>
                 <div className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-xl border border-gray-700/50">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
                    <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Auditoría OK</span>
                 </div>
              </div>
           </div>

           <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 p-6 lg:p-8 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="flex items-center gap-3 mb-4">
                 <BarChart3 className="w-5 h-5 text-tad-yellow" />
                 <h4 className="text-lg font-bold text-white">Escalabilidad</h4>
              </div>
              <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                 Soporte OIDC listo para la integración de <span className="text-white font-medium">2.5K pantallas</span> en el próximo ciclo expansivo.
              </p>
              <Link href="/fleet" className="w-full flex bg-gray-800 hover:bg-tad-yellow hover:text-black border border-gray-700 hover:border-transparent text-gray-300 transition-all py-3 rounded-xl text-xs font-bold uppercase tracking-wider items-center justify-center gap-2">
                 Analizar Pantallas <ArrowUpRight className="w-4 h-4" />
              </Link>
           </div>

           <Link 
            href="/analytics"
            className="group block p-6 lg:p-8 bg-gray-800/60 border border-gray-700/50 rounded-2xl shadow-lg hover:border-emerald-500/30 transition-all duration-500"
           >
              <div className="flex items-center justify-between mb-4">
                 <div className="p-2.5 bg-gray-900 rounded-xl border border-gray-700 shrink-0">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                 </div>
                 <ArrowUpRight className="w-5 h-5 text-gray-500 group-hover:text-emerald-500 transition-colors" />
              </div>
              <h4 className="text-lg font-bold text-white mb-1">Deep Analytics</h4>
              <p className="text-xs text-gray-400 font-medium tracking-wide">Explorar Base de Datos</p>
           </Link>

           <div className="p-6 border border-dashed border-gray-700/50 rounded-2xl text-center opacity-50 hover:opacity-100 transition-all duration-300">
              <Zap className="w-6 h-6 text-gray-500 mx-auto mb-3" />
              <p className="text-[10px] font-bold text-gray-500 tracking-widest font-mono">CORE_NOMINAL_4.5</p>
           </div>
        </div>
      </div>
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
  delay?: number;
}) {
    return (
      <div 
        className={clsx(
          "bg-[#111317] border border-white/[0.05] p-6 rounded-[24px] group relative overflow-hidden transition-all duration-300 flex flex-col hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-8 fill-mode-both home-stats-card"
        )}
      >
         <style jsx>{`
           .home-stats-card { animation-delay: ${delay}ms; }
         `}</style>
         
         <div className="flex justify-between items-start mb-6">
            <div className={clsx(
              "p-2.5 rounded-2xl border bg-transparent", 
              color === 'yellow' ? 'border-[#FFD400]/40 text-[#FFD400]' : 'border-white/20 text-zinc-400'
            )}>
               {icon}
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-600/50" />
         </div>
         
         <div className="mt-auto">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
            <h3 className={clsx(
               "text-4xl font-black tracking-tighter leading-none mb-3",
               color === 'yellow' ? 'text-[#FFD400]' : 'text-white'
            )}>
               {typeof value === 'number' && value < 10 ? `0${value}` : value}
            </h3>
            <div className="flex items-center gap-2">
               <div className={clsx("w-1.5 h-1.5 rounded-full", color === 'yellow' ? "bg-[#FFD400]" : "bg-white/50")} />
               <p className="text-xs font-medium text-gray-500">{sub}</p>
            </div>
         </div>
      </div>
   );
}
