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
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6 mb-8">
      {metrics.map((m) => {
        const Icon = m.icon;
        return (
          <section
            key={m.label}
            aria-label={m.label}
            className="group relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-b from-white/[0.05] to-transparent p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.12]"
          >
            {/* Watermark */}
            <div
              className="pointer-events-none absolute -bottom-5 -right-5 opacity-[0.04] transition-opacity duration-500 group-hover:opacity-[0.1]"
              aria-hidden="true"
            >
              <Icon className="h-32 w-32" style={{ color: m.color }} />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">{m.label}</p>
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-black/30"
                aria-hidden="true"
              >
                <Icon
                  className="animate-float h-4 w-4"
                  style={{ color: m.color, filter: `drop-shadow(0 0 8px ${m.color}55)` }}
                />
              </span>
            </div>

            <p
              className="mt-3 font-mono font-black leading-none tracking-tighter text-white"
              style={{
                fontSize: 'clamp(2rem, 4vw, 2.75rem)',
                textShadow: `0 0 28px ${m.color}26`,
              }}
            >
              {m.value}
            </p>

            {/* Hairline de acento */}
            <div className="mt-4 flex gap-1" aria-hidden="true">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="h-1 flex-1 rounded-full transition-colors duration-300"
                  style={{ backgroundColor: i === 0 ? m.color : 'rgba(255,255,255,0.06)' }}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
