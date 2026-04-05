import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { 
  Megaphone, Activity, Clock, LogOut, LayoutDashboard, 
  TrendingUp, BarChart3, Fingerprint, Crosshair, Map, Zap, Layers, FileVideo, ArrowUpRight
} from 'lucide-react';
import { getAdvertiserPortalData, logout } from '@/services/api';
import clsx from 'clsx';
import Link from 'next/link';
import Head from 'next/head';

export default function AdvertiserDashboard() {
  const { session } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function load() {
      let entityId = session?.user?.app_metadata?.entityId;
      if (!entityId) {
        try {
          const storedUser = localStorage.getItem('tad_advertiser_user');
          if (storedUser) {
            const parsed = JSON.parse(storedUser);
            entityId = parsed.entityId || parsed.id;
          }
        } catch {}
      }
      if (!entityId) {
        setLoading(false);
        return;
      }
      try {
        const res = await getAdvertiserPortalData(entityId);
        setData(res);
      } catch (e) {
        console.error('Failed to load portal data:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [session]);

  const activeCampaigns = (data?.campaigns || []).filter((c: any) => c.status === 'ACTIVE').length || 0;
  const totalCampaigns = (data?.campaigns || []).length || 0;
  const impressions = data?.summary?.impressions || 0;
  const mediaCount = (data?.campaigns || []).reduce((acc: number, c: any) => acc + (c.mediaAssets?.length || 0), 0) || 0;

  return (
    <div className="min-h-screen pb-12 animate-in fade-in duration-1000 relative selection:bg-tad-yellow selection:text-black font-sans mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
      <Head>
        <title>TAD | Advertiser Dashboard</title>
      </Head>

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
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Node ID: ADV_HUB_v5.4</p>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-gradient-gold uppercase">
            Advertiser BI
          </h1>
          <p className="text-gray-400 text-sm font-medium">Marketing Intelligence & Fleet Distribution</p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Portal Status</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_#10b981]" />
              <span className="text-sm font-bold text-white">Live Data Link</span>
            </div>
          </div>
          <button 
             onClick={logout}
             className="w-12 h-12 flex items-center justify-center bg-zinc-900 border border-white/10 rounded-[1.2rem] text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all shadow-lg"
             title="Cerrar Sessión"
           >
             <LogOut className="w-5 h-5" />
           </button>
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
            { icon: <Megaphone />, label: "Campañas Activas", value: activeCampaigns, sub: `${totalCampaigns} Totales Creadas`, color: "yellow" },
            { icon: <TrendingUp />, label: "Impresiones Totales", value: impressions.toLocaleString(), sub: "Impactos Confirmados", color: "white" },
            { icon: <Activity />, label: "Delivery Rate", value: "98.5", sub: "% Efectividad de Emisión", color: "yellow" },
            { icon: <Clock />, label: "Ads Desplegados", value: mediaCount, sub: "Piezas Multimedia Activas", color: "white" }
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
                    <BarChart3 className="w-6 h-6 text-tad-yellow" />
                    Rendimiento de Impresiones
                  </h3>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Impactos verificados en los últimos 7 días</p>
                </div>
                 <div className="flex gap-2">
                   {['7D', '14D', '30D'].map((t) => (
                      <button key={t} className={clsx(
                        "px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all", 
                        t === '7D' ? "bg-tad-yellow text-black shadow-[0_0_20px_rgba(255,212,0,0.3)]" : "bg-white/5 text-gray-400 hover:text-white"
                      )}>{t}</button>
                   ))}
                </div>
             </div>

             <div className="h-[350px] relative w-full overflow-hidden">
               {mounted && (
                 loading ? (
                   <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-4">
                     <Activity className="w-12 h-12 opacity-20 animate-pulse" />
                     <p className="text-[10px] font-black tracking-[0.3em] uppercase">Recopilando telemetría...</p>
                   </div>
                 ) : (
                   <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={data?.timeSeries || []} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                       <defs>
                          <linearGradient id="advChartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FFD400" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#FFD400" stopOpacity={0}/>
                          </linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                       <XAxis dataKey="date" stroke="#52525b" fontSize={10} axisLine={false} tickLine={false} dy={10} tick={{ fill: '#71717a', fontWeight: 700 }} />
                       <YAxis stroke="#52525b" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontWeight: 700 }} />
                       <Tooltip 
                         contentStyle={{ backgroundColor: 'rgba(9,9,11,0.95)', border: '1px solid rgba(255,212,0,0.2)', borderRadius: '1.5rem', fontSize: '12px', backdropFilter: 'blur(20px)' }}
                         itemStyle={{ color: '#FFD400', fontWeight: '900' }}
                         labelStyle={{ color: '#fff', marginBottom: '8px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                       />
                       <Area 
                         type="monotone" 
                         dataKey="impressions" 
                         stroke="#FFD400" 
                         strokeWidth={4} 
                         fillOpacity={1} 
                         fill="url(#advChartGradient)" 
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
              icon={<Crosshair className="text-tad-yellow" />}
              title="Alcance Geográfico"
              label="ALGORITMO_GEO"
              description="Distribución optimizada de Anuncios basándose en zonas de alto tráfico de Santo Domingo y Santiago."
              progress={100}
              color="yellow"
              uid="geo"
            />
            <StitchedInfoCard 
              icon={<Map className="text-blue-400" />}
              title="Métricas Anti-Fraude"
              label="VALIDACIÓN_GPS"
              description="Impresiones verificadas y validadas contra telemetría GPS del vehículo en tiempo real."
              progress={99.9}
              color="blue"
              uid="fraud"
            />
          </div>
        </div>

        {/* Intelligence Sidebar */}
        <aside className="space-y-6 lg:space-y-8">
          <div className="stitched-card p-8 group/security">
             <div className="flex items-center justify-between mb-8">
               <div className="w-14 h-14 bg-tad-yellow rounded-[1.2rem] flex items-center justify-center shadow-[0_10px_30px_rgba(255,212,0,0.2)]">
                  <FileVideo className="w-7 h-7 text-black" />
               </div>
               <div className="bg-black/40 px-3 py-1 rounded-full border border-white/5 flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[8px] font-black uppercase tracking-widest">LIVE SYNC</span>
               </div>
             </div>
             
             <h4 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter">Campañas en Curso</h4>
             
             <div className="space-y-4 mb-8">
               {loading ? (
                 Array.from({length: 3}).map((_, i) => (
                   <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />
                 ))
               ) : (
                 (data?.campaigns || []).slice(0, 5).map((c: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/[0.02] hover:border-white/10 transition-colors group">
                       <div className="flex items-center gap-4 truncate">
                          <div className={clsx(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                            c.status === 'ACTIVE' ? "bg-emerald-500/10 text-emerald-500" : "bg-orange-500/10 text-orange-500"
                          )}>
                            <FileVideo className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                             <p className="text-[11px] font-black uppercase tracking-tight truncate group-hover:text-tad-yellow transition-colors">{c.name}</p>
                             <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mt-0.5">{(c.metrics_summary?.impressions || 0).toLocaleString()} Impresiones</p>
                          </div>
                       </div>
                    </div>
                  ))
               )}
               {(!data?.campaigns || data?.campaigns?.length === 0) && !loading && (
                 <p className="text-xs text-gray-500 font-medium">Aún no hay campañas registradas.</p>
               )}
             </div>

             <div className="flex items-center justify-center pt-6 border-t border-white/5">
                <Link href="/advertiser/campaigns" className="text-[10px] font-black text-tad-yellow uppercase tracking-widest hover:text-white transition-colors flex items-center gap-2">
                   Ver Gestor Completo <ArrowUpRight className="w-4 h-4" />
                </Link>
             </div>
          </div>

          <div className="p-8 border-2 border-dashed border-white/5 rounded-[2.5rem] flex flex-col items-center text-center opacity-40 hover:opacity-100 transition-opacity duration-500">
             <Zap className="w-8 h-8 text-gray-600 mb-4" />
             <p className="text-[10px] font-black text-gray-600 tracking-[0.5em] font-mono">TAD_ADV_NODE_5.4</p>
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
          "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-500 relative z-10 box-border",
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
          <div className={clsx("w-1.5 h-1.5 rounded-full shrink-0", color === 'yellow' ? "bg-tad-yellow/60" : "bg-white/30")} />
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
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover/info:border-tad-yellow/30 transition-colors box-border">
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
          <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Score de Precisión</span>
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
