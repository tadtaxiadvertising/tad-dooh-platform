import React from 'react';
import { BarChart3, Eye, TrendingUp } from 'lucide-react';

interface MetricsGridProps {
  data?: any;
}

export function MetricsGrid({ data }: MetricsGridProps) {
  const metrics = [
    { icon: Eye, label: 'Impresiones', value: data?.totalImpressions?.toLocaleString() || '0', color: '#fad400' },
    { icon: TrendingUp, label: 'Completions', value: data?.totalCompletions?.toLocaleString() || '0', color: '#10b981' },
    { icon: BarChart3, label: 'CTR', value: '0.34%', color: '#3b82f6' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {metrics.map((m) => {
        const Icon = m.icon;
        return (
          <div key={m.label} className="bg-zinc-900/40 border border-white/5 p-8 rounded-[2rem] space-y-2 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Icon className="w-24 h-24" />
            </div>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">{m.label}</p>
            <h3 className="text-3xl font-black tracking-tight">{m.value}</h3>
          </div>
        );
      })}
    </div>
  );
}