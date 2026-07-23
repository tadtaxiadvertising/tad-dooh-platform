import React, { useState, useEffect } from 'react';
import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { AdvertiserLayout } from '@/components/layout/AdvertiserLayout';
import {
  CreditCard,
  Receipt,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  Copy,
  ExternalLink,
  MessageCircle,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BillingPortal } from '@/components/bi/BillingPortal';

type Step = 'method' | 'processing' | 'success';

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });

export default function BillingPage() {
 const [mounted, setMounted] = useState(false);
 const [step, setStep] = useState<Step>('method');
 const [method, setMethod] = useState<string | null>(null);
 const [reference, setReference] = useState<string | null>(null);

 useEffect(() => {
 setMounted(true);
 }, []);

 if (!mounted) return null;

 const copyToClipboard = (text: string) => {
   navigator.clipboard.writeText(text);
 };

 if (step === 'processing') {
   return (
     <AdvertiserLayout title="Procesando pago" subtitle="Facturación & Pagos">
       <div className="flex flex-col items-center justify-center py-32">
         <motion.div
           animate={{ rotate: 360 }}
           transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
         >
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
         <motion.div
           initial={{ scale: 0 }}
           animate={{ scale: 1 }}
           transition={{ type: 'spring', stiffness: 200, damping: 15 }}
         >
           <CheckCircle2 className="text-emerald-400 w-24 h-24" />
         </motion.div>
         <h2 className="text-3xl font-black uppercase italic mt-8">¡Pago confirmado!</h2>
         <p className="text-zinc-400 mt-3 text-center max-w-md">
           Tu suscripción anual de RD$6,000 ha sido registrada correctamente.
         </p>
         {reference && (
           <div className="mt-6 bg-zinc-900 border border-white/10 rounded-2xl px-6 py-4 flex items-center gap-4">
             <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Referencia</span>
             <code className="text-[#FFD700] font-mono text-sm">{reference}</code>
             <button
               onClick={() => copyToClipboard(reference)}
               className="text-zinc-400 hover:text-white transition-colors"
             >
               <Copy className="w-4 h-4" />
             </button>
           </div>
         )}
       </div>
     </AdvertiserLayout>
   );
 }

 return (
 <AdvertiserLayout title="Facturación & Pagos" subtitle="Administración de Cuenta">
 <style jsx global>{` :root { --ffd: #FFD700; } `}</style>
 <div className="flex items-center gap-3 mb-10">
 <CreditCard className="text-[#FFD700] w-8 h-8" />
 <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">
 Facturación <span className="text-[#FFD700]">& Pagos</span>
 </h1>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
 <div className="bg-[#18181B] p-8 rounded-3xl border border-white/5 space-y-4">
 <div className="w-12 h-12 bg-[#FFD700]/10 rounded-2xl flex items-center justify-center">
 <TrendingUp className="text-[#FFD700] w-6 h-6" />
 </div>
 <h3 className="text-zinc-500 text-xs font-black uppercase tracking-widest">Saldo Pendiente</h3>
 <p className="text-3xl font-black text-white">RD$ 0.00</p>
 </div>

 <div className="bg-[#18181B] p-8 rounded-3xl border border-white/5 space-y-4">
 <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
 <ShieldCheck className="text-emerald-500 w-6 h-6" />
 </div>
 <h3 className="text-zinc-500 text-xs font-black uppercase tracking-widest">Estado de Cuenta</h3>
 <p className="text-3xl font-black text-emerald-500 uppercase">Al Día</p>
 </div>

 <div className="bg-gradient-to-br from-[#FFD700] to-[#EAB308] p-8 rounded-3xl space-y-4 shadow-xl shadow-[#FFD700]/10 cursor-pointer hover:scale-[1.02] transition-transform">
 <h3 className="text-black text-xs font-black uppercase tracking-widest">Método de Pago</h3>
 <div className="flex items-center gap-4">
 <div className="w-12 h-8 bg-black/20 rounded flex items-center justify-center">
 <span className="text-[10px] font-black italic">VISA</span>
 </div>
 <p className="text-black font-black">**** 4242</p>
 </div>
 <p className="text-black/60 text-[10px] font-bold uppercase">Vence 12/28</p>
 </div>
 </div>

 <div className="space-y-8">
 <BillingPortal />
 </div>
 </AdvertiserLayout>
 );
}
