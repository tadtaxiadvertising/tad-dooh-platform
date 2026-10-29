'use client';

import React from 'react';
import { clsx } from 'clsx';

export type TadButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type TadButtonSize = 'sm' | 'md' | 'lg';

export interface TadButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: React.ReactNode;
  variant?: TadButtonVariant;
  size?: TadButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  fullWidth?: boolean;
}

const variantClasses: Record<TadButtonVariant, string> = {
  primary:
    'border-[#FFD400] bg-[#FFD400] text-black shadow-[0_10px_28px_rgba(255,212,0,0.18)] hover:border-[#ffe45c] hover:bg-[#ffe45c]',
  secondary:
    'border-white/10 bg-zinc-900/70 text-white shadow-[0_10px_28px_rgba(0,0,0,0.2)] hover:border-[#FFD400]/40 hover:bg-zinc-800',
  ghost:
    'border-transparent bg-transparent text-zinc-200 hover:border-white/10 hover:bg-white/5 hover:text-white',
  danger:
    'border-rose-500/30 bg-rose-500/10 text-rose-300 hover:border-rose-400/50 hover:bg-rose-500/20 hover:text-rose-200',
};

const sizeClasses: Record<TadButtonSize, string> = {
  sm: 'min-h-11 min-w-11 px-4 py-2 text-xs',
  md: 'min-h-11 min-w-11 px-5 py-2.5 text-sm',
  lg: 'min-h-12 min-w-12 px-6 py-3 text-base',
};

export const TadButton = React.forwardRef<HTMLButtonElement, TadButtonProps>(
  function TadButton(
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingText = 'Cargando',
      fullWidth = false,
      className,
      disabled,
      type = 'button',
      'aria-busy': ariaBusy,
      'aria-disabled': ariaDisabled,
      ...buttonProps
    },
    ref,
  ) {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={isLoading ? true : ariaBusy}
        aria-disabled={isDisabled ? true : ariaDisabled}
        className={clsx(
          'relative inline-flex items-center justify-center gap-2 rounded-xl border font-bold tracking-wide outline-none',
          'transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]',
          'focus-visible:ring-2 focus-visible:ring-[#FFD400] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]',
          'disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50',
          'motion-reduce:transform-none motion-reduce:transition-none',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          className,
        )}
        {...buttonProps}
      >
        {isLoading && (
          <span
            aria-hidden="true"
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
          />
        )}
        <span aria-live={isLoading ? 'polite' : undefined}>
          {isLoading ? loadingText : children}
        </span>
      </button>
    );
  },
);

TadButton.displayName = 'TadButton';
