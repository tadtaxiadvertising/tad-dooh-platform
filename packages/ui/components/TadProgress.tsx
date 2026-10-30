'use client';

import React from 'react';
import { clsx } from 'clsx';

export interface TadProgressProps
  extends Omit<
    React.HTMLAttributes<HTMLDivElement>,
    'aria-valuemax' | 'aria-valuemin' | 'aria-valuenow' | 'children' | 'role'
  > {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
}

export const TadProgress = React.forwardRef<HTMLDivElement, TadProgressProps>(
  function TadProgress(
    {
      value,
      max = 100,
      label,
      showValue = false,
      className,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      'aria-valuetext': ariaValueText,
      ...progressProps
    },
    ref,
  ) {
    const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
    const safeValue = Number.isFinite(value) ? value : 0;
    const clampedValue = Math.min(Math.max(safeValue, 0), safeMax);
    const percentage = (clampedValue / safeMax) * 100;
    const roundedPercentage = Math.round(percentage);

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-label={ariaLabelledBy ? ariaLabel : ariaLabel || label || 'Progreso'}
        aria-labelledby={ariaLabelledBy}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={clampedValue}
        aria-valuetext={ariaValueText || `${roundedPercentage}%`}
        className={clsx('w-full', className)}
        {...progressProps}
      >
        {(label || showValue) && (
          <div aria-hidden="true" className="mb-2 flex items-center justify-between gap-3">
            {label && <span className="text-xs font-bold text-zinc-300">{label}</span>}
            {showValue && (
              <span className="ml-auto text-xs font-black tabular-nums text-[#FFD400]">
                {roundedPercentage}%
              </span>
            )}
          </div>
        )}

        <div className="h-2.5 w-full overflow-hidden rounded-full border border-white/5 bg-black/60">
          <div
            aria-hidden="true"
            className="h-full rounded-full bg-[#FFD400] shadow-[0_0_14px_rgba(255,212,0,0.32)] transition-[width] duration-300 ease-out motion-reduce:transition-none"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  },
);

TadProgress.displayName = 'TadProgress';
