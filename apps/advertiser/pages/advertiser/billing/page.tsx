'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AdvertiserLayout } from '@/components/layout/AdvertiserLayout';
import { CreditCard, Receipt, TrendingUp, ShieldCheck, CheckCircle2, ArrowLeft, Copy, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BillingPortal } from '@/components/bi/BillingPortal';

type Step = 'method' | 'details' | 'processing' | 'success';

type PaymentMethod =
  | { id: 'card'; label: string; description: string }
  | { id: 'bank_transfer'; label: string; description: string }
  | { id: 'apple_pay'; label: string; description: string }
  | { id: 'google_pay'; label: string; description: string }
  | { id: 'paypal'; label: string; description: string };

const METHODS: PaymentMethod[] = [
  { id: 'card', label: 'Tarjeta de crédito/débito', description: 'Visa, Mastercard, Amex' },
  { id: 'bank_transfer', label: 'Transferencia bancaria', description: 'Banco Popular ****802' },
  { id: 'apple_pay', label: 'Apple Pay', description: 'Pago con Face/Touch ID' },
  { id: 'google_pay', label: 'Google Pay', description: 'Pago con cuenta Google' },
  { id: 'paypal', label: 'PayPal', description: 'Pago protegido por PayPal' },
];

const ACCOUNT_ID = 'ad_acc_001_nexpay';

export default function BillingPage() {
 const router = useRouter();
 const [mounted, setMounted] = useState(false);
 const [step, setStep] = useState<Step>('method');
 const [method, setMethod] = useState<string | null>(null);
 const [processing, setProcessing] = useState(false);
 const [reference, setReference] = useState<string | null>(null);

 useEffect(() => { setMounted(true); }, []);

 if (!mounted) return null;

 const copyToClipboard = (text: string) => {
   navigator.clipboard.writeText(text);
 };

 const handlePayment = useCallback(
   async () => {
     setProcessing(true);
     try {
      const res = await fetch('/api/payments/nexpay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `pay-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`,
        },
        body: JSON.stringify({
           accountId: ACCOUNT_ID,
           amountRD: 7080,
           method,
           currency: 'DOP',
           items: [{ id: 'sub_annual', name: 'Suscripción Anual TAD', amountRD: 6000 }],
         }),
       });

       if (!res.ok) throw new Error('No se pudo iniciar el pago');

       const data = await res.json();
       setReference(data.reference ?? data.id);
       setStep('success');
     } catch (error) {
       setStep('details');
       alert(error instanceof Error ? error.message : 'Error en el pago');
     } finally {
       setProcessing(false);
     }
   },
   [method]
 );

 if (step === 'processing') {
   return (
     <AdvertiserLayout title="Procesando pago" subtitle="Facturación & Pagos">
       <div className="flex flex-col items-center justify-center py-32">
         <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}>
           <RefreshCw className="text-[#FFD700] w-12 h-12" />
         </motion.div>
         <h2 className="text-2xl font-black uppercase italic mt-8">Verificando transacción...</h2>
         <p className="text-zinc-500 mt-2">No cierres esta ventana</p>
       </div>
     </AdvertiserLayout>
   );
 }

 if (step === 'success') {
   return (
     <AdvertiserLayout title="Pago exitoso" subtitle="Facturación & Pagos">
       <div className="flex flex-col items-center justify-center py-32">
         <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }}>
           <CheckCircle2 className="text-emerald-400 w-24 h-24" />
         </motion.div>
         <h2 className="text-3xl font-black uppercase italic mt-8">¡Pago confirmado!</h2>
         <p className="text-zinc-400 mt-3 text-center max-w-md">
           Tu pago ha sido procesado correctamente y tu methodo está activo.
         </p>
         {reference ? (
           <div className="mt-6 bg-zinc-900 border border-white/10 rounded-2xl px-6 py-4 flex items-center gap-4">
             <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Referencia</span>
             <code className="text-[#FFD700] font-mono text-sm">{reference}</code>
             <button onClick={() => copyToClipboard(reference)} className="text-zinc-400 hover:text-white transition-colors">
               <Copy className="w-4 h-4" />
             </button>
           </div>
         ) : null}
         <button
           onClick={() => router.push('/advertiser?tab=analytics')}
           className="mt-8 px-8 py-4 bg-[#FFD700] text-black rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#FFE033]"
         >
           Volver al método
         </button>
       </div>
     </AdvertiserLayout>
   );
 }

 return (
   <AdvertiserLayout title="Facturación & Pagos" subtitle="Administración de Cuenta">
     <div className="flex items-center gap-3 mb-10">
       <CreditCard className="text-[#FFD700] w-8 h-8" />
       <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">
         Facturación <span className="text-[#FFD700]">& Pagos</span>
       </h1>
     </div>

     <div className="space-y-8">
       <BillingPortal />
     </div>
   </AdvertiserLayout>
 );
}
