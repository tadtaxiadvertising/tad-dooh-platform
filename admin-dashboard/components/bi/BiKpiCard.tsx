import React from 'react';
import { clsx } from 'clsx';
import { LucideIcon } from 'lucide-react';
import { StatusSemaphore, SemaphoreStatus } from '../ui/StatusSemaphore';

interface BiKpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  status: SemaphoreStatus;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  loading?: boolean;
}

export const BiKpiCard: React.FC<BiKpiCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  status,
  trend,
  loading
}) => {
  return (
    <div className={clsx(
      "bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-6 relative overflow-hidden group transition-all duration-500 hover:border-tad-yellow/30",
      loading && "animate-pulse"
    )}>
      {/* Background Glow */}
      <div className={clsx(
        "absolute -right-4 -top-4 w-24 h-24 blur-3xl opacity-10 transition-opacity duration-700 group-hover:opacity-20",
        status === 'optimum' ? 'bg-emerald-500' :
        status === 'warning' ? 'bg-tad-yellow' :
        'bg-rose-500'
      )} />

      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50 text-zinc-400 group-hover:text-tad-yellow transition-colors">
          <Icon className="w-6 h-6" />
        </div>
        <StatusSemaphore status={status} size="sm" />
      </div>

      <div className="space-y-1">
        <h3 className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">
          {title}
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-white tracking-tighter">
            {loading ? '---' : value}
          </span>
          {trend && !loading && (
            <span className={clsx(
              "text-[10px] font-bold",
              trend.isPositive ? "text-emerald-500" : "text-rose-500"
            )}>
              {trend.isPositive ? '+' : '-'}{trend.value}%
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-zinc-500 text-[11px] font-medium leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {/* Interactive Bottom Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-tad-yellow/0 to-transparent transition-all duration-700 group-hover:via-tad-yellow/40" />
    </div>
  );
};
