import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area 
} from 'recharts';
import { 
  LayoutDashboard, Megaphone, FileVideo, BarChart3, 
  TrendingUp, Users, Activity, Clock, RefreshCw, LogOut
} from 'lucide-react';
import { motion } from 'framer-motion';
import { getAdvertiserPortalData, logout } from '@/services/api';
import clsx from 'clsx';

export default function AdvertiserDashboard() {
  const { session } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Intentar obtener entityId del session o del localStorage
      let entityId = session?.user?.app_metadata?.entityId;
      
      if (!entityId) {
        // Fallback: leer de localStorage directamente
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
        setData(res); // getAdvertiserPortalData ya hace .then(res => res.data)
      } catch (e) {
        console.error('Failed to load portal data:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [session]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
         <RefreshCw className="w-8 h-8 text-[#fad400] animate-spin" />
      </div>
    );
  }

  const stats = [
    { label: 'Campañas Activas', value: data?.campaigns?.filter((c: any) => c.status === 'ACTIVE').length || 0, icon: Megaphone, color: '#fad400' },
    { label: 'Impresiones Totales', value: (data?.summary?.impressions || 0).toLocaleString(), icon: TrendingUp, color: '#10b981' },
    { label: 'Delivery Rate', value: '98.5%', icon: Activity, color: '#3b82f6' },
    { label: 'Anuncios Listos', value: data?.campaigns?.reduce((acc: number, c: any) => acc + (c.mediaAssets?.length || 0), 0) || 0, icon: Clock, color: '#a855f7' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-1"
        >
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-[#fad400] flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-black" />
             </div>
             <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">Advertiser Central</p>
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">
            Dashboard <span className="text-[#fad400]">BI</span>
          </h1>
        </motion.div>

        <div className="flex gap-4 items-center">
           <div className="px-6 py-3 bg-zinc-900/50 border border-white/5 rounded-2xl flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Live Status: Active</span>
           </div>
           <button 
             onClick={logout}
             className="p-3 bg-zinc-900 border border-white/10 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors"
           >
             <LogOut className="w-5 h-5" />
           </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group relative bg-zinc-900/30 backdrop-blur-xl border border-white/5 p-8 rounded-[2rem] hover:bg-zinc-800/40 transition-all overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transform transition-transform group-hover:scale-110">
               <kpi.icon className="w-12 h-12" style={{ color: kpi.color }} />
            </div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-2">{kpi.label}</p>
            <h3 className="text-3xl font-black tracking-tight">{kpi.value}</h3>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Main Consumption Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-zinc-900/30 backdrop-blur-xl border border-white/5 p-8 rounded-[2.5rem]"
        >
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight">Rendimiento Semanal</h3>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Impresiones vs Completions</p>
            </div>
            <BarChart3 className="w-5 h-5 text-zinc-700" />
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.timeSeries || []}>
                <defs>
                  <linearGradient id="colorImp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fad400" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#fad400" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f1f23" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 10}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 10}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '10px', textTransform: 'uppercase' }}
                />
                <Area type="monotone" dataKey="impressions" stroke="#fad400" fillOpacity={1} fill="url(#colorImp)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Campaign List Preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-zinc-900/30 backdrop-blur-xl border border-white/5 p-8 rounded-[2.5rem]"
        >
          <div className="flex justify-between items-center mb-10">
            <div>
               <h3 className="text-xl font-black uppercase tracking-tight">Campañas Recientes</h3>
               <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Monitorea tus últimos lanzamientos</p>
            </div>
            <Megaphone className="w-5 h-5 text-zinc-700" />
          </div>

          <div className="space-y-4">
            {(data?.campaigns || []).slice(0, 5).map((c: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-5 bg-black/40 rounded-2xl border border-white/[0.02] hover:border-white/10 transition-colors group">
                 <div className="flex items-center gap-4">
                    <div className={clsx(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      c.status === 'ACTIVE' ? "bg-emerald-500/10 text-emerald-500" : "bg-orange-500/10 text-orange-500"
                    )}>
                      <FileVideo className="w-5 h-5" />
                    </div>
                    <div>
                       <p className="text-[11px] font-black uppercase tracking-tight group-hover:text-[#fad400] transition-colors">{c.name}</p>
                       <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{(c.metrics_summary?.impressions || 0).toLocaleString()} Impresiones</p>
                    </div>
                 </div>
                 <div className={clsx(
                   "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                   c.status === 'ACTIVE' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-zinc-800 text-zinc-500 border border-white/5"
                 )}>
                   {c.status}
                 </div>
              </div>
            ))}
          </div>

          <button className="w-full mt-8 py-4 bg-zinc-800/50 hover:bg-[#fad400] hover:text-black transition-all rounded-2xl text-[10px] font-black uppercase tracking-[0.2em]">
             Ver Todas las Campañas
          </button>
        </motion.div>
      </div>
    </div>
  );
}
