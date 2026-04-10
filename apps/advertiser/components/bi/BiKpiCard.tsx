import React from 'react';
import { clsx } from 'clsx';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface BiKpiCardProps {
  title: string;
  value: string | number;
  trend?: string;
  icon: LucideIcon;
  chartColor?: string;
  subtitle?: string;
  loading?: boolean;
  isHighlight?: boolean;
}

export const BiKpiCard: React.FC<BiKpiCardProps> = ({
  title,
  value,
  trend,
  icon: Icon,
  chartColor = '#FFD700',
  subtitle,
  loading,
  isHighlight
}) => {
  // Parse trend string to determine if positive
  const isPositive = trend ? (trend.startsWith('+') || trend === 'Estable') : true;

  return (
    <div className={clsx(
      "bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-6 relative overflow-hidden group transition-all duration-500 hover:border-[var(--kpi-color)]/30",
      isHighlight && "bg-zinc-900/40 border-[var(--kpi-color)]/10 ring-1 ring-[var(--kpi-color)]/5",
      loading && "animate-pulse"
    )}
    style={{ '--kpi-color': chartColor } as React.CSSProperties}
    >
      {/* Background Glow */}
      <div
        className="absolute -right-4 -top-4 w-24 h-24 blur-3xl opacity-10 transition-opacity duration-700 group-hover:opacity-20 rounded-full"
        style={{ backgroundColor: chartColor }}
      />

      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50 transition-colors"
          style={{ color: chartColor }}
        >
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <span className={clsx(
            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold",
            isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
          )}>
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {trend}
          </span>
        )}
      </div>

      <div className="space-y-1">
        <h3 className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">
          {title}
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-white tracking-tighter">
            {loading ? '---' : value}
          </span>
        </div>
        {subtitle && (
          <p className="text-zinc-500 text-[11px] font-medium leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {/* Interactive Bottom Bar */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-40 transition-opacity duration-700"
        style={{ background: `linear-gradient(to right, transparent, ${chartColor}, transparent)` }}
      />
    </div>
  );
};
