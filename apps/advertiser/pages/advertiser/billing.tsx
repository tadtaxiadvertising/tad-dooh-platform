import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { AdvertiserLayout } from '@/components/layout/AdvertiserLayout';
import { CreditCard, Receipt, TrendingUp, ShieldCheck, AlertTriangle, XOctagon } from 'lucide-react';
import { motion } from 'framer-motion';
import { BillingPortal } from '@/components/bi/BillingPortal';
import { useAuth } from '@tad/ui';
import { getAdvertiserPortalData } from '@tad/services';
import clsx from 'clsx';

export default function BillingPage() {
  const [mounted, setMounted] = useState(false);
  const { session } = useAuth();
  const router = useRouter();
  const { viewAsAdmin, advId } = router.query;
  const entityId = (viewAsAdmin === 'true' && advId) ? (advId as string) : session?.user?.app_metadata?.entityId;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    if (entityId) {
      getAdvertiserPortalData(entityId)
        .then(setData)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [entityId]);

  if (!mounted || loading) return (
    <AdvertiserLayout title="Facturación & Pagos" subtitle="Administración de Cuenta">
      <div className="py-20 flex justify-center">
        <div className="w-8 h-8 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
      </div>
    </AdvertiserLayout>
  );

  const balance = data?.financials?.balanceRD || 0;
  const status = balance > 50000 ? 'MORA' : balance > 0 ? 'PENDIENTE' : 'PAGADO';

  return (
    <AdvertiserLayout title="Facturación & Pagos" subtitle="Administración de Cuenta">
      <div className="flex items-center gap-3 mb-10">
        <CreditCard className="text-[#FFD700] w-8 h-8" />
        <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">
          Facturación <span className="text-[#FFD700]">& Pagos</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-zinc-900/40 backdrop-blur-xl p-8 rounded-[2rem] border border-white/5 space-y-4 hover:border-[#FFD700]/30 transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700]/5 blur-[50px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-[#FFD700]/10 transition-colors" />
          <div className="w-12 h-12 bg-[#FFD700]/10 rounded-2xl flex items-center justify-center relative z-10 border border-[#FFD700]/20">
            <TrendingUp className="text-[#FFD700] w-6 h-6" />
          </div>
          <div className="relative z-10">
             <h3 className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Saldo Pendiente</h3>
             <p className="text-4xl font-black text-white tracking-tighter">RD$ {balance.toLocaleString()}</p>
          </div>
        </div>

        <div className={clsx(
          "backdrop-blur-xl p-8 rounded-[2rem] border space-y-4 transition-all relative overflow-hidden group",
          status === 'PAGADO' ? "bg-emerald-900/20 border-emerald-500/20 hover:border-emerald-500/40" :
          status === 'PENDIENTE' ? "bg-amber-900/20 border-amber-500/20 hover:border-amber-500/40" :
          "bg-rose-900/20 border-rose-500/20 hover:border-rose-500/40"
        )}>
          <div className={clsx(
            "absolute top-0 right-0 w-32 h-32 blur-[50px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:opacity-100 transition-opacity opacity-50",
            status === 'PAGADO' ? "bg-emerald-500/10" :
            status === 'PENDIENTE' ? "bg-amber-500/10" :
            "bg-rose-500/10"
          )} />
          <div className={clsx(
            "w-12 h-12 rounded-2xl flex items-center justify-center relative z-10 border",
            status === 'PAGADO' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
            status === 'PENDIENTE' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
            "bg-rose-500/10 text-rose-500 border-rose-500/20"
          )}>
            {status === 'PAGADO' ? <ShieldCheck className="w-6 h-6" /> :
             status === 'PENDIENTE' ? <AlertTriangle className="w-6 h-6" /> :
             <XOctagon className="w-6 h-6" />}
          </div>
          <div className="relative z-10">
             <h3 className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Estado de Cuenta</h3>
             <p className={clsx(
               "text-3xl font-black uppercase tracking-tight",
               status === 'PAGADO' ? "text-emerald-500" :
               status === 'PENDIENTE' ? "text-amber-500" :
               "text-rose-500"
             )}>
               {status === 'PAGADO' ? 'Al Día' :
                status === 'PENDIENTE' ? 'Pendiente' :
                'En Mora (K-402)'}
             </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#FFD700] to-[#EAB308] p-8 rounded-[2rem] space-y-4 shadow-xl shadow-[#FFD700]/20 cursor-pointer hover:scale-[1.02] transition-transform relative overflow-hidden">
          <div className="absolute inset-0 bg-black/5 opacity-0 hover:opacity-100 transition-opacity" />
          <h3 className="text-black/80 text-[10px] font-black uppercase tracking-widest mb-1 relative z-10">Método de Pago Activo</h3>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-10 bg-black/90 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-inner">
              <span className="text-[11px] font-black italic text-white tracking-widest">VISA</span>
            </div>
            <div>
               <p className="text-black font-black text-xl tracking-tight">**** 4242</p>
               <p className="text-black/60 text-[10px] font-bold uppercase tracking-widest">Vence 12/28</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <BillingPortal />
      </div>
    </AdvertiserLayout>
  );
}
