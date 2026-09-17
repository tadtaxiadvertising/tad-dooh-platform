import React, { useState, useEffect } from 'react';
import { AdvertiserLayout } from '@/components/layout/AdvertiserLayout';
import { MetricsGrid } from '@/components/bi/MetricsGrid';
import { BudgetSimulator } from '@/components/bi/BudgetSimulator';
import { BillingPortal } from '@/components/bi/BillingPortal';
import OnboardingWizard, { getOnboardingKey } from '@/components/advertiser/OnboardingWizard';
import {
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useAuth } from '@tad/ui';
import { getAdvertiserPortalData } from '@tad/services/api';
import { Toaster, toast } from 'sonner';
import type { GetServerSideProps } from 'next';
// Force dynamic rendering — prevents "No QueryClient set" SSR errors
export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });

export default function AdvertiserDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const { session } = useAuth();

  const entityId = session?.user?.app_metadata?.entityId;

  // Wizard de bienvenida: se muestra solo si tad_adv_onboarded_${id} no existe
  useEffect(() => {
    if (!entityId) return;
    try {
      setShowWizard(window.localStorage.getItem(getOnboardingKey(entityId)) !== '1');
    } catch {
      setShowWizard(false);
    }
  }, [entityId]);

  const wizardOverlay = entityId && showWizard ? (
    <OnboardingWizard advertiserId={entityId} onComplete={() => setShowWizard(false)} />
  ) : null;

  useEffect(() => {
    if (!entityId) return;

    const loadData = async () => {
      try {
        const portalData = await getAdvertiserPortalData(entityId);
        setData(portalData);
      } catch (err) {
        console.error('Error fetching portal data:', err);
        toast.error('No se pudieron cargar los datos de la plataforma.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [entityId]);

  if (loading && entityId) {
    return (
      <AdvertiserLayout title="Cargando..." subtitle="Procesando Datos">
        {wizardOverlay}
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="w-12 h-12 border-4 border-[#FFD700]/20 border-t-[#FFD700] rounded-full animate-spin" />
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Sincronizando con Fleet Engine...</p>
        </div>
      </AdvertiserLayout>
    );
  }

  if (!entityId) {
    return (
      <AdvertiserLayout title="Acceso Denegado" subtitle="Error de Sesión">
        <div className="bg-rose-500/10 border border-rose-500/20 p-8 rounded-2xl text-center">
          <p className="text-rose-500 font-bold">No se encontró una entidad de anunciante vinculada a tu cuenta.</p>
          <p className="text-zinc-500 text-sm mt-2">Por favor, contacta a soporte si crees que esto es un error.</p>
        </div>
      </AdvertiserLayout>
    );
  }

  return (
    <AdvertiserLayout title="Advertiser BI v6.0" subtitle="Intelligence Dashboard">
      {wizardOverlay}
      <Toaster theme="dark" position="top-right" richColors />

      {/* Hero Section */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-[#FFD700] mb-2">
            <ShieldCheck size={18} />
            <span className="text-xs font-black uppercase tracking-[0.2em]">Military Grade Analytics</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-white uppercase italic">
            {data?.brand?.name || 'Advertiser'} <span className="text-[#FFD700]">BI</span>
          </h1>
          <p className="text-[#F4F4F5]/60 max-w-md mt-2">
            Panel de control avanzado para el monitoreo de campañas DOOH y gestión de inventario en tiempo real.
          </p>
        </div>

        <div className="flex gap-4">
          <div className="flex flex-col items-center rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.05] to-transparent px-5 py-4 backdrop-blur-sm">
            <span className="mb-1 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Status</span>
            <span className="flex items-center gap-2 text-sm font-black tracking-tight text-white">
              <span className="relative inline-flex h-2 w-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              </span>
              SECURE_NODE
            </span>
          </div>
          <div className="flex flex-col items-center rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.05] to-transparent px-5 py-4 backdrop-blur-sm transition-colors duration-300 hover:border-[#FFD400]/25">
            <span className="mb-1 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Live Campaigns</span>
            <span className="font-mono text-xl font-black leading-none text-[#FFD400]" style={{ textShadow: '0 0 14px rgba(255,212,0,0.35)' }}>
              {data?.stats?.activeCampaigns || 0}
            </span>
          </div>
        </div>
      </section>

      {/* Module 4: Marketing Insights */}
      <section id="insights">
        <MetricsGrid data={data?.stats} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Module 2: Expansion of Inventory / Budget Simulation */}
        <div className="lg:col-span-2">
          <BudgetSimulator />

          <div className="mt-6 space-y-5 rounded-3xl border border-white/[0.06] bg-gradient-to-b from-white/[0.05] to-transparent p-6 backdrop-blur-sm transition-all duration-300 hover:border-white/[0.12]">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-black/30">
                <Zap
                  className="animate-float h-4 w-4 text-[#FFD400]"
                  style={{ filter: 'drop-shadow(0 0 8px rgba(255,212,0,0.5))' }}
                />
              </span>
              <h4 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-300">Despliegue Instantáneo</h4>
            </div>
            <p className="text-xs text-[#F4F4F5]/50 leading-relaxed italic">
              "Nuestro motor de sincronización garantiza que cualquier expansión de pantallas se refleje en su inventario activo en menos de 5 minutos una vez aprobado el pago."
            </p>
          </div>
        </div>

        {/* Module 3: Billing & Finance */}
        <div className="lg:col-span-3">
          <BillingPortal data={data?.financials} />
        </div>
      </div>
    </AdvertiserLayout>
  );
}
