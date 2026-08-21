import React from 'react';
import { BarChart3, Eye, TrendingUp } from 'lucide-react';

interface MetricsGridProps {
  data?: any;
}

export function MetricsGrid({ data }: MetricsGridProps) {
  const metrics = [
    { icon: Eye, label: 'Impresiones', value: data?.totalImpressions?.toLocaleString() || '0', color: '#FFD400' },
    { icon: TrendingUp, label: 'Completions', value: data?.totalCompletions?.toLocaleString() || '0', color: '#10b981' },
    { icon: BarChart3, label: 'CTR', value: '0.34%', color: '#3b82f6' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {metrics.map((m) => {
        const Icon = m.icon;
        return (
          <div
            key={m.label}
            className="stitched-card group relative space-y-2 overflow-hidden rounded-[2rem] p-8 transition-all duration-300 hover:-translate-y-1 hover:border-white/10"
          >
            <div className="absolute -bottom-4 -right-4 opacity-5 transition-opacity duration-500 group-hover:opacity-[0.14]">
              <Icon className="h-28 w-28" style={{ color: m.color }} />
            </div>
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-black/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-transform duration-300 group-hover:scale-105">
              <Icon
                className="animate-float h-5 w-5"
                style={{ color: m.color, filter: `drop-shadow(0 0 8px ${m.color}66)` }}
              />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">{m.label}</p>
            <h3 className="text-3xl font-black tracking-tight text-white" style={{ textShadow: `0 0 26px ${m.color}30` }}>
              {m.value}
            </h3>
          </div>
        );
      })}
    </div>
  );
}
