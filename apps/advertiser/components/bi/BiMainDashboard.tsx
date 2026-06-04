import React from 'react';
import { LayoutDashboard } from 'lucide-react';

export function BiMainDashboard() {
  return (
    <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-10 space-y-8">
      <div className="flex items-center gap-3">
        <LayoutDashboard className="text-[#fad400] w-5 h-5" />
        <h3 className="text-lg font-black uppercase tracking-tight text-white">
          Business Intelligence Dashboard
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Impresiones', value: '124,500' },
          { label: 'Completions', value: '118,000' },
          { label: 'Scans', value: '430' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-black/40 p-6 rounded-2xl border border-white/[0.02]">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-2">{kpi.label}</p>
            <p className="text-2xl font-black text-white">{kpi.value}</p>
          </div>
        ))}
      </div>
      <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">
        Full BI dashboard module pending implementation
      </p>
    </div>
  );
}