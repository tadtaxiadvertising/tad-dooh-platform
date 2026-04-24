import React, { useState, useEffect } from 'react';
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
  Activity,
  RefreshCw,
  Loader2
} from 'lucide-react';
import clsx from 'clsx';
import { AntigravityButton } from '@tad/ui';
import { getReconciliationReport, generateReconciliation, getBiKpis } from '@tad/services';
import { toast } from 'sonner';
import AuditDrillDownModal from '@/components/AuditDrillDownModal';

export default function ReconciliationPage() {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [period, setPeriod] = useState('2026-04');
  const [reports, setReports] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>(null);

  // Modal State
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState({ id: '', name: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reportData, kpiData] = await Promise.all([
        getReconciliationReport(period),
        getBiKpis()
      ]);
      setReports(Array.isArray(reportData) ? reportData : []);
      setKpis(kpiData);
    } catch (error) {
      console.error('Error fetching reconciliation data:', error);
      toast.error('Error al cargar datos de conciliación');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period]);

  const handleGenerate = async () => {
    setGenerating(true);
    toast.loading('Generando auditoría de flota...', { id: 'gen-recon' });
    try {
      await generateReconciliation(period);
      toast.success('Reporte generado exitosamente', { id: 'gen-recon' });
      fetchData();
    } catch (error) {
      toast.error('Error al generar reporte', { id: 'gen-recon' });
    } finally {
      setGenerating(false);
    }
  };

  const filteredReports = reports.filter(r => 
    r.driver?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    r.discrepancyType?.toLowerCase().includes(search.toLowerCase())
  );

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
          <select 
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-6 py-4 bg-zinc-900/50 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-tad-yellow/40 transition-all"
          >
            <option value="2026-03">MARZO 2026</option>
            <option value="2026-04">ABRIL 2026</option>
            <option value="2026-05">MAYO 2026</option>
          </select>
          <button 
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-3 px-8 py-4 bg-tad-yellow text-black rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Recalcular Auditoría
          </button>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <ReconStat 
          label="Ingreso Proyectado" 
          value={`RD$${(kpis?.projectedRevenue || 0).toLocaleString()}`} 
          icon={DollarSign} 
          trend="+12.5%" 
          trendType="up" 
        />
        <ReconStat 
          label="Discrepancias" 
          value={kpis?.discrepancyCount || 0} 
          icon={Activity} 
          trend={kpis?.discrepancyCount > 0 ? "REQUIERE ACCIÓN" : "SANO"} 
          trendType={kpis?.discrepancyCount > 0 ? "down" : "up"} 
        />
        <ReconStat 
          label="Índice de Entrega" 
          value={`${(kpis?.deliveryRateAvg || 0).toFixed(1)}%`} 
          icon={Scale} 
          trend="+0.5%" 
          trendType="up" 
        />
      </div>

      {/* RECONCILIATION TABLE */}
      <div className="bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="relative group flex-1 max-w-xl">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-tad-yellow transition-all" />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="FILTRAR POR SOCIO O RAZÓN..."
              className="w-full bg-black/40 border border-white/[0.05] rounded-2xl py-4 pl-14 pr-6 text-[10px] font-bold uppercase tracking-[0.2em] outline-none focus:border-tad-yellow/30 transition-all text-white"
            />
          </div>
          <div className="flex gap-2 text-white">
            <button className="p-4 bg-white/5 text-zinc-400 rounded-xl hover:bg-white/10 transition-all border border-white/5">
              <Filter className="w-4 h-4" />
            </button>
            <button className="px-6 py-3 bg-white/5 text-zinc-400 rounded-xl hover:bg-white hover:text-black font-black uppercase text-[10px] tracking-widest transition-all">
              Descargar CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 text-tad-yellow animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Procesando registros fiscales...</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 border-b border-white/5">
                  <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Socio / Unidad</th>
                  <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Impactos</th>
                  <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Contratado vs Recibido</th>
                  <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Payroll (Pend/Pagado)</th>
                  <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Status / Motivo</th>
                  <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {filteredReports.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.01] group transition-all">
                    <td className="px-8 py-6">
                      <p className="text-xs font-black text-white uppercase tracking-tight italic">{r.driver?.fullName || 'Desconocido'}</p>
                      <p className="text-[9px] text-zinc-500 font-bold uppercase mt-1">ID: {r.deviceId || 'S/N'}</p>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="text-[11px] font-black text-zinc-300 font-mono">{r.totalPlaybacks}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-500 line-through">RD$ {r.revenueContracted}</span>
                        <span className="text-xs font-black text-emerald-500 italic">RD$ {r.revenueReceived}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-rose-400">RD$ {r.payrollDue}</span>
                        <span className="text-zinc-700">/</span>
                        <span className="text-xs font-bold text-emerald-400">RD$ {r.payrollPaid}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1">
                        <span className={clsx(
                          "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border w-fit",
                          r.hasDiscrepancy ? "bg-rose-500/10 text-rose-500 border-rose-500/20 animate-pulse" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        )}>
                          {r.hasDiscrepancy ? 'DISCREPANCIA' : 'CONCILIADO'}
                        </span>
                        <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-tighter">{r.discrepancyType}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => {
                          setSelectedDevice({ id: r.deviceId, name: r.driver?.fullName || 'Socio Desconocido' });
                          setDrillDownOpen(true);
                        }}
                        className="px-6 py-2 bg-white/5 hover:bg-white text-black font-black uppercase text-[9px] tracking-widest rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-xl"
                      >
                        Auditar
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredReports.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center">
                      <AlertTriangle className="w-8 h-8 text-zinc-700 mx-auto mb-4" />
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">No se encontraron registros para este período</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="mt-12 p-10 bg-zinc-900 border border-t-4 border-t-tad-yellow rounded-[40px] shadow-2xl flex flex-col md:flex-row items-center gap-10">
        <div className="w-20 h-20 shrink-0 bg-tad-yellow/10 rounded-3xl flex items-center justify-center border border-tad-yellow/20">
          <Scale className="w-10 h-10 text-tad-yellow" />
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Estabilidad de Red vs Facturación</h3>
          <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-widest leading-loose max-w-2xl">
            El sistema de conciliación detecta automáticamente cierres de sesión forzados o caídas de red que invalidan la certificación de impactos. Asegúrese de revisar los registros <span className="text-white italic">DISCREPANCIA</span> para evitar sobre-cobros o pérdidas de driver.
          </p>
        </div>
        <button className="px-10 py-5 bg-white text-black font-black uppercase text-[12px] tracking-[0.2em] rounded-2xl hover:scale-105 transition-all shadow-2xl">
          Protocolo Cierre de Mes
        </button>
      </div>

      <AuditDrillDownModal 
        isOpen={drillDownOpen}
        onClose={() => setDrillDownOpen(false)}
        deviceId={selectedDevice.id}
        driverName={selectedDevice.name}
      />
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








