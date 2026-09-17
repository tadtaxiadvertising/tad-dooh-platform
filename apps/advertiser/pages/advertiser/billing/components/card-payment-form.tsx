'use client';

import { useState } from 'react';
import type { PaymentRequestPayload } from '@/lib/payment-types';

export interface CardPaymentFormProps {
  onSubmit: (payload: PaymentRequestPayload) => Promise<void>;
  accountId: string;
  totalRD: number;
}

export default function CardPaymentForm({ onSubmit, accountId, totalRD }: CardPaymentFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ number: '', name: '', expiry: '', cvv: '' });

  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: e.target.value });

  const submit = async () => {
    setSubmitting(true);
    await onSubmit({
      accountId,
      amountRD: totalRD,
      method: 'card',
      currency: 'DOP',
      items: [{ id: 'sub_annual', name: 'Suscripción Anual TAD', amountRD: 6000 }],
    });
    setSubmitting(false);
  };

  return (
    <div className="space-y-6 max-w-md">
      <div>
        <h2 className="text-2xl font-black uppercase italic mb-2">Tarjeta de crédito o débito</h2>
        <p className="text-zinc-500 text-sm">Ingresa los datos de tu tarjeta de forma segura.</p>
      </div>

      <div className="space-y-4">
        <label className="block space-y-2">
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Número de tarjeta</span>
          <input
            type="text"
            placeholder="4242 4242 4242 4242"
            value={form.number}
            onChange={update('number')}
            maxLength={19}
            className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-sm text-white
                       tracking-widest placeholder:text-zinc-700 focus:outline-none focus:border-tad-yellow/40"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Nombre como aparece en la tarjeta</span>
          <input
            type="text"
            placeholder="NOMBRE APELLIDO"
            value={form.name}
            onChange={update('name')}
            className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-sm text-white
                       tracking-widest placeholder:text-zinc-700 uppercase focus:outline-none focus:border-tad-yellow/40"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block space-y-2">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Vencimiento (MM/AA)</span>
            <input
              type="text"
              placeholder="12/28"
              value={form.expiry}
              onChange={update('expiry')}
              maxLength={5}
              className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-sm text-white
                 tracking-widest placeholder:text-zinc-700 focus:outline-none focus:border-black/40"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">CVV</span>
            <input
              type="text"
              placeholder="123"
              value={form.cvv}
              onChange={update('cvv')}
              maxLength={4}
              className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-sm text-white
                 tracking-widest placeholder:text-zinc-700 focus:outline-none focus:border-black/40"
            />
          </label>
        </div>
      </div>

      <button
        onClick={submit}
        disabled={submitting || !form.number || !form.name || !form.expiry || !form.cvv}
        className="w-full py-4 bg-[#FFD700] text-black rounded-2xl font-black uppercase tracking-widest
                   hover:bg-[#FFE033] disabled:opacity-40 transition-all"
      >
        {submitting ? 'Procesando...' : `Pagar RD$ ${totalRD.toLocaleString('es-DO')}`}
      </button>

      <div className="flex items-center gap-2 pt-2">
        <svg className="w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m10-6a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Pago 100% seguro · SSL</span>
      </div>
    </div>
  );
}
