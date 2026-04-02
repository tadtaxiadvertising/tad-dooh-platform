import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../../components/Layout';
import { BiKpiCard } from '../../components/bi/BiKpiCard';
import { 
  DollarSign, 
  Car, 
  PlayCircle, 
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  MapPin,
  Calendar
} from 'lucide-react';
import { AntigravityButton } from '../../components/ui/AntigravityButton';
import { getBiKpis } from '../../services/api';
import { toast } from 'sonner';
import clsx from 'clsx';

const BIDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>(null);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchKpis = async () => {
    setLoading(true);
    try {
      const data = await getBiKpis();
      setKpis(data);
      setLastRefreshed(new Date());
    } catch (error) {
      console.error('Error fetching BI KPIs:', error);
      toast.error('Error al cargar indicadores de negocio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKpis();
  }, []);

  return (
    <Layout>
      <Head>
        <title>BI Command Center | TAD DOOH Platform</title>
        <meta name="description" content="TAD Dominicana BI Dashboard - Real-time fleet and financial intelligence" />
      </Head>
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800/50 pb-8">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-tad-yellow" strokeWidth={3} />
              BI Command Center
              <span className="text-tad-yellow inline-block animate-pulse">_</span>
            </h1>
            <p className="text-zinc-500 font-medium text-xs tracking-widest uppercase">
              Inteligencia Financiera y Flota | Tiempo Real
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Último Refresh</p>
              <p className="text-xs text-zinc-400 font-mono">{lastRefreshed.toLocaleTimeString()}</p>
            </div>
            <AntigravityButton 
              onAsyncClick={fetchKpis} 
              variant="secondary" 
              className="px-4 py-2"
              actionName="refresh_bi_kpis"
            >
              <RefreshCw className={clsx("w-4 h-4 mr-2", loading && "animate-spin")} />
              ACTUALIZAR
            </AntigravityButton>
          </div>
        </div>

        {/* Global KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <BiKpiCard 
            title="MRR ESTIMADO"
            value={`RD$ ${kpis?.mrr?.toLocaleString() || '0'}`}
            subtitle="Ingresos por suscripción (Mes)"
            icon={DollarSign}
            status={kpis?.mrr > 0 ? 'optimum' : 'warning'}
            loading={loading}
          />
          <BiKpiCard 
            title="SALUD DE FLOTA"
            value={`${kpis?.onlineDevices || 0}/${kpis?.totalDevices || 0}`}
            subtitle="Dispositivos activos hoy"
            icon={Car}
            status={kpis?.criticalDevices > 0 ? 'critical' : kpis?.onlineDevices < kpis?.totalDevices * 0.8 ? 'warning' : 'optimum'}
            loading={loading}
          />
          <BiKpiCard 
            title="IMPRESIONES MTD"
            value={kpis?.totalImpressionsMtd?.toLocaleString() || '0'}
            subtitle="Ciclos confirmados en el mes"
            icon={PlayCircle}
            status="optimum"
            loading={loading}
          />
          <BiKpiCard 
            title="DISCREPANCIAS"
            value="3" // Placeholder logic
            subtitle="Conciliaciones pendientes"
            icon={AlertTriangle}
            status="critical"
            loading={loading}
          />
        </div>

        {/* Secondary Section: Fleet & Geography */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-6 h-[400px] flex flex-col items-center justify-center text-zinc-500">
              <MapPin className="w-8 h-8 mb-4 opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">Vista Geográfica de Rendimiento</p>
              <p className="text-xs italic mt-2 opacity-50">(Próximamente: Integración con Leaflet.Heat)</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-300 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-tad-yellow" strokeWidth={3} />
                  FEED DE CONCILIACIÓN
                </h2>
              </div>
              <div className="p-0 divide-y divide-zinc-900">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 hover:bg-zinc-900/40 transition-colors group cursor-pointer">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-xs font-bold text-white group-hover:text-tad-yellow transition-colors tracking-tight">TAD-STI-0{i}</p>
                      <span className="text-[8px] bg-rose-500/10 text-rose-500 px-1.5 py-0.5 rounded font-black tracking-tighter">RED_FLAG</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">Suscripción vencida hace 3 días. 1200 impresiones detectadas sin pago reflejado.</p>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-zinc-800 bg-zinc-900/20">
                <AntigravityButton 
                  variant="secondary" 
                  className="w-full py-2 text-[10px]"
                  actionName="view_all_bi_reports"
                >
                  VER TODOS LOS REPORTES
                </AntigravityButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default BIDashboard;
