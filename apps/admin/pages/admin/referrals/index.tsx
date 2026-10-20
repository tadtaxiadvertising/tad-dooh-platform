import React, { useState, useEffect } from "react";
import Head from "next/head";
import type { GetServerSideProps } from "next";
import {
  Users,
  Award,
  DollarSign,
  TrendingUp,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Link as LinkIcon,
  Filter,
} from "lucide-react";
import { getReferralStats, getReferralNetwork } from "@tad/services";
import { toast } from "sonner";
import clsx from "clsx";
import { AntigravityButton } from "@tad/ui";

export const getServerSideProps: GetServerSideProps = async () => ({
  props: {},
});

export default function ReferralsDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [network, setNetwork] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsData, networkData] = await Promise.all([
        getReferralStats(),
        getReferralNetwork(),
      ]);
      setStats(statsData);
      setNetwork(Array.isArray(networkData) ? networkData : []);
    } catch (error) {
      console.error("Error fetching referral data:", error);
      toast.error("Error al cargar datos de referidos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredNetwork = network.filter(
    (n) =>
      n.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      n.referredByDriver?.fullName
        ?.toLowerCase()
        .includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen pb-20 animate-in fade-in duration-700">
      <Head>
        <title>Referral Network | TAD Terminal</title>
      </Head>

      {/* HEADER */}
      <div className="mb-10 flex flex-col xl:flex-row xl:items-end justify-between gap-8">
        <div>
          <div className="flex items-center gap-3 mb-4 opacity-40">
            <div className="w-8 h-[1px] bg-white" />
            <p className="text-[9px] font-black text-white uppercase tracking-[0.5em]">
              Growth / Referral Engine
            </p>
          </div>
          <h1 className="text-5xl lg:text-6xl font-black tracking-tighter text-white uppercase italic flex items-center gap-4">
            NETWORK{" "}
            <span className="text-tad-yellow italic underline decoration-zinc-800">
              EXPANSION
            </span>
          </h1>
          <p className="text-zinc-500 mt-4 font-bold uppercase text-[10px] tracking-widest max-w-xl leading-relaxed">
            Gestión del programa de referidos. Monitoreo de comisiones, top
            reclutadores y linaje de afiliación de flota.
          </p>
        </div>

        <div className="flex gap-3">
          <AntigravityButton
            onAsyncClick={fetchData}
            variant="secondary"
            actionName="refresh_referrals"
          >
            Actualizar Datos
          </AntigravityButton>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <StatCard
          label="Total Referidos"
          value={stats?.totalReferrals || 0}
          icon={Users}
          highlight={true}
        />
        <StatCard
          label="Comisiones Pendientes"
          value={`RD$ ${(stats?.pendingCommissions || 0).toLocaleString()}`}
          icon={DollarSign}
          alert={(stats?.pendingCommissions || 0) > 10000}
        />
        <StatCard
          label="Reclutadores Activos"
          value={stats?.topRecruiters?.length || 0}
          icon={TrendingUp}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COL: Top Recruiters */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8">
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
              <Award className="w-4 h-4 text-tad-yellow" />
              Top Reclutadores
            </h3>

            <div className="space-y-4">
              {loading ? (
                Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <div
                      key={i}
                      className="h-12 bg-white/5 animate-pulse rounded-xl"
                    />
                  ))
              ) : stats?.topRecruiters?.length > 0 ? (
                stats.topRecruiters.map((recruiter: any, idx: number) => (
                  <div
                    key={recruiter.id}
                    className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-tad-yellow/10 flex items-center justify-center border border-tad-yellow/20">
                        <span className="text-tad-yellow font-black text-xs">
                          {idx + 1}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white tracking-tight">
                          {recruiter.fullName}
                        </p>
                        <p className="text-[9px] text-zinc-500 uppercase font-mono">
                          {recruiter.referralCode?.substring(0, 8)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black italic text-emerald-400">
                        {recruiter._count?.referrals || 0}
                      </p>
                      <p className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold">
                        Referidos
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-zinc-500 text-xs font-bold uppercase tracking-widest">
                  Sin datos suficientes
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COL: Network Tree Table */}
        <div className="lg:col-span-2">
          <div className="bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="relative group flex-1 max-w-xl">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-tad-yellow transition-all" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="BUSCAR SOCIO O RECLUTADOR..."
                  className="w-full bg-black/40 border border-white/[0.05] rounded-2xl py-4 pl-14 pr-6 text-[10px] font-bold uppercase tracking-[0.2em] outline-none focus:border-tad-yellow/30 transition-all text-white"
                />
              </div>
              <button className="p-4 bg-white/5 text-zinc-400 rounded-xl hover:bg-white/10 transition-all border border-white/5">
                <Filter className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto min-h-[400px]">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tad-yellow"></div>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/5">
                      <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                        Socio Referido
                      </th>
                      <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                        Reclutado Por
                      </th>
                      <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                        Fecha Ingreso
                      </th>
                      <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                        Status Socio
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {filteredNetwork.map((node) => (
                      <tr
                        key={node.id}
                        className="hover:bg-white/[0.01] group transition-all"
                      >
                        <td className="px-8 py-6">
                          <p className="text-xs font-black text-white uppercase tracking-tight italic">
                            {node.fullName || "Desconocido"}
                          </p>
                          <p className="text-[9px] text-zinc-500 font-bold uppercase mt-1">
                            ID: {node.id.substring(0, 8)}
                          </p>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                            <LinkIcon className="w-3 h-3 text-tad-yellow" />
                            <span className="text-xs font-bold text-zinc-300 uppercase">
                              {node.referredByDriver?.fullName || "Desconocido"}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2 text-zinc-400">
                            <Clock className="w-3 h-3" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">
                              {new Date(node.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span
                            className={clsx(
                              "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border w-fit inline-flex items-center gap-1",
                              node.status === "OPERATIVO" ||
                                node.status === "ACTIVE"
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-500 border-rose-500/20",
                            )}
                          >
                            {node.status === "OPERATIVO" ||
                            node.status === "ACTIVE" ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <AlertTriangle className="w-3 h-3" />
                            )}
                            {node.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredNetwork.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-8 py-20 text-center">
                          <Users className="w-8 h-8 text-zinc-700 mx-auto mb-4" />
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                            No hay referidos en la red
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, highlight, alert }: any) {
  return (
    <div
      className={clsx(
        "bg-zinc-900/60 border p-8 rounded-[32px] relative group overflow-hidden transition-all",
        highlight
          ? "border-tad-yellow/30 shadow-[0_0_30px_rgba(250,212,0,0.05)]"
          : "border-white/5",
        alert && "border-rose-500/30",
      )}
    >
      <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon className="w-20 h-20 text-white" />
      </div>
      <div className="flex items-center gap-3 mb-6">
        <div
          className={clsx(
            "p-3 rounded-xl border transition-colors",
            highlight
              ? "bg-tad-yellow/10 border-tad-yellow/20 text-tad-yellow"
              : alert
                ? "bg-rose-500/10 border-rose-500/20 text-rose-500"
                : "bg-white/5 border-white/5 text-zinc-500 group-hover:text-white",
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
          {label}
        </span>
      </div>
      <div className="flex items-end justify-between">
        <h2
          className={clsx(
            "text-4xl font-black tracking-tighter italic",
            alert ? "text-rose-400" : "text-white",
          )}
        >
          {value}
        </h2>
      </div>
    </div>
  );
}
