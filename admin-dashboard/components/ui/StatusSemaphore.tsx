import React from 'react';
import { clsx } from 'clsx';
import { 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  HelpCircle,
  LucideIcon
} from 'lucide-react';

export type SemaphoreStatus = 'optimum' | 'warning' | 'critical' | 'unknown';

interface StatusSemaphoreProps {
  status: SemaphoreStatus;
  label?: string;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<SemaphoreStatus, {
  color: string;
  bg: string;
  border: string;
  glow: string;
  icon: LucideIcon;
  text: string;
}> = {
  optimum: {
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    glow: 'shadow-[0_0_15px_rgba(16,185,129,0.2)]',
    icon: CheckCircle2,
    text: 'ÓPTIMO'
  },
  warning: {
    color: 'text-tad-yellow',
    bg: 'bg-tad-yellow/10',
    border: 'border-tad-yellow/20',
    glow: 'shadow-[0_0_15px_rgba(255,212,0,0.2)]',
    icon: AlertCircle,
    text: 'DISCREPANCIA'
  },
  critical: {
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    glow: 'shadow-[0_0_15px_rgba(244,63,94,0.2)]',
    icon: XCircle,
    text: 'CRÍTICO'
  },
  unknown: {
    color: 'text-zinc-500',
    bg: 'bg-zinc-500/10',
    border: 'border-zinc-500/20',
    glow: '',
    icon: HelpCircle,
    text: 'SIN DATOS'
  }
};

export const StatusSemaphore: React.FC<StatusSemaphoreProps> = ({ 
  status, 
  label, 
  className,
  showIcon = true,
  size = 'md'
}) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[8px] gap-1',
    md: 'px-3 py-1 text-[9px] gap-1.5',
    lg: 'px-4 py-2 text-[10px] gap-2'
  };

  const iconSizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  return (
    <div className={clsx(
      "inline-flex items-center font-black uppercase tracking-[0.2em] rounded-full border transition-all duration-500",
      config.bg,
      config.color,
      config.border,
      config.glow,
      sizeClasses[size],
      className
    )}>
      {showIcon && <Icon className={clsx("shrink-0", iconSizes[size])} />}
      <span>{label || config.text}</span>
    </div>
  );
};
