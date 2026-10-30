'use client';

import React from 'react';
import { clsx } from 'clsx';

export type TadCardVariant = 'surface' | 'elevated' | 'outline';
export type TadCardPadding = 'sm' | 'md' | 'lg';

export interface TadCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  children: React.ReactNode;
  variant?: TadCardVariant;
  padding?: TadCardPadding;
  interactive?: boolean;
}

const variantClasses: Record<TadCardVariant, string> = {
  surface: 'border-white/5 bg-zinc-900/40',
  elevated:
    'border-white/10 bg-zinc-900/60 shadow-[0_24px_70px_rgba(0,0,0,0.35)]',
  outline: 'border-white/10 bg-transparent',
};

const paddingClasses: Record<TadCardPadding, string> = {
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
};

export const TadCard = React.forwardRef<HTMLDivElement, TadCardProps>(
  function TadCard(
    {
      children,
      variant = 'surface',
      padding = 'md',
      interactive = false,
      className,
      onClick,
      onKeyDown,
      role,
      tabIndex,
      ...cardProps
    },
    ref,
  ) {
    const isActionable = typeof onClick === 'function';
    const hasInteractiveStyle = interactive || isActionable;

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);

      if (
        event.defaultPrevented ||
        event.repeat ||
        !isActionable ||
        (event.key !== 'Enter' && event.key !== ' ')
      ) {
        return;
      }

      event.preventDefault();
      event.currentTarget.click();
    };

    return (
      <div
        ref={ref}
        role={isActionable ? role || 'button' : role}
        tabIndex={isActionable ? tabIndex ?? 0 : tabIndex}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        className={clsx(
          'rounded-3xl border text-zinc-100 backdrop-blur-3xl',
          variantClasses[variant],
          paddingClasses[padding],
          hasInteractiveStyle &&
            'min-h-11 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#FFD400]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD400] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none',
          isActionable && 'cursor-pointer',
          className,
        )}
        {...cardProps}
      >
        {children}
      </div>
    );
  },
);

TadCard.displayName = 'TadCard';
