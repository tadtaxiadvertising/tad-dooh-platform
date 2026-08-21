import React from 'react';
import { CreditCard } from 'lucide-react';

interface BillingPortalProps {
  data?: any;
}

export function BillingPortal({ data }: BillingPortalProps) {
  return (
    <div className="stitched-card space-y-8 rounded-3xl p-10 transition-all duration-300 hover:border-white/10">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/5 bg-black/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <CreditCard className="animate-float h-4 w-4 text-[#FFD400] drop-shadow-[0_0_8px_rgba(255,212,0,0.5)]" />
        </div>
        <h3 className="text-lg font-black uppercase tracking-tight text-white">
          Billing & Finance
        </h3>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-white/5 bg-black/30 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-colors hover:border-[#FFD400]/20">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Balance</p>
          <p className="text-3xl font-black text-white drop-shadow-[0_0_18px_rgba(255,212,0,0.15)]">
            RD$ {data?.balance?.toLocaleString() || '0.00'}
          </p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-black/30 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-colors hover:border-emerald-500/20">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Next Invoice</p>
          <p className="text-3xl font-black text-emerald-500 drop-shadow-[0_0_18px_rgba(16,185,129,0.25)]">Al Día</p>
        </div>
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
        Full billing portal module pending implementation
      </p>
    </div>
  );
}
