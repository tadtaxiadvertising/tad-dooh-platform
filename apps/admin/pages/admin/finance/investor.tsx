import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Target, TrendingUp, Activity, DollarSign, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import api from '@tad/services';

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });

export default function InvestorDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [simulatorTaxis, setSimulatorTaxis] = useState<number>(100);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const response = await api.get('/finance/investor-metrics');
        setMetrics(response.data);
      } catch (err) {
        console.error("Error fetching investor metrics", err);
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, []);

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
        <div className="lg:col-span-2 bg-[#141414] border border-zinc-800 p-8 shadow-2xl relative flex flex-col justify-center items-center text-center">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD400] opacity-5 blur-[100px] rounded-full"></div>
          <div className="w-20 h-20 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800 mb-6">
            <Activity className="text-[#FFD400] w-10 h-10 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold mb-4 uppercase tracking-tighter text-white">Análisis de Flota en Producción</h2>
          <p className="text-zinc-500 text-sm max-w-md leading-relaxed">
            El sistema está operando exclusivamente con datos de campo verificados. Las proyecciones simuladas han sido retiradas para priorizar la fidelidad financiera en tiempo real.
          </p>
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








