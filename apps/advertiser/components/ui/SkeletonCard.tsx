import React from 'react';
import clsx from 'clsx';

type Variant = 'table-row' | 'kpi-card' | 'campaign-card';

export function SkeletonCard({ variant = 'kpi-card' }: { variant?: Variant }) {
  if (variant === 'table-row') {
    return (
      <div className="grid grid-cols-6 gap-4 px-6 py-4 border-b border-[#18181B] animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-4 rounded bg-zinc-800/80" />
        ))}
      </div>
    );
  }

  return (
    <div className={clsx('rounded-2xl border border-white/5 bg-zinc-900/40 animate-pulse', variant === 'campaign-card' ? 'p-6 min-h-[220px]' : 'p-8 min-h-[150px]')}>
      <div className="h-4 w-1/3 rounded bg-zinc-800 mb-4" />
      <div className="h-10 w-2/3 rounded bg-zinc-800 mb-4" />
      <div className="h-3 w-full rounded bg-zinc-800" />
    </div>
  );
}
