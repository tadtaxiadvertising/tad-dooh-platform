import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Activity, DollarSign, Target, LayoutDashboard, CloudRain } from 'lucide-react';
import Link from 'next/link';
import apiClient from '../../lib/apiClient';

export default function InvestorDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [simulatorTaxis, setSimulatorTaxis] = useState<number>(100);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const response = await apiClient.get('/api/finance/investor-metrics');
        setMetrics(response.data);
      } catch (err) {
        console.error("Error fetching investor metrics", err);
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, []);

  // Simulator Logic
  const SIMULATOR_VPS_FIXED = 5000;
  const SIMULATOR_BANDWIDTH_PER_TAXI = 200; // RD$200/month in Data
  const BASE_REV_PER_TAXI = metrics?.monthlyRevPerTaxi ? parseFloat(metrics.monthlyRevPerTaxi) : 15000;
  const BASE_OPEX_PER_TAXI = metrics?.monthlyOpexPerTaxi ? parseFloat(metrics.monthlyOpexPerTaxi) : 5000;

  const simRevenue = simulatorTaxis * BASE_REV_PER_TAXI;
  const simOpex = (simulatorTaxis * BASE_OPEX_PER_TAXI) + SIMULATOR_VPS_FIXED + (simulatorTaxis * SIMULATOR_BANDWIDTH_PER_TAXI);
  const simEbitda = simRevenue - simOpex;

  const chartData = [
    { month: 'Mes 1', revenue: (simulatorTaxis * BASE_REV_PER_TAXI) * 0.2, opex: simOpex },
    { month: 'Mes 3', revenue: (simulatorTaxis * BASE_REV_PER_TAXI) * 0.5, opex: simOpex },
    { month: 'Mes 6', revenue: (simulatorTaxis * BASE_REV_PER_TAXI) * 0.8, opex: simOpex },
    { month: 'Mes 12', revenue: simRevenue, opex: simOpex },
    { month: 'Mes 24', revenue: simRevenue * 1.2, opex: simOpex * 1.05 },
  ];

  if (loading) return <div className="text-white p-8">Cargando métricas...</div>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono p-8 selection:bg-[#FFD400] selection:text-black">
      <Head>
        <title>Investor Dashboard | TAD DOOH</title>
      </Head>

      <div className="mb-8 flex justify-between items-center border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-[#FFD400]">TAD<span className="text-white">DOOH</span></h1>
          <p className="text-zinc-500 text-xs uppercase tracking-widest mt-1">Ecosistema de Inteligencia Financiera v6.0</p>
        </div>
        <div className="flex space-x-4">
          <Link href="/admin">
            <button className="px-4 py-2 bg-zinc-900 border border-zinc-700 hover:border-[#FFD400] text-sm text-zinc-300 transition-colors uppercase tracking-wider">
              <LayoutDashboard size={16} className="inline mr-2" /> Admin
            </button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <MetricCard title="EBITDA Mensual" value={`RD$ ${metrics?.ebitda || '---'}`} icon={<TrendingUp size={20} />} trend="+15%" />
        <MetricCard title="CAC (Acquisition Cost)" value={`RD$ ${metrics?.cac || '---'}`} icon={<Target size={20} />} trend="-5%" />
        <MetricCard title="LTV a 24 Meses" value={`RD$ ${metrics?.ltv || '---'}`} icon={<DollarSign size={20} />} trend="+20%" />
        <MetricCard title="Payback Period" value={`${metrics?.paybackPeriod || '---'} Meses`} icon={<Activity size={20} />} sub="Por unidad (RD$6k hardware)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-2 bg-[#141414] border border-zinc-800 p-6 shadow-2xl relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD400] opacity-5 blur-3xl rounded-full"></div>
          <h2 className="text-xl font-bold mb-2 uppercase tracking-widest">Proyección de Escalabilidad</h2>
          <p className="text-zinc-500 text-sm mb-6 max-w-lg">
            Simulador de rentabilidad ajustado a costos fijos (VPS, Banda Ancha Supabase) y crecimiento exponencial.
          </p>

          <div className="mb-8">
            <label className="block text-sm text-[#FFD400] font-bold mb-2">FLOTA ACTIVA: {simulatorTaxis} TAXIS</label>
            <input 
              type="range" 
              min="10" 
              max="2000" 
              value={simulatorTaxis} 
              onChange={(e) => setSimulatorTaxis(parseInt(e.target.value))}
              className="w-full accent-[#FFD400] bg-zinc-800 h-2 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8 text-center divide-x divide-zinc-800">
            <div>
              <p className="text-zinc-500 text-xs">Revenue Estimado</p>
              <p className="text-xl font-bold text-green-400">RD$ {(simRevenue/1000).toFixed(1)}k</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs">OPEX + Fijos</p>
              <p className="text-xl font-bold text-red-400">RD$ {(simOpex/1000).toFixed(1)}k</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs">EBITDA Proyectado</p>
              <p className="text-xl font-bold text-[#FFD400]">RD$ {(simEbitda/1000).toFixed(1)}k</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFD400" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#FFD400" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="month" stroke="#666" tick={{fill: '#666', fontSize: 12}} />
                <YAxis stroke="#666" tick={{fill: '#666', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000', borderColor: '#333', color: '#fff' }}
                  itemStyle={{ color: '#FFD400' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#FFD400" fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="opex" stroke="#EF4444" fillOpacity={0.1} fill="#EF4444" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#141414] border border-zinc-800 p-6">
          <h2 className="text-xl font-bold mb-4 uppercase tracking-widest text-[#FFD400]">Salud por Dispositivo</h2>
          <p className="text-zinc-500 text-sm mb-6">
            Riesgo de pérdida de rentabilidad por baja asistencia o desconexión.
          </p>

          <div className="space-y-4">
            {/* Mocked data for unit status */}
            <UnitStatus number="TAXI-105" uptime="99%" profit="Positivo" />
            <UnitStatus number="TAXI-211" uptime="98%" profit="Positivo" />
            <UnitStatus number="TAXI-043" uptime="65%" profit="Negativo" alert />
            <UnitStatus number="TAXI-319" uptime="12%" profit="CRÍTICO" alert />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, trend, sub }: any) {
  return (
    <div className="bg-[#141414] border border-zinc-800 p-6 flex flex-col justify-between hover:border-[#FFD400] transition-colors relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
        {icon}
      </div>
      <p className="text-zinc-500 text-xs uppercase tracking-widest">{title}</p>
      <h3 className="text-2xl font-bold mt-2 mb-1">{value}</h3>
      {trend && <p className="text-green-400 text-xs font-bold">{trend} vs Mes Anterior</p>}
      {sub && <p className="text-zinc-500 text-xs">{sub}</p>}
    </div>
  );
}

function UnitStatus({ number, uptime, profit, alert }: any) {
  return (
    <div className={`p-4 border ${alert ? 'bg-red-900/10 border-red-900/50' : 'bg-zinc-900 border-zinc-800'} flex justify-between items-center`}>
      <div>
        <h4 className="font-bold text-sm">{number}</h4>
        <p className={`text-xs ${alert ? 'text-red-400' : 'text-zinc-500'}`}>Asistencia: {uptime}</p>
      </div>
      <div className={`text-xs font-bold px-2 py-1 rounded ${alert ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
        {profit}
      </div>
    </div>
  );
}
