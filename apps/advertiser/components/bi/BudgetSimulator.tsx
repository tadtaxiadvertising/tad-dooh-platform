import React from "react";
import { Zap } from "lucide-react";

export function BudgetSimulator() {
  return (
    <section
      aria-label="Budget Simulator"
      className="space-y-5 rounded-3xl border border-white/[0.06] bg-gradient-to-b from-white/[0.05] to-transparent p-6 backdrop-blur-sm transition-all duration-300 hover:border-white/[0.12]"
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-black/30">
          <Zap
            className="animate-float h-4 w-4 text-[#FFD400]"
            style={{ filter: "drop-shadow(0 0 8px rgba(255,212,0,0.5))" }}
          />
        </span>
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-300">
          Budget Simulator
        </h3>
      </div>

      <div className="rounded-2xl border border-white/[0.15] bg-black/20 p-5">
        <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-neutral-500">
          Recommended Screens
        </p>
        <p className="font-mono text-4xl font-black leading-none tracking-tighter text-white">
          —
        </p>
      </div>

      <div className="w-full" aria-hidden="true">
        <div className="h-3 w-full overflow-hidden rounded-sm border border-neutral-800 bg-neutral-900">
          <div className="h-full w-0 bg-[#FFD400] transition-all duration-700 ease-out" />
        </div>
      </div>

      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">
        Budget simulation module pending implementation
      </p>
    </section>
  );
}
