import React, { useState } from 'react';
import Head from 'next/head';
import { 
  Scale, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  DollarSign, 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar,
  Filter,
  Download,
  Terminal,
  Activity
} from 'lucide-react';
import clsx from 'clsx';
import { AntigravityButton } from '@/components/ui/AntigravityButton';

export default function ReconciliationPage() {
  const [search, setSearch] = useState('');
  
  // Mock data for reconciliation
  const disputes = [
    { id: 'REC-2900', target: 'Driver J. Perez', amount: 'RD$42.50', status: 'DISPUTE', reason: 'Offline 4h', date: '2026-04-01' },
    { id: 'REC-2901', target: 'Advertiser Coca-Cola', amount: 'RD$1,200.00', status: 'RESOLVED', reason: 'Proof of play verified', date: '2026-04-01' },
    { id: 'REC-2902', target: 'Driver L. Gomez', amount: 'RD$12.00', status: 'PENDING', reason: 'GPS inaccuracy', date: '2026-03-31' },
    { id: 'REC-2903', target: 'Unit STI-451', amount: '-RD$150.00', status: 'CRITICAL', reason: 'Hardware failure > 12h', date: '2026-03-30' },
  ];

  return (
    <div className="min-h-screen pb-20 animate-in fade-in duration-700">
      <Head>
        <title>Conciliación & Auditoría | TAD Terminal</title>
      </Head>

      {/* HEADER */}
      <div className="mb-10 flex flex-col xl:flex-row xl:items-end justify-between gap-8">
        <div>
          <div className="flex items-center gap-3 mb-4 opacity-40">
            <div className="w-8 h-[1px] bg-white" />
            <p className="text-[9px] font-black text-white uppercase tracking-[0.5em]">BI / Financial Reconciliation</p>
          </div>
          <h1 className="text-5xl lg:text-6xl font-black tracking-tighter text-white uppercase italic flex items-center gap-4">
            AUDITORÍA <span className="text-tad-yellow italic underline decoration-zinc-800">FISCAL</span>
          </h1>
          <p className="text-zinc-500 mt-4 font-bold uppercase text-[10px] tracking-widest max-w-xl leading-relaxed">
            Módulo de conciliación financiera: Balance entre impactos contratados vs. telemetría real procesada en nodos.
          </p>
        </div>

        <div className="flex gap-3">
          <button className="flex items-center gap-3 px-8 py-4 bg-zinc-900/50 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all">
            <Calendar className="w-4 h-4" />
            MARZO 2026
          </button>
          <button className="flex items-center gap-3 px-8 py-4 bg-tad-yellow text-black rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">
            <Download className="w-4 h-4" />
            Exportar Reporte
          </button>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <ReconStat label="Ingreso Proyectado" value="RD$42,850.00" icon={DollarSign} trend="+12.5%" trendType="up" />
        <ReconStat label="Brecha Operativa" value="-RD$1,240.50" icon={Activity} trend="-4.2%" trendType="down" />
        <ReconStat label="Índice de Confianza" value="97.8%" icon={Scale} trend="+0.5%" trendType="up" />
      </div>

      {/* RECONCILIATION TABLE */}
      <div className="bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="relative group flex-1 max-w-xl">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-tad-yellow transition-all" />
            <input 
              type="text" 
              placeholder="FILTRAR POR ENTIDAD O RAZÓN..."
              className="w-full bg-black/40 border border-white/[0.05] rounded-2xl py-4 pl-14 pr-6 text-[10px] font-bold uppercase tracking-[0.2em] outline-none focus:border-tad-yellow/30 transition-all"
            />
          </div>
          <div className="flex gap-2">
            <button className="p-4 bg-white/5 text-zinc-400 rounded-xl hover:bg-white/10 transition-all border border-white/5">
              <Filter className="w-4 h-4" />
            </button>
            <button className="px-6 py-3 bg-white/5 text-zinc-400 rounded-xl hover:bg-white text-black font-black uppercase text-[10px] tracking-widest transition-all">
              Audit Logs
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 border-b border-white/5">
                <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">ID Log</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Entidad / Sujeto</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Discrepancia</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Motivo SRE</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Status Fiscal</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {disputes.map((d) => (
                <tr key={d.id} className="hover:bg-white/[0.01] group transition-all">
                  <td className="px-8 py-6">
                    <span className="text-[10px] font-mono font-bold text-zinc-600 group-hover:text-tad-yellow transition-colors">{d.id}</span>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-xs font-black text-white uppercase tracking-tight italic">{d.target}</p>
                    <p className="text-[9px] text-zinc-500 font-bold uppercase mt-1">{d.date}</p>
                  </td>
                  <td className={clsx("px-8 py-6 text-xs font-black italic", d.amount.startsWith('-') ? 'text-rose-500' : 'text-emerald-500')}>
                    {d.amount}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-3 h-3 text-zinc-700" />
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{d.reason}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={clsx(
                      "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                      d.status === 'RESOLVED' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                      d.status === 'DISPUTE' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                      d.status === 'CRITICAL' ? "bg-rose-500/10 text-rose-500 border-rose-500/20 animate-pulse" :
                      "bg-zinc-800 text-zinc-500 border-white/5"
                    )}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <AntigravityButton 
                      actionName="resolve_dispute"
                      variant="primary"
                      className="px-4 py-2 h-auto text-[9px] opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Resolver
                    </AntigravityButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-12 p-10 bg-zinc-900 border border-t-4 border-t-tad-yellow rounded-[40px] shadow-2xl flex flex-col md:flex-row items-center gap-10">
        <div className="w-20 h-20 shrink-0 bg-tad-yellow/10 rounded-3xl flex items-center justify-center border border-tad-yellow/20">
          <Scale className="w-10 h-10 text-tad-yellow" />
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Estabilidad de Red vs Facturación</h3>
          <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-widest leading-loose max-w-2xl">
            El sistema de conciliación detecta automáticamente cierres de sesión forzados o caídas de red que invalidan la certificación de impactos. Asegúrese de revisar los registros <span className="text-white italic">CRITICAL</span> para evitar sobre-cobros o pérdidas de driver.
          </p>
        </div>
        <button className="px-10 py-5 bg-white text-black font-black uppercase text-[12px] tracking-[0.2em] rounded-2xl hover:scale-105 transition-all shadow-2xl">
          Protocolo Cierre de Mes
        </button>
      </div>
    </div>
  );
}

function ReconStat({ label, value, icon: Icon, trend, trendType }: any) {
  return (
    <div className="bg-zinc-900/60 border border-white/5 p-8 rounded-[32px] relative group overflow-hidden">
      <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon className="w-20 h-20 text-white" />
      </div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-zinc-500 group-hover:text-tad-yellow transition-colors">
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <h2 className="text-4xl font-black text-white tracking-tighter italic">{value}</h2>
        <div className={clsx(
          "flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-black",
          trendType === 'up' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
        )}>
          {trendType === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          {trend}
        </div>
      </div>
    </div>
  );
}

