import { useEffect, useState, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { 
  BarChart3, 
  Play, 
  Upload, 
  Activity, 
  TrendingUp, 
  Users, 
  Calendar,
  ChevronRight,
  Sparkles,
  Layers,
  Zap,
  CheckCircle2,
  Clock,
  ExternalLink,
  Plus,
  LogOut
} from 'lucide-react';
import { getAdvertiserPortalData } from '../../../services/api';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdvertiserPortal() {
  const router = useRouter();
  const { id } = router.query;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'analytics' | 'content'>('analytics');

  const handleLogout = () => {
    localStorage.removeItem('tad_advertiser_token');
    localStorage.removeItem('tad_advertiser_id');
    router.push('/p/advertiser/login');
  };

  useEffect(() => {
    // SECURITY: Ensure only authorized admins or the specific advertiser can view this portal
    if (typeof window !== 'undefined') {
      const adminToken = localStorage.getItem('tad_admin_token');
      const advToken = localStorage.getItem('tad_advertiser_token');
      const advId = localStorage.getItem('tad_advertiser_id');

      if (!adminToken) {
        if (!advToken || advId !== id) {
          router.replace('/p/advertiser/login');
          return;
        }
      }

      if (id) {
        getAdvertiserPortalData(id as string)
          .then(setData)
          .catch(() => {
            // Failed to load data, maybe token expired or ID invalid
            if (!adminToken) {
              localStorage.removeItem('tad_advertiser_token');
              localStorage.removeItem('tad_advertiser_id');
              router.replace('/p/advertiser/login');
            }
          })
          .finally(() => setLoading(false));
      }
    }
  }, [id, router]);

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center">
      <div className="relative">
        <div className="w-16 h-16 border-r-2 border-tad-yellow rounded-full animate-spin" />
        <Activity className="absolute inset-0 m-auto w-6 h-6 text-tad-yellow/40 animate-pulse" />
      </div>
      <p className="mt-8 text-[10px] font-black uppercase tracking-[0.5em] text-zinc-600 animate-pulse">Sincronizando Nexus...</p>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 text-center">
      <div className="bg-zinc-900/50 border border-white/5 p-12 rounded-[2.5rem] space-y-4">
        <h1 className="text-2xl font-black uppercase italic">Enlace No Válido</h1>
        <p className="text-zinc-500 text-sm">El acceso a este portal ha caducado o es incorrecto.</p>
        <button onClick={() => { localStorage.removeItem('tad_advertiser_token'); router.push('/p/advertiser/login'); }} className="px-8 py-3 bg-tad-yellow text-black font-black uppercase text-[10px] tracking-widest rounded-2xl">Volver al Inicio</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-tad-yellow selection:text-black pb-20 overflow-x-hidden">
      <Head>
        <title>{data.brand.name} | TAD Advertiser Portal</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      {/* Hero Header */}
      <header className="relative pt-16 pb-12 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[400px] bg-tad-yellow/10 blur-[150px] rounded-full -z-10" />
        
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                <div className="w-1.5 h-1.5 rounded-full bg-tad-yellow animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-tad-yellow">Advertiser Nexus v4.5</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase italic leading-[0.85]">
                {data.brand.name.split(' ')[0]} <br />
                <span className="text-tad-yellow">{data.brand.name.split(' ').slice(1).join(' ') || 'Partner'}</span>
              </h1>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.4em]">{data.brand.category || 'General'} &middot; Dominando la Ciudad</p>
            </div>

            <div className="flex gap-2">
               <button 
                 onClick={() => setActiveTab('analytics')}
                 className={clsx(
                   "flex-1 md:flex-none px-8 py-4 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all",
                   activeTab === 'analytics' ? "bg-white text-black shadow-[0_20px_40px_rgba(255,255,255,0.1)]" : "bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10"
                 )}
               >
                 Métricas
               </button>
               <button 
                 onClick={() => setActiveTab('content')}
                 className={clsx(
                   "flex-1 md:flex-none px-8 py-4 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all",
                   activeTab === 'content' ? "bg-tad-yellow text-black shadow-[0_20px_40px_rgba(250,212,0,0.15)]" : "bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10"
                 )}
               >
                 Contenido
               </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6">
        <AnimatePresence mode="wait">
          {activeTab === 'analytics' ? (
            <motion.div 
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Stats Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard 
                  label="Alcance Impactado" 
                  value={data.stats.totalImpressions.toLocaleString()} 
                  sub="Impresiones Totales" 
                  icon={<Users className="w-5 h-5" />} 
                  color="text-tad-yellow"
                />
                <StatCard 
                  label="Fidelidad Visual" 
                  value={`${((data.stats.totalCompletions / (data.stats.totalImpressions || 1)) * 100).toFixed(1)}%`} 
                  sub="Completion Rate" 
                  icon={<Play className="w-5 h-5" />} 
                  color="text-emerald-400"
                />
                <StatCard 
                  label="Conexión QR" 
                  value={data.stats.totalScans || 0} 
                  sub="Escaneos Reales" 
                  icon={<Zap className="w-5 h-5" />} 
                  color="text-rose-400"
                />
                <StatCard 
                  label="Flota Asignada" 
                  value={data.stats.activeCampaigns} 
                  sub="Campañas Activas" 
                  icon={<Layers className="w-5 h-5" />} 
                  color="text-white"
                />
              </div>

              {/* Weekly Performance Preview */}
              <div className="bg-zinc-900/40 border border-white/5 rounded-[2.5rem] p-10 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-8">
                    <TrendingUp className="w-12 h-12 text-zinc-800 transition-transform group-hover:scale-125 duration-1000" />
                 </div>
                 <h3 className="text-[10px] font-black text-tad-yellow uppercase tracking-[0.4em] mb-4">Performance Insights</h3>
                 <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-8 max-w-sm">Tu marca está <span className="text-tad-yellow underline decoration-white/20 underline-offset-8">creciendo</span> esta semana.</h2>
                 
                  <div className="flex items-end gap-1.5 h-32 md:h-48">
                    {[40, 65, 45, 85, 95, 75, 80].map((h, i) => (
                      <div key={i} className="flex-1 space-y-2">
                        <div 
                           className={clsx(
                             "w-full bg-white/5 border-t border-tad-yellow/30 relative group/bar transition-all duration-1000",
                             h === 40 && "h-[40%]",
                             h === 65 && "h-[65%]",
                             h === 45 && "h-[45%]",
                             h === 85 && "h-[85%]",
                             h === 95 && "h-[95%]",
                             h === 75 && "h-[75%]",
                             h === 80 && "h-[80%]"
                           )}
                        >
                           <div className="absolute inset-x-0 bottom-0 bg-tad-yellow/20 h-0 transition-all group-hover/bar:h-full" />
                        </div>
                        <p className="text-[8px] font-black text-zinc-600 text-center uppercase tracking-widest">{['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'][i]}</p>
                      </div>
                    ))}
                 </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                   <h3 className="text-[10px] font-black text-tad-yellow uppercase tracking-[0.4em] mb-1">Media Management</h3>
                   <h2 className="text-2xl font-black uppercase italic">Playlist <span className="text-zinc-500">v4</span></h2>
                </div>
                <button className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-tad-yellow hover:text-black transition-all">
                  <Upload className="w-4 h-4" />
                  Actualizar Contenido
                </button>
              </div>

              <div className="space-y-4">
                {data.campaigns[0]?.media.map((item: any) => (
                  <div key={item.id} className="bg-zinc-900/60 border border-white/5 rounded-3xl p-6 flex items-center justify-between group hover:border-tad-yellow/20 transition-all">
                    <div className="flex items-center gap-6">
                       <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center border border-white/10 overflow-hidden relative">
                         {item.type?.includes('video') ? <Play className="w-6 h-6 text-tad-yellow" /> : <Layers className="w-6 h-6 text-tad-yellow" />}
                         <div className="absolute inset-0 bg-tad-yellow/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                       </div>
                       <div className="space-y-1">
                          <h4 className="text-sm font-black uppercase tracking-tight">{item.name || 'Anuncio TAD'}</h4>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{item.type || 'MP4 1080p'} &middot; 15s</p>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                       <div className="hidden md:flex flex-col items-end">
                          <div className="flex items-center gap-2 text-emerald-400">
                             <CheckCircle2 className="w-3.5 h-3.5" />
                             <span className="text-[9px] font-black uppercase tracking-widest">Sincronizado</span>
                          </div>
                          <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest mt-1">Fleet Sync OK</p>
                       </div>
                       <button title="Ver Detalles del Asset" aria-label="Ver Detalles del Asset" className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-zinc-600 hover:text-white hover:bg-white/10 transition-all">
                          <ChevronRight className="w-5 h-5" />
                       </button>
                    </div>
                  </div>
                ))}

                {/* Placeholder empty campaign */}
                {data.campaigns.length === 0 && (
                   <div className="py-20 text-center space-y-6 border-2 border-dashed border-white/5 rounded-[2.5rem]">
                      <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                         <Plus className="w-8 h-8 text-zinc-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black uppercase italic">Sin Campañas Activas</h3>
                        <p className="text-zinc-500 text-sm max-w-xs mx-auto">Tus anuncios no se están transmitiendo. Contacta a soporte para activar tu plan.</p>
                      </div>
                   </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Quick Actions Float */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-black/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-2 flex gap-1 shadow-[0_30px_60px_rgba(0,0,0,0.8)]">
           <FloatButton icon={<BarChart3 className="w-4 h-4" />} active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} />
           <FloatButton icon={<Upload className="w-4 h-4" />} active={activeTab === 'content'} onClick={() => setActiveTab('content')} />
           <div className="w-px h-6 bg-white/10 mx-2 self-center" />
           <FloatButton icon={<ExternalLink className="w-4 h-4" />} onClick={() => window.open('https://tad.do', '_blank')} />
           <div className="w-px h-6 bg-white/10 mx-2 self-center" />
           <FloatButton icon={<LogOut className="w-4 h-4" />} onClick={handleLogout} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon, color }: any) {
  return (
    <div className="bg-zinc-900/40 border border-white/5 rounded-[2rem] p-6 space-y-4 hover:bg-zinc-950/60 transition-all group overflow-hidden relative">
      <div className={clsx("w-10 h-10 rounded-xl bg-black border border-white/5 flex items-center justify-center group-hover:scale-110 transition-transform", color)}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">{label}</p>
        <p className="text-2xl font-black tracking-tight">{value}</p>
        <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mt-1">{sub}</p>
      </div>
      <div className="absolute -bottom-1 -right-1 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
        {icon}
      </div>
    </div>
  );
}

function FloatButton({ icon, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={clsx(
        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
        active ? "bg-tad-yellow text-black" : "text-zinc-500 hover:text-white"
      )}
    >
      {icon}
    </button>
  );
}
