import React from 'react';

export interface WalletState {
  ads: number;
  referredDrivers: number;
  total: number;
  isOffline: boolean;
}

interface DriverWalletCardProps {
  wallet: WalletState;
}

export const PAY_PER_UNIT_RD = 500;

export function calculateWalletTotal(ads: number, referredDrivers: number = 0): number {
  return (ads * PAY_PER_UNIT_RD) + (referredDrivers * PAY_PER_UNIT_RD);
}

export function DriverWalletCardSkeleton() {
  return (
    <section className="rounded-3xl border border-white/20 bg-white/10 backdrop-blur-md p-5 animate-pulse" aria-hidden="true">
      <div className="h-3 w-24 rounded bg-white/20" />
      <div className="mt-4 h-10 w-48 rounded bg-white/20" />
      <div className="mt-6 grid grid-cols-2 gap-2">
        <div className="h-16 rounded-2xl bg-white/10" />
        <div className="h-16 rounded-2xl bg-white/10" />
      </div>
    </section>
  );
}

export function DriverWalletCard({ wallet }: DriverWalletCardProps) {
  return (
    <section className="rounded-3xl border border-white/20 bg-white/10 backdrop-blur-md p-5 shadow-[0_10px_40px_rgba(0,0,0,0.25)] transition-all duration-300 hover:scale-[1.02]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-300">Driver Wallet</p>
        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${wallet.isOffline ? 'text-amber-300' : 'text-emerald-300'}`}>
          {wallet.isOffline ? 'Offline cache' : 'Live sync'}
        </span>
      </div>

      <p className="mt-3 text-4xl font-black tracking-tight text-white">RD${wallet.total.toLocaleString('es-DO')}</p>
      <p className="mt-1 text-xs text-zinc-300">Total = (Ads × 500) + (Conductores × 500)</p>

      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/15 bg-black/20 p-3">
          <p className="text-[10px] uppercase tracking-wider text-zinc-400">Ads Activos</p>
          <p className="text-xl font-black text-white">{wallet.ads}</p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-black/20 p-3">
          <p className="text-[10px] uppercase tracking-wider text-zinc-400">Ref. Conductores</p>
          <p className="text-xl font-black text-white">{wallet.referredDrivers}</p>
        </div>
      </div>
    </section>
  );
}
