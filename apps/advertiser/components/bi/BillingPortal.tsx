import React from 'react';
import { CreditCard } from 'lucide-react';

interface BillingPortalProps {
  data?: any;
}

export function BillingPortal({ data }: BillingPortalProps) {
  return (
    <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-10 space-y-8">
      <div className="flex items-center gap-3">
        <CreditCard className="text-[#fad400] w-5 h-5" />
        <h3 className="text-lg font-black uppercase tracking-tight text-white">
          Billing & Finance
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-black/40 p-6 rounded-2xl border border-white/[0.02]">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-2">Balance</p>
          <p className="text-2xl font-black text-white">RD$ {data?.balance?.toLocaleString() || '0.00'}</p>
        </div>
        <div className="bg-black/40 p-6 rounded-2xl border border-white/[0.02]">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-2">Next Invoice</p>
          <p className="text-2xl font-black text-emerald-500">Al Día</p>
        </div>
      </div>
      <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">
        Full billing portal module pending implementation
      </p>
    </div>
  );
}