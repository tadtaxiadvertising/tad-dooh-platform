import { useEffect, useState } from 'react';
import { useAuth } from '@tad/ui';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import {
  Download, Calendar,
  TrendingUp, Users, Activity, FileText,
  ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import api from "@tad/services";
import { AdvertiserLayout } from '@/components/layout/AdvertiserLayout';
import type { GetServerSideProps } from 'next';
// Force dynamic rendering — prevents "No QueryClient set" SSR errors
export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });

const COLORS = ['#fad400', '#3b82f6', '#10b981', '#a855f7', '#f43f5e'];

interface DailyMetric {
  date: string;
  impressions: number;
  completions: number;
}

interface GeoMetric {
  city: string;
  impressions: number;
}

interface ReportsSummary {
  summary?: {
    impressions: number;
    completions: number;
  };
  timeSeries?: DailyMetric[];
  geographic?: GeoMetric[];
  totalRecords?: number;
}

const formatNumber = (value?: number) =>
  value != null ? value.toLocaleString() : '0';

export default function AdvertiserReports() {
  const { session } = useAuth();
  const [data, setData] = useState<ReportsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await api.get('/campaigns/reports/summary');
        setData(response.data as ReportsSummary);
      } catch (e) {
        console.error('Error fetching reports:', e);
        setError('No se pudieron cargar los reportes. Intenta nuevamente.');
      } finally {
        setLoading(false);
      }
    };

    if (session?.access_token) fetchReports();
  }, [session]);

  // Mensaje "coming soon" para módulos aún no implementados.
  const notifyComingSoon = (feature: string) =>
    toast.info(`Próximamente: ${feature}`);

  if (loading) {
    return (
      <AdvertiserLayout title="Reportes" subtitle="Business Intelligence">
        {/* SkeletonLoader — esqueleto de carga con glassmorphism */}
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-zinc-900/40 border border-white/5 p-8 rounded-[2rem] space-y-4">
                <div className="h-3 w-24 bg-white/10 rounded-full" />
                <div className="h-8 w-32 bg-white/10 rounded-xl" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 bg-zinc-900/30 border border-white/5 p-10 rounded-[3rem] h-[420px]" />
            <div className="lg:col-span-2 bg-zinc-900/30 border border-white/5 p-10 rounded-[3rem] h-[420px]" />
          </div>
        </div>
      </AdvertiserLayout>
    );
  }

  const summary = data?.summary;
  const timeSeries = Array.isArray(data?.timeSeries) ? data.timeSeries : [];
  const geographic = Array.isArray(data?.geographic) ? data.geographic : [];
  const hasData = !!summary && (summary.impressions > 0 || summary.completions > 0);

  // KPI derivado de datos reales (tasa de completación), nunca datos mock.
  const completionRate = summary?.impressions
    ? `${((summary.completions / summary.impressions) * 100).toFixed(1)}%`
    : '0%';

  const kpis = [
    { label: 'Impresiones Totales', value: formatNumber(summary?.impressions), icon: Activity, color: '#fad400' },
    { label: 'Completions (100%)', value: formatNumber(summary?.completions), icon: TrendingUp, color: '#10b981' },
    { label: 'Tasa de Completación', value: completionRate, icon: Users, color: '#3b82f6' },
  ];

  return (
    <AdvertiserLayout title="Reportes de Impacto" subtitle="Business Intelligence">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">Business Intelligence</p>
          <h1 className="text-4xl font-black uppercase tracking-tighter">Reportes de <span className="text-[#fad400]">Impacto</span></h1>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => notifyComingSoon('filtro de fechas')}
            className="flex items-center gap-3 px-6 py-4 bg-zinc-900 border border-white/5 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-zinc-800 transition-all"
          >
            <Calendar className="w-4 h-4 text-zinc-500" />
            Últimos 30 días
            <ChevronDown className="w-3 h-3 text-zinc-700" />
          </button>
          <button
            onClick={() => notifyComingSoon('exportación a PDF')}
            className="flex items-center gap-3 px-6 py-4 bg-[#fad400] text-black rounded-2xl font-black uppercase tracking-widest text-[9px] shadow-[0_10px_30px_rgba(250,212,0,0.2)]"
          >
            <Download className="w-4 h-4" />
            Exportar PDF
          </button>
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 bg-zinc-900/30 border border-white/5 rounded-[2.5rem]">
          <Activity className="w-10 h-10 text-rose-500/80" />
          <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-zinc-900 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all"
          >
            Reintentar
          </button>
        </div>
      ) : !hasData ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 bg-zinc-900/30 border border-white/5 rounded-[2.5rem]">
          <FileText className="w-10 h-10 text-[#fad400]/70" />
          <p className="text-sm font-black text-white uppercase tracking-widest">Aún no hay métricas</p>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
            Los reportes aparecerán cuando tus campañas registren impacto.
          </p>
        </div>
      ) : (
        <>
          {/* KPI Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {kpis.map((kpi, i) => (
              <div key={kpi.label} className="bg-zinc-900/40 border border-white/5 p-8 rounded-[2rem] space-y-2 relative overflow-hidden group">
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
                  <AreaChart data={timeSeries}>
                    <defs>
                      <linearGradient id="colorImp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fad400" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#fad400" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f1f23" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 10 }} />
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
                      data={geographic}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={8}
                      dataKey="impressions"
                      nameKey="city"
                    >
                      {geographic.map((entry, index) => (
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

              {geographic.length === 0 ? (
                <p className="text-center text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                  Sin distribución por zona disponible
                </p>
              ) : (
                <div className="space-y-3">
                  {geographic.map((item, i) => (
                    <div key={item.city} className="flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-white/[0.02]">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-[10px] font-black uppercase tracking-tight">{item.city}</span>
                      </div>
                      <span className="text-[10px] font-bold text-zinc-500">{formatNumber(item.impressions)}</span>
                    </div>
                  ))}
                </div>
              )}
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
            <button
              onClick={() => notifyComingSoon('reporte ejecutivo en PDF')}
              className="px-10 py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-transform active:scale-95 shadow-2xl"
            >
              Descargar Reporte Ejecutivo
            </button>
          </div>
        </>
      )}
    </AdvertiserLayout>
  );
}