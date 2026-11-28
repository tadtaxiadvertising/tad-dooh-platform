import React, { useState, useEffect, useCallback, useRef } from "react";
import { parseReconciliationPage } from "@/lib/reconciliation-page";
import type { ReconciliationPage as ReportPage } from "@/lib/reconciliation-page";
import Head from "next/head";
import type { GetServerSideProps } from "next";
import {
  Scale,
  Search,
  AlertTriangle,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download,
  Terminal,
  RefreshCw,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import clsx from "clsx";

import {
  getReconciliationReport,
  generateReconciliation,
  getBiKpis,
} from "@tad/services";
import { toast } from "sonner";
import AuditDrillDownModal from "@/components/AuditDrillDownModal";

// ─── Sub-components ───────────────────────────────────────────────────────────

function ReconStat({
  label,
  value,
  icon: Icon,
  trend,
  trendType,
  loading,
}: {
  label: string;
  value: React.ReactNode;
  icon: typeof Scale;
  trend?: string;
  trendType?: "up" | "down";
  loading?: boolean;
}) {
  return (
    <div className="bg-zinc-900/40 backdrop-blur-md border border-white/[0.05] p-8 rounded-[32px] relative group overflow-hidden transition-all duration-300 hover:border-tad-yellow/20">
      <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
        <Icon className="w-24 h-24 text-white" />
      </div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-white/[0.03] rounded-2xl border border-white/[0.05] text-zinc-500 group-hover:text-tad-yellow transition-colors">
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
          {label}
        </span>
      </div>
      <div className="flex items-end justify-between">
        <h2 className="text-4xl font-black text-white tracking-tighter italic">
          {loading ? (
            <span className="inline-block w-24 h-8 bg-zinc-800 rounded animate-pulse" />
          ) : (
            value
          )}
        </h2>
        {!loading && trend && (
          <div
            className={clsx(
              "flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wider",
              trendType === "up"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10"
                : "bg-rose-500/10 text-rose-400 border border-rose-500/10",
            )}
          >
            {trendType === "up" ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : (
              <ArrowDownRight className="w-4 h-4" />
            )}
            {trend}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export const getServerSideProps: GetServerSideProps = async () => ({
  props: {},
});

export default function ReconciliationPage() {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [period, setPeriod] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  const [page, setPage] = useState(1);
  const [reportPage, setReportPage] = useState<ReportPage | null>(null);
  const requestRef = useRef(0);
  const currentReport =
    reportPage?.period === period && reportPage.page === page
      ? reportPage
      : null;
  const reports = currentReport?.data ?? [];
  const [kpis, setKpis] = useState<{
    projectedRevenue?: number;
    discrepancyCount?: number;
    deliveryRateAvg?: number;
  } | null>(null);

  // Modal State
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState({ id: "", name: "" });

  const fetchData = useCallback(async () => {
    const request = ++requestRef.current;
    setLoading(true);
    setReportPage(null);
    setKpis(null);
    try {
      const [reportData, kpiData] = await Promise.allSettled([
        getReconciliationReport(period, page, 100),
        getBiKpis(),
      ]);
      if (request !== requestRef.current) return;
      setReportPage(
        reportData.status === "fulfilled"
          ? parseReconciliationPage(reportData.value, period, page, 100)
          : null,
      );
      if (kpiData.status === "fulfilled") setKpis(kpiData.value);
    } catch (error) {
      if (request !== requestRef.current) return;
      console.error("Error fetching reconciliation data:", error);
      toast.error("Error al cargar datos de conciliación");
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [period, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGenerate = async () => {
    setGenerating(true);
    const toastId = toast.loading("Calculando auditoría de flota...");
    try {
      await generateReconciliation(period);
      toast.success("Auditoría regenerada con éxito", { id: toastId });
      fetchData();
    } catch {
      toast.error("Error al generar reporte de auditoría", { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  const filteredReports = reports.filter(
    (r) =>
      !search.trim() ||
      r.driver?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      r.deviceId?.toLowerCase().includes(search.toLowerCase()) ||
      r.discrepancyType?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen pb-20 animate-in fade-in duration-1000">
      <Head>
        <title>Auditoría Fiscal & Conciliación | TAD Terminal</title>
      </Head>

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div className="mb-12 flex flex-col xl:flex-row xl:items-end justify-between gap-8 border-b border-zinc-800/60 pb-10">
        <div>
          <div className="flex items-center gap-3 mb-4 opacity-40">
            <div className="w-12 h-[1px] bg-white" />
            <p className="text-[9px] font-black text-white uppercase tracking-[0.5em]">
              Financial Data Integrity / SRE 2026
            </p>
          </div>
          <h1 className="text-4xl lg:text-6xl font-black tracking-tighter text-white uppercase italic flex items-center gap-4">
            AUDITORÍA{" "}
            <span className="text-tad-yellow italic underline decoration-zinc-800 decoration-4 underline-offset-8">
              FISCAL
            </span>
          </h1>
          <p className="text-zinc-500 mt-6 font-bold uppercase text-[10px] tracking-[0.2em] max-w-2xl leading-relaxed">
            Módulo de certificación de impactos: Validación cruzada entre logs
            de reproducción local y telemetría de red certificada por nodos
            externos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">
              Periodo Fiscal
            </span>
            <input
              type="month"
              aria-label="Periodo fiscal"
              value={period}
              disabled={generating}
              onChange={(e) => {
                if (!/^\d{4}-\d{2}$/.test(e.target.value)) return;
                requestRef.current++;
                setReportPage(null);
                setLoading(true);
                setPage(1);
                setPeriod(e.target.value);
              }}
              className="px-6 py-3.5 bg-zinc-900/60 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-tad-yellow/40"
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">
              Acción del Sistema
            </span>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-3 px-8 py-3.5 bg-tad-yellow text-black rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-[0_0_30px_rgba(250,204,21,0.2)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Recalcular Auditoría
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI GRID ──────────────────────────────────────────────────────── */}
      <p className="mb-4 text-xs text-zinc-400">
        Indicadores globales de BI; no representan el total del periodo elegido.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        <ReconStat
          label="Ingreso Proyectado"
          value={
            typeof kpis?.projectedRevenue === "number" &&
            Number.isFinite(kpis.projectedRevenue)
              ? `RD$ ${kpis.projectedRevenue.toLocaleString()}`
              : "No disponible"
          }
          icon={DollarSign}
          loading={loading}
        />
        <ReconStat
          label="Anomalías Detectadas"
          value={
            typeof kpis?.discrepancyCount === "number" &&
            Number.isFinite(kpis.discrepancyCount)
              ? kpis.discrepancyCount
              : "No disponible"
          }
          icon={AlertTriangle}
          loading={loading}
        />
        <ReconStat
          label="Índice de Certificación"
          value={
            typeof kpis?.deliveryRateAvg === "number" &&
            Number.isFinite(kpis.deliveryRateAvg)
              ? `${kpis.deliveryRateAvg.toFixed(1)}%`
              : "No disponible"
          }
          icon={ShieldCheck}
          loading={loading}
        />
      </div>

      {/* ── MAIN LEDGER TABLE ──────────────────────────────────────────────── */}
      <div className="bg-zinc-950/40 backdrop-blur-3xl border border-white/[0.05] rounded-[40px] overflow-hidden shadow-2xl">
        <div className="p-10 border-b border-white/[0.05] flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-zinc-900/20">
          <div className="relative group flex-1 max-w-2xl">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-tad-yellow transition-all" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="BUSCAR EN ESTA PÁGINA..."
              className="w-full bg-black/40 border border-white/[0.05] rounded-2xl py-4 pl-14 pr-6 text-[10px] font-bold uppercase tracking-[0.2em] outline-none focus:border-tad-yellow/30 transition-all text-white placeholder:text-zinc-700"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="p-4 bg-white/[0.03] text-zinc-500 rounded-2xl hover:bg-white/[0.07] transition-all border border-white/[0.05] group">
              <Filter className="w-4 h-4 group-hover:text-tad-yellow transition-colors" />
            </button>
            <button className="px-8 py-4 bg-zinc-800/60 text-zinc-400 rounded-2xl hover:bg-white hover:text-black font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-3">
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[500px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-6">
              <div className="relative">
                <div className="w-16 h-16 border-t-2 border-tad-yellow rounded-full animate-spin" />
                <Terminal className="absolute inset-0 m-auto w-6 h-6 text-tad-yellow/40" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 animate-pulse">
                Sincronizando registros con Supabase Master...
              </p>
            </div>
          ) : !currentReport ? (
            <div role="alert" className="p-10 text-rose-400">
              No se pudo verificar la conciliación de este periodo.
              <button
                type="button"
                onClick={fetchData}
                className="ml-4 underline"
              >
                Reintentar
              </button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/[0.05]">
                  <th className="px-10 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                    Socio Estratégico / Unidad
                  </th>
                  <th className="px-10 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">
                    Impactos
                  </th>
                  <th className="px-10 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                    Certificado vs Real
                  </th>
                  <th className="px-10 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                    Payroll Acumulado
                  </th>
                  <th className="px-10 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                    Status Integridad
                  </th>
                  <th className="px-10 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">
                    Auditoría
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {filteredReports.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-white/[0.02] group transition-all duration-300"
                  >
                    <td className="px-10 py-8">
                      <div className="flex flex-col">
                        <p className="text-xs font-black text-white uppercase tracking-tight italic group-hover:text-tad-yellow transition-colors">
                          {r.driver?.fullName || "Desconocido"}
                        </p>
                        <p className="text-[9px] text-zinc-600 font-bold uppercase mt-1.5 flex items-center gap-2">
                          <span className="w-1 h-1 bg-zinc-800 rounded-full" />
                          NODE_ID: {r.deviceId || "S/N"}
                        </p>
                      </div>
                    </td>
                    <td className="px-10 py-8 text-center font-mono">
                      <span className="text-xs font-black text-zinc-400 group-hover:text-white transition-colors">
                        {r.totalPlaybacks.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-zinc-600 font-bold tracking-tighter">
                          CERT: RD${" "}
                          {(r.revenueContracted || 0).toLocaleString()}
                        </span>
                        <span className="text-xs font-black text-emerald-500 italic tracking-tight">
                          REAL: RD$ {(r.revenueReceived || 0).toLocaleString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-zinc-600 font-black uppercase mb-0.5">
                            Pendiente
                          </span>
                          <span className="text-xs font-bold text-rose-500/80">
                            RD$ {(r.payrollDue || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="w-px h-6 bg-white/[0.05]" />
                        <div className="flex flex-col">
                          <span className="text-[9px] text-zinc-600 font-black uppercase mb-0.5">
                            Pagado
                          </span>
                          <span className="text-xs font-bold text-emerald-500/80">
                            RD$ {(r.payrollPaid || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex flex-col gap-1.5">
                        <div
                          className={clsx(
                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border w-fit",
                            r.hasDiscrepancy
                              ? "bg-rose-500/10 text-rose-500 border-rose-500/20 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.1)]"
                              : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                          )}
                        >
                          {r.hasDiscrepancy
                            ? "Anomalía de Red"
                            : "Sincronizado"}
                        </div>
                        <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest ml-1">
                          {r.discrepancyType
                            ? r.discrepancyType.replace(/_/g, " ")
                            : "VERIFICADO"}
                        </span>
                      </div>
                    </td>
                    <td className="px-10 py-8 text-right">
                      <button
                        disabled={!r.deviceId}
                        onClick={() => {
                          if (!r.deviceId) return;
                          setSelectedDevice({
                            id: r.deviceId,
                            name: r.driver?.fullName || "Socio Desconocido",
                          });
                          setDrillDownOpen(true);
                        }}
                        className="px-6 py-2.5 bg-white text-black font-black uppercase text-[9px] tracking-widest rounded-xl hover:bg-tad-yellow hover:scale-105 active:scale-95 transition-all shadow-xl opacity-0 group-hover:opacity-100"
                      >
                        Auditar Nodo
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && filteredReports.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-10 py-32 text-center">
                      <div className="flex flex-col items-center gap-4 text-zinc-700">
                        <AlertTriangle className="w-10 h-10" />
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-[0.3em]">
                            {currentReport.total === 0
                              ? "Sin registros en el periodo"
                              : "Sin coincidencias en esta página"}
                          </p>
                          <p className="text-xs font-bold uppercase">
                            {currentReport.total === 0
                              ? "El reporte no contiene registros."
                              : "La búsqueda se limita a la página actual."}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {currentReport && !loading && (
        <nav
          aria-label="Paginación de conciliación"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-300"
        >
          <p aria-live="polite">
            {filteredReports.length} de {currentReport.data.length} filas de la
            página · {currentReport.total} registros del periodo · Página{" "}
            {currentReport.totalPages === 0
              ? "0 de 0"
              : `${page} de ${currentReport.totalPages}`}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={page <= 1 || generating}
              onClick={() => {
                requestRef.current++;
                setReportPage(null);
                setLoading(true);
                setPage((value) => value - 1);
              }}
              className="rounded-lg border border-zinc-700 px-4 py-2 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= currentReport.totalPages || generating}
              onClick={() => {
                requestRef.current++;
                setReportPage(null);
                setLoading(true);
                setPage((value) => value + 1);
              }}
              className="rounded-lg border border-zinc-700 px-4 py-2 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </nav>
      )}

      {/* ── FOOTER PROTOCOL ────────────────────────────────────────────────── */}
      <div className="mt-16 p-12 bg-zinc-900/60 border border-t-4 border-t-tad-yellow rounded-[48px] shadow-2xl relative overflow-hidden group">
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-tad-yellow/5 blur-[100px] rounded-full group-hover:bg-tad-yellow/10 transition-all duration-700" />

        <div className="flex flex-col lg:flex-row items-center gap-12 relative z-10">
          <div className="w-24 h-24 shrink-0 bg-tad-yellow/10 rounded-[32px] flex items-center justify-center border border-tad-yellow/20 shadow-inner">
            <Scale className="w-10 h-10 text-tad-yellow" />
          </div>

          <div className="flex-1 space-y-4 text-center lg:text-left">
            <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">
              Protocolo de Cierre e Integridad
            </h3>
            <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-[0.15em] leading-relaxed max-w-3xl">
              El motor de conciliación TAD detecta automáticamente desconexiones
              prolongadas, falsificación de GPS (GPS Spoofing) y caídas de
              sesión que invalidan la certificación de impactos. Cada registro
              marcado como{" "}
              <span className="text-rose-500 italic">ANOMALÍA</span> debe ser
              auditado manualmente antes del procesamiento de la nómina del
              socio para garantizar la equidad y evitar pérdidas operativas.
            </p>
          </div>

          <div className="flex flex-col gap-3 shrink-0">
            <button className="px-10 py-5 bg-white text-black font-black uppercase text-[11px] tracking-[0.2em] rounded-2xl hover:bg-tad-yellow hover:scale-105 transition-all shadow-2xl">
              Iniciar Cierre Mensual
            </button>
            <p className="text-[8px] text-zinc-700 font-black uppercase tracking-widest text-center">
              Protocolo v12.4.0 active
            </p>
          </div>
        </div>
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
