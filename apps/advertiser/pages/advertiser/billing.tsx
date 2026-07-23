import React, { useState, useEffect } from 'react';
import type { GetServerSideProps } from 'next';
import { AdvertiserLayout } from '@/components/layout/AdvertiserLayout';
import { CreditCard, Receipt, TrendingUp, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { BillingPortal } from '@/components/bi/BillingPortal';

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });

export default function BillingPage() {
 const [mounted, setMounted] = useState(false);

 useEffect(() => {
 setMounted(true);
 }, []);

 if (!mounted) return null;

 return (
 <AdvertiserLayout title="Facturación & Pagos" subtitle="Administración de Cuenta">
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
