'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { PAYMENT_METHODS, PaymentMethod } from '@/lib/payment-types';
import type { PaymentRequestPayload } from '@/lib/payment-types';

export interface PaymentMethodSelectorProps {
  selected: PaymentMethod | null;
  onSelect: (method: PaymentMethod) => void;
  totalRD: number;
  subtotalRD: number;
}

export default function PaymentMethodSelector({ selected, onSelect, totalRD, subtotalRD }: PaymentMethodSelectorProps) {
  const [showAll, setShowAll] = useState(false);
  const methods = PAYMENT_METHODS;

  const visible = showAll ? methods : methods.slice(0, 3);

  return (
    <div>
      <div className="space-y-12">
        <div>
          <h2 className="text-2xl font-black uppercase italic mb-2">Elige tu método de pago</h2>
          <p className="text-zinc-500 text-sm">Selecciona la opción más cómoda para completar tu suscripción.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((m) => (
            <button
              key={m.id}
              onClick={() => onSelect(m.id)}
              className={cn(
                'p-6 rounded-3xl border text-left transition-all duration-300 group relative overflow-hidden',
                selected === m.id
                  ? 'bg-[#FFD700] border-[#FFD700] shadow-xl shadow-[#FFD700]/20'
                  : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
              )}
            >
              <div className="flex items-center justify-between mb-4">
                {m.icon ? (
                  <span className="text-2xl">{m.icon}</span>
                ) : (
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-500">{m.label}</span>
                )}
                {selected === m.id && (
                  <svg className="w-5 h-5 text-black shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <h3 className={cn('text-sm font-black uppercase tracking-tight', selected === m.id ? 'text-black' : 'text-white')}>
                {m.label}
              </h3>
              <p className={cn('text-xs mt-1', selected === m.id ? 'text-black/60' : 'text-zinc-500')}>
                {m.description}
              </p>
            </button>
          ))}
        </div>

        {!showAll && methods.length > 3 && (
          <div className="text-center">
            <button
              onClick={() => setShowAll(true)}
              className="text-xs font-black text-zinc-500 uppercase tracking-widest hover:text-[#FFD700] transition-colors"
            >
              Ver más métodos de pago
            </button>
          </div>
        )}

        {showAll && (
          <div className="text-center">
            <button
              onClick={() => setShowAll(false)}
              className="text-xs font-black text-zinc-500 uppercase tracking-widest hover:text-white transition-colors"
            >
              Ver menos
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
