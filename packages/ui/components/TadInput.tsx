'use client';

import React from 'react';
import { clsx } from 'clsx';

export interface TadInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'children'> {
  label: string;
  error?: string;
  hint?: string;
}

export const TadInput = React.forwardRef<HTMLInputElement, TadInputProps>(
  function TadInput(
    {
      label,
      error,
      hint,
      id,
      className,
      required,
      disabled,
      'aria-describedby': ariaDescribedBy,
      'aria-invalid': ariaInvalid,
      ...inputProps
    },
    ref,
  ) {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;
    const messageId = error ? errorId : hint ? hintId : undefined;
    const describedBy = [ariaDescribedBy, messageId].filter(Boolean).join(' ') || undefined;

    return (
      <div className="w-full">
        <label
          htmlFor={inputId}
          className="mb-2 block text-xs font-bold tracking-wide text-zinc-200"
        >
          {label}
          {required && (
            <span aria-hidden="true" className="ml-1 text-[#FFD400]">
              *
            </span>
          )}
        </label>

        <input
          ref={ref}
          id={inputId}
          required={required}
          disabled={disabled}
          aria-invalid={error ? true : ariaInvalid}
          aria-describedby={describedBy}
          className={clsx(
            'min-h-11 w-full rounded-xl border bg-black/50 px-4 py-2.5 text-sm text-white outline-none',
            'placeholder:text-zinc-600',
            'transition-colors duration-200 focus:border-[#FFD400]/70 focus:ring-2 focus:ring-[#FFD400]/20',
            'disabled:cursor-not-allowed disabled:bg-zinc-900/60 disabled:text-zinc-500 disabled:opacity-70',
            'motion-reduce:transition-none',
            error
              ? 'border-rose-500/60 focus:border-rose-400 focus:ring-rose-500/20'
              : 'border-white/10 hover:border-white/20',
            className,
          )}
          {...inputProps}
        />

        {error ? (
          <p id={errorId} role="alert" className="mt-2 text-xs font-medium text-rose-400">
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="mt-2 text-xs text-zinc-500">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);

TadInput.displayName = 'TadInput';
