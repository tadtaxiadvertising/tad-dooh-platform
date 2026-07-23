'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Copy, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PaymentConfirmationProps {
  paymentId: string;
  reference?: string;
  amountRD: number;
  onDone: () => void;
}

export default function PaymentConfirmation({ paymentId, reference, amountRD, onDone }: PaymentConfirmationProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="bg-zinc-900/40 border border-white/5 rounded-[2.5rem] p-8 md:p-12"
    >
      <div className="flex flex-col items-center text-center mb-10">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
        </div>
        <h2 className="text-3xl md:text-4xl font-black uppercase italic mb-3">¡Pago Exitosa!</h2>
        <p className="text-zinc-500 max-w-md text-sm">
          Tu pago de RD${amountRD.toLocaleString('es-DO')} ha sido procesado correctamente. Tu suscripción ya está activa.
        </p>
      </div>

      {reference && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-8">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Referencia</p>
          <div className="flex items-center justify-between gap-4">
            <code className="text-[#FFD700] font-mono text-sm">{reference}</code>
            <button
              onClick={() => navigator.clipboard.writeText(reference)}
              className="text-zinc-500 hover:text-white transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">ID de Transacción</p>
          <code className="text-xs text-zinc-300 font-mono break-all">{paymentId}</code>
        </div>
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Estado</p>
          <span className="inline-flex items-center gap-2 text-xs font-black text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Confirmado
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onDone}
          className="flex-1 py-4 bg-[#FFD700] text-black rounded-2xl text-[10px] font-black uppercase tracking-widest
                     hover:bg-[#FFE033] transition-all"
        >
          Volver al Dashboard
        </button>
        <a
          href="/advertiser?tab=analytics"
          className="flex items-center justify-center gap-2 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl
                     text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all"
        >
          <ExternalLink className="w-4 h-4" />
          Ver mis campañas
        </a>
      </div>
    </motion.div>
  );
}
