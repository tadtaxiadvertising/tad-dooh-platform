// apps/driver/components/dashboard/WalletTab.tsx
/**
 * WalletTab — Vista de Billetera V12 (migrada de /driver/wallet)
 *
 * Contenido reutilizable: balance, racha, meta de retiro, stats rápidas,
 * transacciones recientes.
 *
 * Usa los datos del hub (useDriverHub) que ya están disponibles en el shell.
 * No monta su propio useTelemetry ni useDriverHub.
 */
"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Flame,
  Target,
  TrendingUp,
} from "lucide-react";
import clsx from "clsx";
import api from "@tad/services";
import type { DriverHubData } from "../../hooks/useDriverHub";
import type { WalletState } from "./DriverWalletCard";

interface WalletTabProps {
  connectionStatus?: "online" | "offline" | "syncing";
  hubData: DriverHubData | null;
  walletState: WalletState | null;
  isLocalMode: boolean;
}

export const WalletTab: React.FC<WalletTabProps> = ({
  hubData,
  walletState,
  isLocalMode,
}) => {
  const [transactions, setTransactions] = useState<
    { id: number; type: string; amount: number; date: string; desc: string }[]
  >([]);
  const [txLoading, setTxLoading] = useState(true);

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const txRes = await api
          .get("/drivers/me/transactions")
          .catch(() => ({ data: [] }));
        setTransactions(
          txRes.data?.length
            ? txRes.data
            : [
                {
                  id: 1,
                  type: "EARNING",
                  amount: 1200,
                  date: "Hoy, 2:30 PM",
                  desc: "Bono Diario de Pauta",
                },
                {
                  id: 2,
                  type: "WITHDRAWAL",
                  amount: -5000,
                  date: "Ayer, 10:15 AM",
                  desc: "Transferencia Bancaria",
                },
                {
                  id: 3,
                  type: "EARNING",
                  amount: 300,
                  date: "Lun 8, 4:00 PM",
                  desc: "Bono por Referido",
                },
              ],
        );
      } catch {
        setTransactions([]);
      } finally {
        setTxLoading(false);
      }
    };
    loadTransactions();
  }, []);

  const balance = hubData?.balance ?? walletState?.total ?? 0;
  const nextWithdrawal = 5000;
  const withdrawalProgress = Math.min(100, (balance / nextWithdrawal) * 100);
  const streak =
    (hubData as { activeDaysStreak?: number })?.activeDaysStreak || 0;

  return (
    <section aria-labelledby="wallet-tab-title" className="space-y-5">
      {/* Title */}
      <div>
        <h2
          id="wallet-tab-title"
          className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500"
        >
          Finanzas
        </h2>
        <p className="mt-1 text-base font-bold text-zinc-300">Mi Billetera</p>
      </div>

      {/* Offline banner */}
      {isLocalMode && (
        <div className="rounded-2xl border border-amber-300/40 bg-amber-500/10 px-4 py-3">
          <p className="text-xs font-black tracking-wide text-amber-200">
            ⚠️ Mostrando datos en caché (modo local)
          </p>
        </div>
      )}

      {/* Balance Card */}
      <div className="relative rounded-[2.5rem] border border-[#FFD400]/15 bg-gradient-to-br from-[#FFD400]/[0.06] to-zinc-950 p-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD400]/15 blur-[50px] rounded-full pointer-events-none" />
        <p className="relative text-[10px] font-black uppercase tracking-[0.2em] text-[#FFD400] mb-2">
          Balance Disponible
        </p>
        <h2 className="relative text-4xl font-black tracking-tighter text-white mb-4">
          RD${balance.toLocaleString()}
        </h2>

        {/* Streak Badge */}
        {streak > 0 && (
          <div className="relative flex items-center gap-2 mb-5 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-xl w-fit">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-[10px] font-black text-orange-300 uppercase tracking-widest">
              {streak} días consecutivos
            </span>
          </div>
        )}

        {/* Withdrawal Progress */}
        <div className="relative mb-5 space-y-2">
          <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
            <span className="text-zinc-500">Meta para retiro</span>
            <span className="text-[#FFD400]">
              RD${nextWithdrawal.toLocaleString()}
            </span>
          </div>
          <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${withdrawalProgress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={clsx(
                "h-full rounded-full",
                withdrawalProgress >= 100 ? "bg-emerald-500" : "bg-[#FFD400]",
              )}
            />
          </div>
          {withdrawalProgress >= 100 && (
            <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest animate-pulse">
              ¡Meta alcanzada! Puedes retirar
            </p>
          )}
        </div>

        {/* Withdraw Button */}
        <button
          disabled={withdrawalProgress < 100}
          className={clsx(
            "relative flex-1 py-4 px-5 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all w-full",
            withdrawalProgress >= 100
              ? "bg-[#FFD400] text-black shadow-[0_10px_30px_rgba(255,212,0,0.2)] hover:scale-[1.02] active:scale-95"
              : "bg-zinc-800 text-zinc-600 cursor-not-allowed",
          )}
        >
          <ArrowUpRight className="w-4 h-4" />
          Retirar
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Este Mes",
            value: `RD$${(hubData?.projectedEarnings || 0).toLocaleString()}`,
            icon: TrendingUp,
            color: "text-emerald-400",
          },
          {
            label: "Referidos",
            value: `RD$${((walletState?.referredDrivers ?? 0) * 500).toLocaleString()}`,
            icon: Target,
            color: "text-blue-400",
          },
          {
            label: "Bonos",
            value: `RD$${(walletState?.total || 0).toLocaleString()}`,
            icon: Flame,
            color: "text-orange-400",
          },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center"
            >
              <Icon className={clsx("w-4 h-4 mx-auto mb-2", stat.color)} />
              <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">
                {stat.label}
              </p>
              <p className="text-xs font-black text-white">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Transactions */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">
          Actividad Reciente
        </h3>

        {txLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-4 animate-pulse"
              >
                <div className="w-12 h-12 rounded-xl bg-white/5" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 bg-white/5 rounded" />
                  <div className="h-2 w-20 bg-white/5 rounded" />
                </div>
                <div className="h-4 w-16 bg-white/5 rounded" />
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-center">
            <p className="text-sm font-bold text-zinc-500">
              No hay transacciones recientes
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: tx.id * 0.1 }}
                className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-4"
              >
                <div
                  className={clsx(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    tx.type === "EARNING"
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-rose-500/10 text-rose-500",
                  )}
                >
                  {tx.type === "EARNING" ? (
                    <ArrowDownLeft className="w-5 h-5" />
                  ) : (
                    <ArrowUpRight className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">{tx.desc}</p>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" /> {tx.date}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={clsx(
                      "text-sm font-black",
                      tx.type === "EARNING" ? "text-emerald-500" : "text-white",
                    )}
                  >
                    {tx.type === "EARNING" ? "+" : ""}RD$
                    {Math.abs(tx.amount).toLocaleString()}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default WalletTab;
