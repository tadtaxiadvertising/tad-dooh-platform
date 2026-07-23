import React, { useState } from 'react';
import { CreditCard, TrendingUp, ShieldCheck, CheckCircle2 } from 'lucide-react';

type Step = 'method' | 'details' | 'processing' | 'success';

const METHODS = [
  { id: 'card', label: 'Tarjeta', description: 'Visa, Mastercard, Amex' },
  { id: 'bank_transfer', label: 'Transferencia', description: 'Banco Popular ****802' },
  { id: 'apple_pay', label: 'Apple Pay', description: 'Face/Touch ID' },
  { id: 'google_pay', label: 'Google Pay', description: 'Cuenta Google' },
  { id: 'paypal', label: 'PayPal', description: 'Pago protegido' },
];

export const getServerSideProps = async () => ({ props: {} });

export default function BillingPage() {
 const [mounted, setMounted] = useState(false);
 const [step, setStep] = useState<Step>('method');
 const [method, setMethod] = useState<string | null>(null);
 const [reference, setReference] = useState<string | null>(null);

 useEffect(() => { setMounted(true); }, []);

 if (!mounted) return null;

 // Placeholder para activar el flujo completo (en producción: POST a backend)
 const handlePayment = () => {
   setStep('processing');
   setTimeout(() => {
     setReference('TXN-' + Math.random().toString(36).slice(2, 10).toUpperCase());
     setStep('success');
   }, 1800);
 };

 if (step === 'processing') {
   return (
     <div className="flex flex-col items-center justify-center py-32 space-y-4">
       <div className="w-10 h-10 border-2 border-tad-yellow border-t-transparent rounded-full animate-spin" />
       <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Procesando pago...</p>
     </div>
   );
 }

 if (step === 'success') {
   return (
     <div className="flex flex-col items-center justify-center py-32 space-y-6 text-center">
       <CheckCircle2 className="text-emerald-400 w-16 h-16" />
       <div>
         <h1 className="text-3xl font-black uppercase italic mb-2">Pago exitoso</h1>
         {reference ? (
           <p className="text-sm text-zinc-400">
             Referencia: <code className="text-tad-yellow">{reference}</code>
           </p>
         ) : null}
       </div>
       <button
         onClick={() => { setStep('method'); setMethod(null); setReference(null); }}
         className="px-6 py-3 bg-white/5 border border-white/10 rounded-full text-xs font-black uppercase tracking-widest hover:bg-white/10 transition"
       >
         Volver
       </button>
     </div>
   );
 }

 return (
 <div className="min-h-screen bg-[#050505] text-white">
 <div className="max-w-5xl mx-auto px-6 py-12">
 <div className="flex items-center gap-3 mb-10">
 <CreditCard className="text-[#FFD700] w-8 h-8" />
 <h1 className="text-4xl font-black tracking-tighter uppercase italic">
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

 <div className="bg-gradient-to-br from-[#FFD700] to-[#EAB308] p-8 rounded-3xl space-y-4 shadow-xl shadow-[#FFD700]/10">
 <h3 className="text-black text-xs font-black uppercase tracking-widest">Método de Pago</h3>
 <p className="text-black font-black">**** 4242</p>
 <p className="text-black/60 text-[10px] font-bold uppercase">Vence 12/28</p>
 </div>
 </div>

 <div className="space-y-8">
 <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8">
 <h2 className="text-2xl font-black uppercase italic mb-2">Elige tu método de pago</h2>
 <p className="text-zinc-500 text-sm mb-8">Selecciona una opción para procesar tu suscripción.</p>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
 {METHODS.map((item) => (
   <button
     key={item.id}
     onClick={() => { setMethod(item.id); setStep('details'); }}
     className={`p-6 rounded-3xl border text-left transition-all duration-300 ${
       method === item.id
         ? 'bg-[#FFD700] border-[#FFD700] text-black'
         : 'bg-white/[0.02] border-white/5 text-white hover:border-white/10'
     }`}
   >
     <p className="text-sm font-black uppercase tracking-tight">{item.label}</p>
     <p className={`text-xs mt-2 ${method === item.id ? 'text-black/80' : 'text-zinc-500'}`}>{item.description}</p>
   </button>
 ))}
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}
