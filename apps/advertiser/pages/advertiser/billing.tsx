import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { AdvertiserLayout } from '@/components/layout/AdvertiserLayout';
import { CreditCard, TrendingUp, ShieldCheck, AlertTriangle, XOctagon, MessageSquare } from 'lucide-react';
import { BillingPortal } from '@/components/bi/BillingPortal';
import { useAuth } from '@tad/ui';
import { getAdvertiserPortalData } from '@tad/services';
import clsx from 'clsx';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { ZeroState } from '@/components/ui/ZeroState';

export default function BillingPage() {
  const { session } = useAuth(); const router = useRouter(); const { viewAsAdmin, advId } = router.query;
  const entityId = (viewAsAdmin === 'true' && advId) ? (advId as string) : session?.user?.app_metadata?.entityId;
  const [data, setData] = useState<any>(null); const [loading, setLoading] = useState(true);
  useEffect(() => { if (!entityId) return setLoading(false); getAdvertiserPortalData(entityId).then(setData).catch(console.error).finally(()=>setLoading(false)); }, [entityId]);
  const balance = data?.financials?.balanceRD || 0; const status = balance > 50000 ? 'MORA' : balance > 0 ? 'PENDIENTE' : 'PAGADO';
  return <AdvertiserLayout title="Facturación & Pagos" subtitle="Administración de Cuenta"><div className="flex items-center gap-3 mb-10"><CreditCard className="text-[#FFD700] w-8 h-8" /><h1 className="text-4xl font-black">Facturación <span className="text-[#FFD700]">& Pagos</span></h1></div>
  {loading ? <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">{Array.from({length:3}).map((_,i)=><SkeletonCard key={i} variant="kpi-card" />)}</div> : <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10"><div className="bg-zinc-900/40 p-8 rounded-[2rem] border border-white/5"><TrendingUp className="text-[#FFD700]" /><h3 className="text-zinc-500 text-[10px] font-black uppercase">Saldo Pendiente</h3><p className="text-4xl font-black">RD$ {balance.toLocaleString()}</p></div><div className={clsx('p-8 rounded-[2rem] border', status==='PAGADO'?'bg-emerald-900/20 border-emerald-500/20':status==='PENDIENTE'?'bg-amber-900/20 border-amber-500/20':'bg-rose-900/20 border-rose-500/20')}>{status==='PAGADO'?<ShieldCheck/>:status==='PENDIENTE'?<AlertTriangle/>:<XOctagon/>}<p className="text-3xl font-black">{status}</p></div><ZeroState icon={MessageSquare} title="Configura tu método de pago" description="Actualmente no hay una pasarela activa. Contacta a soporte para coordinar pagos." /></div>}
  <div className="mb-8 p-6 rounded-2xl border border-white/5 bg-zinc-900/20"><h3 className="text-sm font-black uppercase">Resumen financiero</h3><p className="text-zinc-400 text-sm mt-2">Subtotal: RD$ {(data?.financials?.subtotal || 0).toLocaleString()} + ITBIS: RD$ {(data?.financials?.taxAmount || 0).toLocaleString()} = Total: RD$ {(data?.financials?.totalCost || 0).toLocaleString()}</p></div>
  <BillingPortal data={data} loading={loading} /></AdvertiserLayout>;
}
