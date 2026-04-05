import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Download, Filter, Calendar, MapPin, 
  TrendingUp, Users, Activity, FileText,
  ChevronDown
} from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

const COLORS = ['#fad400', '#3b82f6', '#10b981', '#a855f7', '#f43f5e'];

export default function AdvertiserReports() {
  const { session } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/campaigns/reports/summary`, {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`
          }
        });
        const result = await res.json();
        setData(result);
      } catch (e) {
        console.error('Error fetching reports:', e);
      } finally {
        setLoading(false);
      }
    };

    if (session?.access_token) fetchReports();
  }, [session]);

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
       <div className="w-10 h-10 border-4 border-[#fad400] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-8 pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div className="space-y-1">
           <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">Business Intelligence</p>
           <h1 className="text-4xl font-black uppercase tracking-tighter">Reportes de <span className="text-[#fad400]">Impacto</span></h1>
        </div>

        <div className="flex gap-4">
           <button className="flex items-center gap-3 px-6 py-4 bg-zinc-900 border border-white/5 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-zinc-800 transition-all">
              <Calendar className="w-4 h-4 text-zinc-500" />
              Últimos 30 días
              <ChevronDown className="w-3 h-3 text-zinc-700" />
           </button>
           <button className="flex items-center gap-3 px-6 py-4 bg-[#fad400] text-black rounded-2xl font-black uppercase tracking-widest text-[9px] shadow-[0_10px_30px_rgba(250,212,0,0.2)]">
              <Download className="w-4 h-4" />
              Exportar PDF
           </button>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
         {[
           { label: 'Impresiones Totales', value: data?.summary?.impressions?.toLocaleString() || '0', icon: Activity, color: '#fad400' },
           { label: 'Completions (100%)', value: data?.summary?.completions?.toLocaleString() || '0', icon: TrendingUp, color: '#10b981' },
           { label: 'Reproducción Promedio', value: '28.4s', icon: Users, color: '#3b82f6' },
         ].map((kpi, i) => (
           <div key={i} className="bg-zinc-900/40 border border-white/5 p-8 rounded-[2rem] space-y-2 relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                 <kpi.icon className="w-24 h-24" />
              </div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">{kpi.label}</p>
              <h3 className="text-3xl font-black tracking-tight">{kpi.value}</h3>
           </div>
         ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Timeline Chart */}
        <div className="lg:col-span-3 bg-zinc-900/30 backdrop-blur-3xl border border-white/5 p-10 rounded-[3rem] space-y-8">
           <div className="flex justify-between items-center">
              <div>
                 <h3 className="text-xl font-black uppercase tracking-tight">Evolución de Impacto</h3>
                 <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Impresiones diarias en toda la flota</p>
              </div>
           </div>

           <div className="h-[400px] w-full">
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
                 <Area type="monotone" dataKey="completions" stroke="#3b82f6" fillOpacity={0} strokeWidth={2} strokeDasharray="5 5" />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Geo Distribution */}
        <div className="lg:col-span-2 bg-zinc-900/30 backdrop-blur-3xl border border-white/5 p-10 rounded-[3rem] space-y-8">
           <div>
              <h3 className="text-xl font-black uppercase tracking-tight">Distribución Geográfica</h3>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Impacto por zona urbana</p>
           </div>

           <div className="h-[300px] w-full relative">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={data?.geographic || []}
                   cx="50%"
                   cy="50%"
                   innerRadius={60}
                   outerRadius={100}
                   paddingAngle={8}
                   dataKey="impressions"
                   nameKey="city"
                 >
                   {data?.geographic?.map((entry: any, index: number) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip 
                   contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '12px' }}
                   itemStyle={{ fontSize: '10px', textTransform: 'uppercase' }}
                 />
               </PieChart>
             </ResponsiveContainer>
           </div>

           <div className="space-y-3">
              {data?.geographic?.map((item: any, i: number) => (
                <div key={item.city} className="flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-white/[0.02]">
                   <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-[10px] font-black uppercase tracking-tight">{item.city}</span>
                   </div>
                   <span className="text-[10px] font-bold text-zinc-500">{item.impressions.toLocaleString()}</span>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* Export Section Shadow */}
      <div className="mt-12 p-8 bg-zinc-900/20 border border-white/5 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6">
         <div className="flex items-center gap-6 text-center md:text-left">
            <div className="w-16 h-16 rounded-2xl bg-[#fad400]/10 flex items-center justify-center">
               <FileText className="w-8 h-8 text-[#fad400]" />
            </div>
            <div>
               <h4 className="text-sm font-black uppercase tracking-tight">Reporte Detallado de Campaña</h4>
               <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Genera un PDF con todas las métricas para tu equipo</p>
            </div>
         </div>
         <button className="px-10 py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-transform active:scale-95 shadow-2xl">
            Descargar Reporte Ejecutivo
         </button>
      </div>
    </div>
  );
}
