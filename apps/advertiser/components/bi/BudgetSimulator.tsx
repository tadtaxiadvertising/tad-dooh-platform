import React from 'react';
import { Zap } from 'lucide-react';

export function BudgetSimulator() {
  return (
    <div className="bg-zinc-900/30 border border-white/5 rounded-[2rem] p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Zap className="text-[#fad400] w-5 h-5" />
        <h3 className="text-sm font-black uppercase tracking-wider text-white">
          Budget Simulator
        </h3>
      </div>
      <div className="bg-black/40 p-6 rounded-2xl border border-white/[0.02]">
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-2">Recommended Screens</p>
        <p className="text-2xl font-black text-white">—</p>
      </div>
      <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">
        Budget simulation module pending implementation
      </p>
    </div>
  );
}