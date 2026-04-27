import React from 'react';
import { clsx } from 'clsx';
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { StatusSemaphore, SemaphoreStatus } from '@tad/ui';

interface BiKpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  status: SemaphoreStatus;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  loading?: boolean;
  isHighlight?: boolean;
}

export const BiKpiCard: React.FC<BiKpiCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  status,
  trend,
  loading,
  isHighlight
}) => {
  return (
    <div className={clsx(
      "relative overflow-hidden rounded-2xl border p-6 group transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/40",
      isHighlight 
        ? "bg-zinc-900/60 border-tad-yellow/20 ring-1 ring-tad-yellow/5 shadow-lg shadow-tad-yellow/5" 
        : "bg-zinc-950/60 border-zinc-800/60 hover:border-zinc-700/60",
      loading && "animate-pulse"
    )}>
      {/* Dynamic Background Glow */}
      <div className={clsx(
        "absolute -right-6 -top-6 w-32 h-32 blur-[80px] opacity-[0.05] transition-opacity duration-700 group-hover:opacity-[0.15]",
        status === 'optimum' ? 'bg-emerald-500' :
        status === 'warning' ? 'bg-tad-yellow' :
        'bg-rose-500'
      )} />

      {/* Header row */}
      <div className="flex items-start justify-between mb-5">
        <div className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800 text-zinc-500 group-hover:text-tad-yellow group-hover:border-tad-yellow/20 transition-all duration-300">
          <Icon className="w-5 h-5" />
        </div>
        <StatusSemaphore status={status} size="sm" />
      </div>

      {/* Title Label */}
      <div className="space-y-1.5">
        <h3 className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] leading-none">
          {title}
        </h3>
        
        {/* Value row */}
        <div className="flex items-baseline gap-2.5">
          <span className="text-2xl font-black text-white tracking-tighter">
            {loading ? (
              <span className="inline-block w-24 h-6 bg-zinc-800/50 rounded animate-pulse" />
            ) : (
              value
            )}
          </span>
          {trend && !loading && (
            <span className={clsx(
              "flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-lg border",
              trend.isPositive 
                ? "text-emerald-400 bg-emerald-500/5 border-emerald-500/10" 
                : "text-rose-400 bg-rose-500/5 border-rose-500/10"
            )}>
              {trend.isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {trend.value}
            </span>
          )}
        </div>
        
        {/* Subtitle description */}
        {subtitle && (
          <p className="text-zinc-500 text-[11px] font-medium leading-relaxed mt-1">
            {subtitle}
          </p>
        )}
      </div>

      {/* Bottom accent glass bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-tad-yellow/0 to-transparent transition-all duration-700 group-hover:via-tad-yellow/40" />
    </div>
  );
};
