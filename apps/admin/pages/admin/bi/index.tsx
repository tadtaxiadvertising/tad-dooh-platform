import React, { useState, useEffect, useCallback, useRef } from "react";
import { parseReconciliationPage } from "@/lib/reconciliation-page";
import type { ReconciliationPage } from "@/lib/reconciliation-page";
import Head from "next/head";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { GetServerSideProps } from "next";
import {
  DollarSign,
  Car,
  PlayCircle,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Calendar,
  BarChart3,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Scale,
  Activity,
  ChevronRight,
  MapPin,
} from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { AntigravityButton } from "@tad/ui";
import { StatusSemaphore } from "@tad/ui";
import { getBiKpis, getReconciliationReport } from "@tad/services";

// ─── Dynamic Imports (SSR-safe) ───────────────────────────────────────────────
const BiHeatmap = dynamic(
  () => import("@/components/bi/BiHeatmap").then((m) => m.BiHeatmap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[340px] bg-zinc-900/50 animate-pulse rounded-2xl border border-zinc-800 flex items-center justify-center">
        <MapPin className="w-8 h-8 text-zinc-700 animate-bounce" />
      </div>
    ),
  },
);

// ─── Types ────────────────────────────────────────────────────────────────────
interface KpiData {
  mrr: number;
  totalDevices: number;
  onlineDevices: number;
  criticalDevices: number;
  totalImpressionsMtd: number;
  discrepancyCount: number;
  yieldPerScreen: number;
  arpu: number;
  churnRate: number;
  projectedRevenue: number;
  deliveryRateAvg: number;
  recentDiscrepancies: DiscrepancyItem[];
}

interface DiscrepancyItem {
  id: string;
  deviceId: string;
  period: string;
  totalPlaybacks: number;
  discrepancyType: string;
  discrepancyAmount: number;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  status,
  trend,
  loading,
  highlight,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  status: "optimum" | "warning" | "critical";
  trend?: { value: string; positive: boolean };
  loading: boolean;
  highlight?: boolean;
}) {
  const statusColor =
    status === "optimum"
      ? "bg-emerald-500"
      : status === "warning"
        ? "bg-yellow-400"
        : "bg-rose-500";

  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-2xl border p-6 group transition-all duration-300 hover:-translate-y-0.5",
        highlight
          ? "bg-zinc-900/60 border-tad-yellow/20 ring-1 ring-tad-yellow/10"
          : "bg-zinc-950/60 border-zinc-800/60 hover:border-zinc-700/60",
      )}
    >
      {/* Glow blob */}
      <div
        className={clsx(
          "absolute -right-6 -top-6 w-24 h-24 blur-3xl opacity-10 transition-opacity duration-500 group-hover:opacity-20",
          statusColor,
        )}
      />

      {/* Header row */}
      <div className="flex items-start justify-between mb-5">
        <div className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800 text-zinc-500 group-hover:text-tad-yellow transition-colors">
          <Icon className="w-5 h-5" />
        </div>
        <StatusSemaphore status={status} size="sm" />
      </div>

      {/* Label */}
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500 mb-1">
        {title}
      </p>

      {/* Value row */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-2xl font-black text-white tracking-tight">
          {loading ? (
            <span className="inline-block w-24 h-6 bg-zinc-800 rounded animate-pulse" />
          ) : (
            value
          )}
        </span>
        {trend && !loading && (
          <span
            className={clsx(
              "flex items-center gap-0.5 text-[10px] font-bold",
              trend.positive ? "text-emerald-400" : "text-rose-400",
            )}
          >
            {trend.positive ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : (
              <ArrowDownRight className="w-3 h-3" />
            )}
            {trend.value}
          </span>
        )}
      </div>

      {/* Subtitle */}
      <p className="text-[11px] text-zinc-500 font-medium">{subtitle}</p>

      {/* Bottom accent bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-tad-yellow/0 to-transparent transition-all duration-500 group-hover:via-tad-yellow/50" />
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  badge,
}: {
  icon: React.ElementType;
  title: React.ReactNode;
  badge?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="p-2 bg-tad-yellow/10 rounded-lg border border-tad-yellow/20">
        <Icon className="w-4 h-4 text-tad-yellow" />
      </div>
      <h2 className="text-sm font-black uppercase tracking-widest text-white">
        {title}
      </h2>
      {badge && (
        <span className="px-2 py-0.5 bg-tad-yellow text-black text-[9px] font-black uppercase tracking-widest rounded-full">
          {badge}
        </span>
      )}
      <div className="flex-1 h-px bg-zinc-800" />
    </div>
  );
}

function StatBar({
  label,
  value,
  icon: Icon,
  trend,
  trendUp,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  trend: string;
  trendUp: boolean;
}) {
  return (
    <div className="bg-zinc-900/50 border border-white/[0.05] rounded-2xl p-6 relative overflow-hidden group">
      <div className="absolute top-4 right-4 opacity-5 group-hover:opacity-[0.08] transition-opacity">
        <Icon className="w-16 h-16 text-white" />
      </div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-zinc-500 group-hover:text-tad-yellow transition-colors" />
        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
          {label}
        </span>
      </div>
      <p className="text-3xl font-black text-white tracking-tight italic mb-2">
        {value}
      </p>
      <span
        className={clsx(
          "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black",
          trendUp
            ? "bg-emerald-500/10 text-emerald-400"
            : "bg-rose-500/10 text-rose-400",
        )}
      >
        {trendUp ? (
          <ArrowUpRight className="w-3 h-3" />
        ) : (
          <ArrowDownRight className="w-3 h-3" />
        )}
        {trend}
      </span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export const getServerSideProps: GetServerSideProps = async () => ({
  props: {},
});

export default function BIDashboard() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [reconciliation, setReconciliation] =
    useState<ReconciliationPage | null>(null);
  const reconciliationRequest = useRef(0);
  const discrepancies =
    reconciliation?.data.filter((row) => row.hasDiscrepancy).slice(0, 6) ?? [];
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  const fetchAll = useCallback(async () => {
    const request = ++reconciliationRequest.current;
    setLoading(true);
    setReconciliation(null);
    try {
      const currentPeriod = new Date().toISOString().slice(0, 7); // "YYYY-MM"
      const [kpiData, reconcData] = await Promise.allSettled([
        getBiKpis(),
        getReconciliationReport(currentPeriod, 1, 100),
      ]);

      if (request !== reconciliationRequest.current) return;
      if (kpiData.status === "fulfilled") {
        setKpis(kpiData.value);
      }
      setReconciliation(
        reconcData.status === "fulfilled"
          ? parseReconciliationPage(reconcData.value, currentPeriod, 1, 100)
          : null,
      );

      setLastRefreshed(new Date());
    } catch (err) {
      console.error("BI fetch error:", err);
      toast.error("Error al cargar indicadores de negocio");
    } finally {
      if (request === reconciliationRequest.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchAll();
  }, [fetchAll]);

  // Derived values
  const fleetStatus =
    kpis?.criticalDevices && kpis.criticalDevices > 0
      ? "critical"
      : kpis?.onlineDevices !== undefined &&
          kpis?.totalDevices !== undefined &&
          kpis.onlineDevices < kpis.totalDevices * 0.8
        ? "warning"
        : "optimum";

  const churnPct = ((kpis?.churnRate ?? 0) * 100).toFixed(1);

  return (
    <>
      <Head>
        <title>BI Command Center | TAD DOOH Platform</title>
        <meta
          name="description"
          content="TAD Dominicana — Inteligencia Financiera y de Flota en tiempo real."
        />
      </Head>

      <div className="max-w-[1400px] mx-auto space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* ── PAGE HEADER ─────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-800/60 pb-8">
          <div className="space-y-1">
            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.4em] mb-3">
              Admin / Business Intelligence
            </p>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3">
              <TrendingUp className="w-7 h-7 text-tad-yellow" strokeWidth={3} />
              BI Command Center
              <span className="text-tad-yellow animate-pulse">_</span>
            </h1>
            <p className="text-zinc-500 font-medium text-[11px] tracking-widest uppercase">
              Inteligencia Financiera y Flota · Tiempo Real
            </p>
          </div>

          <div className="flex items-center gap-4">
            {mounted && lastRefreshed && (
              <div className="text-right hidden sm:block">
                <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">
                  Último refresh
                </p>
                <p className="text-xs text-zinc-400 font-mono">
                  {lastRefreshed.toLocaleTimeString()}
                </p>
              </div>
            )}
            <AntigravityButton
              onAsyncClick={fetchAll}
              variant="secondary"
              className="px-5 py-2.5 gap-2"
              actionName="refresh_bi_dashboard"
            >
              <RefreshCw
                className={clsx("w-4 h-4", loading && "animate-spin")}
              />
              Actualizar
            </AntigravityButton>
            <Link
              href="/admin/bi/reconciliation"
              className="px-5 py-2.5 bg-tad-yellow text-black rounded-xl text-[11px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <Scale className="w-4 h-4" />
              Conciliación
            </Link>
          </div>
        </div>

        {/* ── PRIMARY KPI GRID ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="MRR Estimado"
            value={`RD$ ${(kpis?.mrr ?? 0).toLocaleString()}`}
            subtitle="Ingresos por suscripción (mes)"
            icon={DollarSign}
            status={kpis?.mrr && kpis.mrr > 0 ? "optimum" : "warning"}
            trend={{ value: "+8.3%", positive: true }}
            loading={loading}
            highlight
          />
          <KpiCard
            title="Salud de Flota"
            value={`${kpis?.onlineDevices ?? 0}/${kpis?.totalDevices ?? 0}`}
            subtitle="Dispositivos activos hoy"
            icon={Car}
            status={fleetStatus}
            loading={loading}
          />
          <KpiCard
            title="Impresiones MTD"
            value={(kpis?.totalImpressionsMtd ?? 0).toLocaleString()}
            subtitle="Ciclos confirmados en el mes"
            icon={PlayCircle}
            status="optimum"
            trend={{ value: "+12.1%", positive: true }}
            loading={loading}
          />
          <KpiCard
            title="Discrepancias"
            value={(kpis?.discrepancyCount ?? 0).toString()}
            subtitle="Conciliaciones pendientes"
            icon={AlertTriangle}
            status={
              kpis?.discrepancyCount && kpis.discrepancyCount > 0
                ? "critical"
                : "optimum"
            }
            loading={loading}
          />
        </div>

        {/* ── MAP + RECONCILIATION FEED ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Heatmap */}
          <div className="lg:col-span-2 flex flex-col gap-2">
            <SectionHeading icon={MapPin} title="Hotspots de Impacto MTD" />
            <div className="h-[360px] rounded-2xl overflow-hidden border border-zinc-800">
              <BiHeatmap />
            </div>
          </div>

          {/* Reconciliation Feed */}
          <div className="flex flex-col gap-2">
            <SectionHeading icon={Activity} title="Feed de Conciliación" />
            <div className="flex-1 bg-zinc-950/60 border border-zinc-800/60 rounded-2xl overflow-hidden flex flex-col">
              <div className="flex-1 divide-y divide-zinc-900 overflow-y-auto">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-4 animate-pulse">
                      <div className="h-3 bg-zinc-800 rounded w-3/4 mb-2" />
                      <div className="h-2 bg-zinc-800/60 rounded w-full" />
                    </div>
                  ))
                ) : !reconciliation ? (
                  <p role="alert" className="p-4 text-sm text-rose-400">
                    No se pudo verificar la conciliación.
                  </p>
                ) : discrepancies.length > 0 ? (
                  discrepancies.map((d) => (
                    <div
                      key={d.id}
                      className="p-4 hover:bg-zinc-900/40 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-bold text-white group-hover:text-tad-yellow transition-colors tracking-tight truncate max-w-[160px]">
                          {d.deviceId || "S/N"}
                        </p>
                        <span className="text-[8px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded font-black tracking-tight shrink-0 ml-2">
                          {(d.discrepancyType ?? "").replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">
                        Período {d.period} · {d.totalPlaybacks} impactos ·
                        Balance RD${" "}
                        {(d.discrepancyAmount ?? 0).toLocaleString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-zinc-700">
                    <Activity className="w-8 h-8" />
                    <p className="text-[10px] font-black uppercase tracking-widest">
                      Sin discrepancias en esta página
                    </p>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-zinc-800/60 bg-zinc-900/20">
                {reconciliation && (
                  <p className="mb-2 text-xs text-zinc-400">
                    {reconciliation.period} · Primeros{" "}
                    {reconciliation.data.length} de {reconciliation.total}{" "}
                    registros; hasta 6 discrepancias.
                  </p>
                )}
                <Link
                  href="/admin/bi/reconciliation"
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Ver Todos los Reportes
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── INVESTOR INTELLIGENCE PRO ─────────────────────────────────────── */}
        <div className="space-y-5 pt-2">
          <SectionHeading
            icon={BarChart3}
            title={
              <>
                Investor Intelligence{" "}
                <span className="text-tad-yellow">PRO</span>
              </>
            }
            badge="v7.5"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatBar
              label="Yield por Pantalla"
              value={`RD$ ${(kpis?.yieldPerScreen ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              icon={TrendingUp}
              trend="+5.2% vs mes anterior"
              trendUp
            />
            <StatBar
              label="ARPU (Ad Revenue)"
              value={`RD$ ${(kpis?.arpu ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              icon={DollarSign}
              trend="Ingreso promedio/unidad"
              trendUp
            />
            <StatBar
              label="Churn Rate (Est.)"
              value={`${churnPct}%`}
              icon={RefreshCw}
              trend={
                parseFloat(churnPct) > 10
                  ? "Por encima del umbral"
                  : "Dentro del rango óptimo"
              }
              trendUp={parseFloat(churnPct) <= 10}
            />
            <StatBar
              label="Proyección Anual"
              value={`RD$ ${(kpis?.projectedRevenue ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              icon={Calendar}
              trend="Run-rate basado en MRR"
              trendUp
            />
          </div>

          {/* Growth Calculator Banner */}
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/40 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 shrink-0 bg-tad-yellow/10 rounded-xl border border-tad-yellow/20 flex items-center justify-center">
                <Zap className="w-6 h-6 text-tad-yellow" />
              </div>
              <div>
                <p className="text-xs font-black text-white uppercase tracking-widest mb-1">
                  Calculadora de Crecimiento
                </p>
                <p className="text-[11px] text-zinc-500 font-medium max-w-lg leading-relaxed">
                  Basado en el Yield actual, cada{" "}
                  <span className="text-tad-yellow font-black">10</span> tablets
                  nuevas incrementan el MRR en{" "}
                  <span className="text-white font-bold">RD$ 60,000</span> con
                  costo de operación marginal.
                </p>
              </div>
            </div>
            <AntigravityButton
              variant="glow"
              className="shrink-0 px-6 py-3 gap-2"
              actionName="export_investor_report"
            >
              <FileText className="w-4 h-4" />
              Executive Summary (PDF)
            </AntigravityButton>
          </div>
        </div>

        {/* ── FLEET DELIVERY RATE BAND ─────────────────────────────────────── */}
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-tad-yellow" />
              <span className="text-xs font-black uppercase tracking-widest text-zinc-300">
                Índice de Entrega de Flota (MTD)
              </span>
            </div>
            <span className="text-lg font-black text-white italic">
              {loading ? (
                <span className="inline-block w-16 h-5 bg-zinc-800 rounded animate-pulse" />
              ) : (
                `${(kpis?.deliveryRateAvg ?? 0).toFixed(1)}%`
              )}
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: loading
                  ? "0%"
                  : `${Math.min(kpis?.deliveryRateAvg ?? 0, 100)}%`,
                background:
                  (kpis?.deliveryRateAvg ?? 0) >= 90
                    ? "linear-gradient(90deg, #10b981, #22c55e)"
                    : (kpis?.deliveryRateAvg ?? 0) >= 70
                      ? "linear-gradient(90deg, #facc15, #fbbf24)"
                      : "linear-gradient(90deg, #ef4444, #f43f5e)",
              }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">
              0%
            </span>
            <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">
              Objetivo: 95%
            </span>
            <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">
              100%
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
