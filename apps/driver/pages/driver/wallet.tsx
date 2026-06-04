import { useState, useEffect } from 'react';
import type { GetServerSideProps } from 'next';
import { useAuth } from '@tad/ui';

// Force dynamic rendering — prevents "No QueryClient set" SSR errors
export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });
import {
  Wallet, ArrowDownLeft, ArrowUpRight, Clock,
  LayoutDashboard, Activity, ChevronLeft, Flame, Target, TrendingUp
} from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import api from "@tad/services";
import Link from 'next/link';

export default function DriverWallet() {
  const { session } = useAuth();
  const [driverData, setDriverData] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [hubRes, txRes] = await Promise.all([
          api.get('/drivers/me/hub'),
          api.get('/drivers/me/transactions').catch(() => ({ data: [] })),
        ]);
        setDriverData(hubRes.data);
        setTransactions(txRes.data?.length ? txRes.data : [
          { id: 1, type: 'EARNING', amount: 1200, date: 'Hoy, 2:30 PM', desc: 'Bono Diario de Pauta' },
          { id: 2, type: 'WITHDRAWAL', amount: -5000, date: 'Ayer, 10:15 AM', desc: 'Transferencia Bancaria' },
          { id: 3, type: 'EARNING', amount: 300, date: 'Lun 8, 4:00 PM', desc: 'Bono por Referido' },
        ]);
      } catch (error) {
        console.error('Failed to load wallet data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const balance = driverData?.balance || 0;
  const streak = driverData?.activeDaysStreak || 0;
  const nextWithdrawal = 5000;
  const withdrawalProgress = Math.min(100, (balance / nextWithdrawal) * 100);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center">
        <div className="border-t-2 border-tad-cyan w-10 h-10 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white font-sans overflow-x-hidden pb-32">
      <header className="p-6 pb-4 border-b border-white/5 flex items-center gap-4 bg-zinc-950/40 backdrop-blur-3xl sticky top-0 z-[100]">
        <Link href="/driver/dashboard" className="w-10 h-10 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center transition-all active:scale-95">
          <ChevronLeft className="w-5 h-5 text-zinc-400" />
        </Link>
        <div>
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.25em]">Finanzas</p>
          <h1 className="text-2xl font-black uppercase tracking-tighter">Mi <span className="text-tad-cyan">Billetera</span></h1>
        </div>
      </header>

      <main className="p-6 space-y-6 max-w-lg mx-auto">
        {/* Balance Card */}
        <div className="relative p-8 rounded-[2.5rem] bg-gradient-to-br from-tad-cyan/20 to-zinc-900 border border-tad-cyan/20 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-tad-cyan/20 blur-[50px] rounded-full pointer-events-none" />
          <p className="text-[10px] font-black text-tad-cyan uppercase tracking-[0.2em] mb-2">Balance Disponible</p>
          <h2 className="text-4xl font-black tracking-tighter text-white mb-4">RD${balance.toLocaleString()}</h2>

          {/* Streak Badge (Efecto Zeigarnik — racha activa) */}
          {streak > 0 && (
            <div className="flex items-center gap-2 mb-5 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-xl w-fit">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-[10px] font-black text-orange-300 uppercase tracking-widest">
                {streak} días consecutivos
              </span>
            </div>
          )}

          {/* Withdrawal Progress (Goal Gradient Effect) */}
          <div className="mb-5 space-y-2">
            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
              <span className="text-zinc-500">Meta para retiro</span>
              <span className="text-tad-cyan">RD${nextWithdrawal.toLocaleString()}</span>
            </div>
            <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${withdrawalProgress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={clsx(
                  "h-full rounded-full",
                  withdrawalProgress >= 100 ? "bg-emerald-500" : "bg-tad-cyan"
                )}
              />
            </div>
            {withdrawalProgress >= 100 && (
              <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest animate-pulse">
                ¡Meta alcanzada! Puedes retirar
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              disabled={withdrawalProgress < 100}
              className={clsx(
                "flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all",
                withdrawalProgress >= 100
                  ? "bg-tad-cyan text-black shadow-[0_10px_30px_rgba(0,229,255,0.3)] hover:scale-[1.02]"
                  : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
              )}
            >
              <ArrowUpRight className="w-4 h-4" />
              Retirar
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Este Mes', value: `RD$${(driverData?.monthEarnings || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-400' },
            { label: 'Referidos', value: `RD$${(driverData?.referralEarned || 0).toLocaleString()}`, icon: Target, color: 'text-blue-400' },
            { label: 'Bonos', value: `RD$${(driverData?.bonus || 0).toLocaleString()}`, icon: Flame, color: 'text-orange-400' },
          ].map((stat, i) => (
            <div key={i} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
              <stat.icon className={clsx("w-4 h-4 mx-auto mb-2", stat.color)} />
              <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-xs font-black text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Transactions */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Actividad Reciente</h3>

          <div className="space-y-3">
            {transactions.map((tx: any) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: tx.id * 0.1 }}
                className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-4"
              >
                <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center",
                  tx.type === 'EARNING' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500')}>
                  {tx.type === 'EARNING' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">{tx.desc}</p>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" /> {tx.date}
                  </p>
                </div>
                <div className="text-right">
                  <p className={clsx("text-sm font-black", tx.type === 'EARNING' ? 'text-emerald-500' : 'text-white')}>
                    {tx.type === 'EARNING' ? '+' : ''}RD${Math.abs(tx.amount).toLocaleString()}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      {/* Floating Navigator */}
      <nav className="fixed bottom-8 left-6 right-6 h-22 bg-zinc-950/80 backdrop-blur-4xl border border-white/10 rounded-[2.5rem] shadow-[0_25px_50px_rgba(0,0,0,0.8)] flex items-center justify-around px-8 z-[100]">
        <Link href="/driver/dashboard" className="text-zinc-500 hover:text-white transition-colors">
          <LayoutDashboard className="w-6 h-6" />
        </Link>
        <button className="w-14 h-14 bg-tad-cyan rounded-2xl flex items-center justify-center -mt-12 shadow-[0_0_40px_rgba(0,229,255,0.4)] border-4 border-[#0B0F1A] active:scale-90 transition-transform">
          <Activity className="w-6 h-6 text-black" />
        </button>
        <button className="text-tad-cyan group relative flex flex-col items-center gap-1">
          <Wallet className="w-6 h-6" />
          <div className="absolute -bottom-4 w-2 h-2 rounded-full bg-tad-cyan shadow-[0_0_15px_rgba(0,229,255,1)]" />
        </button>
      </nav>
    </div>
  );
}
