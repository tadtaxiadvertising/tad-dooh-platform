import { useEffect, useState, useCallback } from 'react';
import { getDevices, getCampaigns, getMedia, getHourlyPlays, getAnalyticsSummary } from '../services/api';
import { CarFront, Megaphone, CloudUpload, TrendingUp, ShieldCheck, Zap, Cpu, Server, Radio, AlertTriangle, ArrowUpRight, BarChart3, Fingerprint, Layers } from 'lucide-react';
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
      const results = await Promise.allSettled([
        getDevices(), 
        getCampaigns(), 
        getMedia(), 
        getHourlyPlays(),
        getAnalyticsSummary()
      ]);
      
      const devices = results[0].status === 'fulfilled' ? results[0].value : [];
      const campaigns = results[1].status === 'fulfilled' ? results[1].value : [];
      const media = results[2].status === 'fulfilled' ? results[2].value : [];
      const hourly = results[3].status === 'fulfilled' ? results[3].value : [];
      const analytics = results[4].status === 'fulfilled' ? results[4].value : null;

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
      
      if (results[0].status === 'rejected' && results[1].status === 'rejected') {
        setError("Falla crítica de sincronización con el núcleo central.");
      }
    } catch (err) {
      console.error("Dashboard Global Error:", err);
      setError("Falla total de red. Intentando reconectar...");
    } finally {
      setLoading(false);
    }
  }, []);

  useTabSync(['DEVICES', 'CAMPAIGNS', 'MEDIA', 'TAD_DRIVERS', 'FINANCE'], loadData);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, [loadData]);

  return (
    <div className="min-h-screen pb-12 animate-in fade-in duration-1000 relative selection:bg-tad-yellow selection:text-black font-sans mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
      {/* 🧵 Stitched Layer: Background Glows */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-5%] w-[60%] h-[60%] bg-tad-yellow/[0.04] blur-[180px] rounded-full animate-pulse-soft" />
         <div className="absolute bottom-[0%] right-[-5%] w-[50%] h-[50%] bg-white/[0.015] blur-[140px] rounded-full" />
      </div>

      {/* Header Section */}
      <header className="pt-8 mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 opacity-60">
            <Fingerprint className="w-4 h-4 text-tad-yellow" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Node ID: DOOH_NEXUS_v5.4</p>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-gradient-gold">
            Command Center
          </h1>
          <p className="text-gray-400 text-sm font-medium">Gestión inteligente de la flota publicitaria TAD Dominicana</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Estado del Sistema</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_#10b981]" />
              <span className="text-sm font-bold text-white">Sincronizado</span>
            </div>
          </div>
        </div>
      </header>

      {/* Primary Metrics: Stitched Cards Cluster */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {loading ? (
             Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[200px] bg-white/5 rounded-[2.5rem] animate-skeleton border border-white/5" />
             ))
        ) : (
          [
            { icon: <CarFront />, label: "Pantallas Activas", value: stats.devices, sub: `${stats.online} Sesiones Online`, trend: "+12%", color: "yellow" },
            { icon: <Megaphone />, label: "Flujo de Campañas", value: stats.campaigns, sub: `${stats.activeCampaigns} Activas`, trend: "Live", color: "white" },
            { icon: <CloudUpload />, label: "Media Assets", value: stats.media, sub: "Optimizados (S3)", trend: "99.9%", color: "yellow" },
            { icon: <Zap />, label: "Escaneos 24H", value: stats.totalScans.toLocaleString(), sub: `${stats.ctr.toFixed(2)}% Conversion`, trend: "Active", color: "white" }
          ].map((s, i) => (
            <StitchedStatsCard key={i} {...s} delay={i * 100} />
          ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Main Analytics Terminal */}
        <div className="lg:col-span-2 space-y-8">
          <div className="stitched-card p-6 lg:p-8">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative z-10">
                <div>
                   <h3 className="text-xl font-black text-white flex items-center gap-3 mb-1">
                    <TrendingUp className="w-6 h-6 text-tad-yellow" />
                    Impactos por Hora (Flota)
                  </h3>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Frecuencia de reproducción verificada</p>
                </div>
                 <div className="flex gap-2">
                   {['Live', '24H', '7D'].map((t) => (
                      <button key={t} className={clsx(
                        "px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all", 
                        t === '24H' ? "bg-tad-yellow text-black shadow-[0_0_20px_rgba(255,212,0,0.3)]" : "bg-white/5 text-gray-400 hover:text-white"
                      )}>{t}</button>
                   ))}
                </div>
             </div>

             <div className="h-[350px] relative w-full overflow-hidden">
               {mounted && (
                 (!chartData || chartData.length === 0 || loading) ? (
                   <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-4">
                     <Radio className="w-12 h-12 opacity-20 animate-pulse" />
                     <p className="text-[10px] font-black tracking-[0.3em] uppercase">Escaneando transpondedores...</p>
                   </div>
                 ) : (
                   <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                       <defs>
                          <linearGradient id="chartGradientMain" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FFD400" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#FFD400" stopOpacity={0}/>
                          </linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                       <XAxis dataKey="name" stroke="#52525b" fontSize={10} axisLine={false} tickLine={false} dy={10} tick={{ fill: '#71717a', fontWeight: 700 }} />
                       <YAxis stroke="#52525b" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontWeight: 700 }} />
                       <Tooltip 
                         contentStyle={{ backgroundColor: 'rgba(9,9,11,0.95)', border: '1px solid rgba(255,212,0,0.2)', borderRadius: '1.5rem', fontSize: '12px', backdropFilter: 'blur(20px)' }}
                         itemStyle={{ color: '#FFD400', fontWeight: '900' }}
                         labelStyle={{ color: '#fff', marginBottom: '8px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                       />
                       <Area 
                         type="monotone" 
                         dataKey="val" 
                         stroke="#FFD400" 
                         strokeWidth={4} 
                         fillOpacity={1} 
                         fill="url(#chartGradientMain)" 
                         animationDuration={2000}
                         activeDot={{ r: 8, fill: '#FFD400', stroke: '#000', strokeWidth: 4 }}
                       />
                     </AreaChart>
                   </ResponsiveContainer>
                 )
               )}
             </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
            <StitchedInfoCard 
              icon={<Cpu className="text-tad-yellow" />}
              title="Red Descentralizada"
              label="PROTOCOL_V4"
              description="Nodos distribuidos operando con sincronización atómica. Latencia de red: 24ms."
              progress={88}
              color="yellow"
              uid="net"
            />
            <StitchedInfoCard 
              icon={<Layers className="text-blue-400" />}
              title="Capa de Contenido"
              label="S3_INTEGRITY"
              description="Verificación hash de activos multimedia completada. 0 fallos detectados."
              progress={99}
              color="blue"
              uid="s3"
            />
          </div>
        </div>

        {/* Intelligence Sidebar */}
        <aside className="space-y-6 lg:space-y-8">
          <div className="stitched-card p-8 group/security">
             <div className="w-14 h-14 bg-tad-yellow rounded-[1.2rem] flex items-center justify-center mb-8 shadow-[0_10px_30px_rgba(255,212,0,0.2)]">
                <ShieldCheck className="w-7 h-7 text-black" />
             </div>
             <h4 className="text-2xl font-black text-white mb-4">Capa de Seguridad</h4>
             <p className="text-sm text-gray-400 mb-8 leading-relaxed font-medium">
               Protección biométrica y cifrado TLS 1.3 activo. Auditoría de nodos automática cada 300 segundos.
             </p>
             <div className="flex items-center gap-3 p-4 bg-black/40 rounded-2xl border border-white/5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_#10b981] animate-pulse" />
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.25em]">SISTEMA BLINDADO</span>
             </div>
          </div>

          <Link href="/analytics" className="stitched-card p-8 group block hover:translate-x-2 transition-transform duration-500">
             <div className="flex items-center justify-between mb-6">
                <div className="p-3 bg-white/5 rounded-2xl border border-white/10 group-hover:border-emerald-500/50 transition-colors">
                   <BarChart3 className="w-6 h-6 text-emerald-500" />
                </div>
                <ArrowUpRight className="w-6 h-6 text-gray-500 group-hover:text-emerald-500 transition-all" />
             </div>
             <h4 className="text-xl font-black text-white mb-2 uppercase tracking-tighter">Motor de Inteligencia</h4>
             <p className="text-xs text-gray-400 font-bold tracking-widest uppercase">Deep Analytics Access</p>
          </Link>

          <div className="p-8 border-2 border-dashed border-white/5 rounded-[2.5rem] flex flex-col items-center text-center opacity-40 hover:opacity-100 transition-opacity duration-500">
             <Zap className="w-8 h-8 text-gray-600 mb-4" />
             <p className="text-[10px] font-black text-gray-600 tracking-[0.5em] font-mono">TAD_CORE_NOMINAL_5.4</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function StitchedStatsCard({ icon, label, value, sub, color, delay }: any) {
  return (
    <div className={clsx(
      "stitched-card p-8 flex flex-col justify-between min-h-[220px] group/card animate-in fade-in slide-in-from-bottom-12 fill-mode-both",
      `delay-${delay}`
    )}>
      <style jsx>{`
        .stitched-card { animation-delay: ${delay}ms; }
      `}</style>
      <div className="flex justify-between items-start">
        <div className={clsx(
          "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-500",
          color === 'yellow' ? 'bg-tad-yellow border-tad-yellow text-black' : 'bg-white/5 border-white/10 text-white'
        )}>
          {icon}
        </div>
        <div className="w-2 h-2 rounded-full bg-white/10 group-hover/card:bg-tad-yellow/50 transition-colors" />
      </div>
      
      <div>
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-3">{label}</p>
        <h3 className={clsx(
          "text-5xl font-black tracking-tighter mb-4 leading-none",
          color === 'yellow' ? 'text-tad-yellow' : 'text-white'
        )}>
          {typeof value === 'number' && value < 10 ? `0${value}` : value}
        </h3>
        <div className="flex items-center gap-2">
          <div className={clsx("w-1.5 h-1.5 rounded-full", color === 'yellow' ? "bg-tad-yellow/60" : "bg-white/30")} />
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{sub}</p>
        </div>
      </div>
    </div>
  );
}

function StitchedInfoCard({ icon, title, label, description, progress, color, uid }: any) {
  return (
    <div className="stitched-card p-8 group/info">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover/info:border-tad-yellow/30 transition-colors">
          {icon}
        </div>
        <div>
          <h4 className="text-white font-black text-lg tracking-tight leading-none mb-1">{title}</h4>
          <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em]">{label}</span>
        </div>
      </div>
      <p className="text-sm text-gray-400 leading-relaxed font-medium mb-8">
        {description}
      </p>
      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Estado Local</span>
          <span className="text-xs font-black text-white">{progress}%</span>
        </div>
        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-[2px]">
          <div className={clsx(
            `progress-bar-${uid}`,
            "h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(255,212,0,0.1)]",
            color === 'yellow' ? 'bg-tad-yellow' : 'bg-blue-500'
          )} />
          <style jsx>{`
            .progress-bar-${uid} { width: ${progress}%; }
          `}</style>
        </div>
      </div>
    </div>
  );
}
