import React from 'react';
import { Zap } from 'lucide-react';

export function BudgetSimulator() {
  return (
    <div className="stitched-card space-y-6 rounded-[2rem] p-8 transition-all duration-300 hover:border-white/10">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/5 bg-black/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <Zap className="animate-float h-4 w-4 text-[#FFD400] drop-shadow-[0_0_8px_rgba(255,212,0,0.5)]" />
        </div>
        <h3 className="text-sm font-black uppercase tracking-wider text-white">
          Budget Simulator
        </h3>
      </div>
      <div className="rounded-2xl border border-white/5 bg-black/30 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Recommended Screens</p>
        <p className="text-3xl font-black text-white drop-shadow-[0_0_18px_rgba(255,212,0,0.15)]">—</p>
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
        Budget simulation module pending implementation
      </p>
    </div>
  );
}
