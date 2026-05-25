import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { AdvertiserLayout } from '@/components/layout/AdvertiserLayout';
import { MetricsGrid } from '@/components/bi/MetricsGrid';
import { BudgetSimulator } from '@/components/bi/BudgetSimulator';
import { BillingPortal } from '@/components/bi/BillingPortal';
import { 
  ShieldCheck, 
  Zap, 
  MapPin, 
  TrendingUp, 
  CheckCircle2, 
  DollarSign, 
  Users, 
  Eye, 
  ArrowRight, 
  Compass, 
  Loader2,
  Sparkles,
  ChevronRight,
  Layers3,
  X
} from 'lucide-react';

import { useAuth } from '@tad/ui';
import { api, getAdvertiserPortalData } from '@tad/services/api';
import { Toaster, toast } from 'sonner';
import clsx from 'clsx';

const getAdvertiserOnboardingKey = (entityId: string) => `tad_advertiser_onboarding_seen_v2_${entityId}`;

export default function AdvertiserDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();
  const router = useRouter();
  const { viewAsAdmin, advId } = router.query;
  
  const entityId = (viewAsAdmin === 'true' && advId) ? (advId as string) : session?.user?.app_metadata?.entityId;

  // Onboarding states
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [step, setStep] = useState(1);
  const [city, setCity] = useState<'Santo Domingo' | 'Santiago'>('Santo Domingo');
  const [budget, setBudget] = useState(25000);
  const [simulation, setSimulation] = useState<any>(null);
  const [simulationLoading, setSimulationLoading] = useState(false);

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

    // Check if onboarding is needed
    const onboarded = localStorage.getItem(`tad_adv_onboarded_${entityId}`);
    if (!onboarded) {
      setShowOnboarding(true);
    }
  }, [entityId]);

  // Fetch simulation for step 2 & 3
  useEffect(() => {
    if (!showOnboarding || (step !== 2 && step !== 3)) return;

    const fetchSimulation = async () => {
      setSimulationLoading(true);
      try {
        const { data: simRes } = await api.post('/campaigns/simulate-budget', {
          budgetRD: budget,
          city: city
        });
        setSimulation(simRes);
      } catch (err) {
        console.warn('Simulation API error, using client fallback:', err);
        const costPerScreen = 1500;
        const uniqueReachPerScreen = 2000;
        const screens = Math.floor(budget / costPerScreen);
        const uniqueReach = screens * uniqueReachPerScreen;
        const totalImpressions = uniqueReach * 2;
        setSimulation({
          recommendedScreens: screens,
          uniqueReach: uniqueReach,
          totalImpressions: totalImpressions
        });
      } finally {
        setSimulationLoading(false);
      }
    };

    const timer = setTimeout(fetchSimulation, 400);
    return () => clearTimeout(timer);
  }, [budget, city, step, showOnboarding]);

  const handleCompleteOnboarding = () => {
    if (!entityId) return;
    localStorage.setItem(`tad_adv_onboarded_${entityId}`, 'true');
    setShowOnboarding(false);
    toast.success('¡Onboarding completado exitosamente! Tu proyección ha sido guardada en el simulador.', {
      duration: 5000,
    });
  };

  const getAdvertiserOnboardingKey2 = (id: string) => `tad_advertiser_onboarding_seen_v2_${id}`;

  useEffect(() => {
    if (typeof window === 'undefined' || !entityId) return;
    const hasSeenOnboarding = localStorage.getItem(getAdvertiserOnboardingKey2(entityId)) === '1';
    const forceOnboarding = sessionStorage.getItem('tad_advertiser_force_onboarding') === '1';
    if (forceOnboarding || !hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, [entityId]);

  const closeOnboarding = () => {
    if (entityId) {
      localStorage.setItem(getAdvertiserOnboardingKey2(entityId), '1');
    }
    sessionStorage.removeItem('tad_advertiser_force_onboarding');
    setShowOnboarding(false);

  };

  if (loading && entityId) {
    return (
      <AdvertiserLayout title="Cargando..." subtitle="Procesando Datos">
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
      <Toaster theme="dark" position="top-right" richColors />

      {showOnboarding && (
        <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-[2rem] border border-white/10 bg-zinc-950/95 shadow-[0_30px_120px_rgba(0,0,0,0.85)] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Onboarding inicial</p>
                <h3 className="text-lg font-black text-white">{onboardingTitle}</h3>
              </div>
              <button
                onClick={closeOnboarding}
                className="p-2 rounded-full bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Cerrar onboarding"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid md:grid-cols-[1.25fr_0.75fr]">
              <div className="p-6 md:p-8 space-y-6">
                {onboardingStep === 1 && (
                  <>
                    <div className="flex items-center gap-2 text-[#FFD700]">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Primer login</span>
                    </div>
                    <h4 className="text-3xl font-black text-white tracking-tight">Tu marca ya está dentro del sistema</h4>
                    <p className="text-zinc-400 leading-relaxed max-w-xl">
                      Vamos a dejarte listo en 3 pasos: entenderás el bloque de 30 segundos, el límite operativo de 15 slots y cómo ver una proyección inmediata antes de cargar campañas.
                    </p>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                        <Layers3 className="w-5 h-5 text-[#FFD700] mb-3" />
                        <p className="text-sm font-bold text-white">30 segundos</p>
                        <p className="text-[11px] text-zinc-500 mt-1">Cada bloque publicitario trabaja sobre esta unidad base.</p>
                      </div>
                      <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                        <ShieldCheck className="w-5 h-5 text-emerald-400 mb-3" />
                        <p className="text-sm font-bold text-white">15 slots máximo</p>
                        <p className="text-[11px] text-zinc-500 mt-1">Nunca mostramos más campañas simultáneas que el límite operativo.</p>
                      </div>
                      <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                        <Zap className="w-5 h-5 text-blue-400 mb-3" />
                        <p className="text-sm font-bold text-white">Simulación viva</p>
                        <p className="text-[11px] text-zinc-500 mt-1">Ajusta ciudad y presupuesto para ver el impacto al instante.</p>
                      </div>
                    </div>
                  </>
                )}

                {onboardingStep === 2 && (
                  <>
                    <div className="flex items-center gap-2 text-[#FFD700]">
                      <MapPin className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Simulador</span>
                    </div>
                    <h4 className="text-3xl font-black text-white tracking-tight">Define tu alcance inicial</h4>
                    <p className="text-zinc-400 leading-relaxed">
                      Usa una proyección corta para empezar rápido. Luego puedes abrir el simulador completo y afinar el plan desde el panel.
                    </p>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Ciudad objetivo</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['Santo Domingo', 'Santiago'].map((city) => (
                          <button
                            key={city}
                            onClick={() => setSimCity(city)}
                            className={`rounded-xl px-3 py-3 text-[11px] font-black uppercase tracking-wide transition-colors border ${
                              simCity === city ? 'bg-[#FFD700] border-[#FFD700] text-black' : 'border-white/5 bg-white/5 text-zinc-400 hover:text-white'
                            }`}
                          >
                            {city}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Presupuesto de referencia</label>
                        <span className="text-2xl font-black text-white">RD$ {simBudget.toLocaleString()}</span>
                      </div>
                      <input
                        type="range"
                        min={1500}
                        max={60000}
                        step={1500}
                        value={simBudget}
                        onChange={(e) => setSimBudget(Number(e.target.value))}
                        className="w-full accent-[#FFD700]"
                      />
                    </div>
                  </>
                )}

                {onboardingStep === 3 && (
                  <>
                    <div className="flex items-center gap-2 text-[#FFD700]">
                      <ChevronRight className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Resumen</span>
                    </div>
                    <h4 className="text-3xl font-black text-white tracking-tight">Así se ve tu arranque</h4>
                    <p className="text-zinc-400 leading-relaxed">
                      Cuando continúes, el dashboard ya quedará listo para operar con métricas, facturación y el simulador completo.
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Pantallas sugeridas</p>
                        <p className="text-3xl font-black text-white mt-2">{simLoading ? '...' : (simulation?.recommendedScreens ?? 0)}</p>
                      </div>
                      <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Impresiones estimadas</p>
                        <p className="text-3xl font-black text-white mt-2">{simLoading ? '...' : (simulation?.totalImpressions ?? 0).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#FFD700]/15 bg-[#FFD700]/5 p-4 text-sm text-zinc-300">
                      {simLoading
                        ? 'Calculando proyección inicial...'
                        : `Ciudad ${simCity} con presupuesto de RD$ ${simBudget.toLocaleString()}. Puedes ajustar esto luego desde el simulador principal.`}
                    </div>
                  </>
                )}
              </div>

              <div className="p-6 md:p-8 bg-black/30 border-t md:border-t-0 md:border-l border-white/5 flex flex-col justify-between gap-4">
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Paso {onboardingStep} de 3</p>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full bg-[#FFD700] transition-all duration-300"
                      style={{ width: `${(onboardingStep / 3) * 100}%` }}
                    />
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">Atajo rápido</p>
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      El simulador de impacto ya está conectado. Al salir de este modal, tu dashboard quedará listo para consultar métricas y finanzas.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setOnboardingStep(s => Math.max(1, s - 1))}
                    disabled={onboardingStep === 1}
                    className="flex-1 rounded-2xl border border-white/5 bg-white/5 py-4 text-sm font-black uppercase tracking-widest text-zinc-400 disabled:opacity-40"
                  >
                    Atrás
                  </button>
                  {onboardingStep < 3 ? (
                    <button
                      onClick={() => setOnboardingStep(s => Math.min(3, s + 1))}
                      className="flex-[1.2] rounded-2xl bg-[#FFD700] py-4 text-sm font-black uppercase tracking-widest text-black"
                    >
                      Continuar
                    </button>
                  ) : (
                    <button
                      onClick={closeOnboarding}
                      className="flex-[1.2] rounded-2xl bg-[#FFD700] py-4 text-sm font-black uppercase tracking-widest text-black"
                    >
                      Abrir dashboard
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
          <div className="bg-[#18181B] p-4 rounded-2xl border border-[#F4F4F5]/5 flex flex-col items-center">
            <span className="text-[10px] font-bold text-[#F4F4F5]/40 uppercase tracking-widest mb-1">Status</span>
            <span className="text-sm font-black text-white">SECURE_NODE</span>
          </div>
          <div className="bg-[#18181B] p-4 rounded-2xl border border-[#F4F4F5]/5 flex flex-col items-center">
            <span className="text-[10px] font-bold text-[#F4F4F5]/40 uppercase tracking-widest mb-1">Live Campaigns</span>
            <span className="text-sm font-black text-[#FFD700]">{data?.stats?.activeCampaigns || 0}</span>
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
          
          <div className="mt-6 p-6 bg-gradient-to-br from-[#18181B] to-[#09090B] rounded-2xl border border-[#F4F4F5]/5">
            <div className="flex items-center gap-3 mb-4">
              <Zap className="text-[#fad400]" size={20} />
              <h4 className="font-bold text-white uppercase text-sm tracking-wider">Despliegue Instantáneo</h4>
            </div>
            <p className="text-xs text-[#F4F4F5]/50 leading-relaxed italic">
              "Nuestro motor de sincronización garantiza que cualquier expansión de pantallas se refleje en su inventario activo en menos de 5 minutos una vez aprobado el pago."
            </p>
          </div>
        </div>

        {/* Module 3: Billing & Finance */}
        <div className="lg:col-span-3">
          <BillingPortal data={data?.financials} />
          
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="p-4 bg-[#18181B]/40 rounded-xl border border-[#F4F4F5]/5">
              <span className="text-[10px] font-bold text-[#F4F4F5]/40 uppercase block mb-1">Último Pago / Factura</span>
              <span className="text-sm font-bold text-white">
                {data?.financials?.latestInvoice?.date || 'Sin registros'}
              </span>
            </div>
            <div className="p-4 bg-[#18181B]/40 rounded-xl border border-[#F4F4F5]/5">
              <span className="text-[10px] font-bold text-[#F4F4F5]/40 uppercase block mb-1">Referencia</span>
              <span className="text-sm font-bold text-white truncate">
                {data?.financials?.latestInvoice?.id || 'TAD-RNC-000'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── ONBOARDING WIZARD OVERLAY ─── */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <div className="w-full max-w-2xl bg-zinc-950/95 border border-white/10 rounded-[2.5rem] p-8 lg:p-12 shadow-2xl relative overflow-hidden transition-all duration-500 max-h-[90vh] overflow-y-auto">
            {/* Ambient Lighting effects */}
            <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-blue-600/10 blur-[100px] rounded-full translate-x-1/4 -translate-y-1/4" />
            <div className="absolute bottom-0 left-0 w-[30%] h-[30%] bg-[#FFD400]/5 blur-[80px] rounded-full -translate-x-1/4 translate-y-1/4" />
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FFD400]/50 to-transparent" />

            {/* Stepper Header */}
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div className="flex gap-2">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={clsx(
                      "h-1.5 rounded-full transition-all duration-300",
                      s === step
                        ? "w-8 bg-[#FFD400] shadow-[0_0_10px_rgba(255,212,0,0.5)]"
                        : s < step
                        ? "w-4 bg-emerald-500"
                        : "w-4 bg-zinc-800"
                    )}
                  />
                ))}
              </div>
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                Paso {step} de 3
              </span>
            </div>

            {/* STEP 1: City Selection */}
            {step === 1 && (
              <div className="space-y-8 relative z-10">
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-white uppercase italic tracking-tight">
                    Selecciona tu <span className="text-[#FFD400]">Ciudad Objetivo</span>
                  </h2>
                  <p className="text-zinc-400 text-xs">
                    Elige el área geográfica donde deseas desplegar tus anuncios publicitarios.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <button
                    onClick={() => {
                      setCity('Santo Domingo');
                      setStep(2);
                    }}
                    className="group p-8 bg-zinc-900/50 hover:bg-zinc-900 border border-white/5 hover:border-[#FFD400]/30 rounded-3xl text-left transition-all hover:scale-[1.02] flex flex-col justify-between h-[220px]"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/10 group-hover:bg-blue-500/20 transition-all">
                      <MapPin className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2 flex items-center gap-2">
                        Santo Domingo
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </h3>
                      <p className="text-zinc-500 text-xs leading-relaxed">
                        Zona Metropolitana y Distrito Nacional. Alta densidad vehicular, tráfico masivo, perfecto para alcance a gran escala.
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setCity('Santiago');
                      setStep(2);
                    }}
                    className="group p-8 bg-zinc-900/50 hover:bg-zinc-900 border border-white/5 hover:border-[#FFD400]/30 rounded-3xl text-left transition-all hover:scale-[1.02] flex flex-col justify-between h-[220px]"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/10 group-hover:bg-cyan-500/20 transition-all">
                      <Compass className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2 flex items-center gap-2">
                        Santiago
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </h3>
                      <p className="text-zinc-500 text-xs leading-relaxed">
                        Ciudad Corazón. Gran dinamismo comercial, rutas focalizadas y alta tasa de retención de anuncios por pasajero.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Budget Selection */}
            {step === 2 && (
              <div className="space-y-8 relative z-10">
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-white uppercase italic tracking-tight">
                    Define tu <span className="text-[#FFD400]">Presupuesto Mensual</span>
                  </h2>
                  <p className="text-zinc-400 text-xs">
                    Ajusta el presupuesto estimado de tu campaña. Calculamos tu alcance usando el motor en tiempo real en <span className="text-white font-bold">{city}</span>.
                  </p>
                </div>

                <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-8 space-y-6">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-[#FFD400]" />
                      Presupuesto Mensual (RD$)
                    </span>
                    <span className="text-4xl font-black text-white tracking-tighter">
                      {new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', maximumFractionDigits: 0 }).format(budget)}
                    </span>
                  </div>

                  <input
                    type="range"
                    min="5000"
                    max="150000"
                    step="5000"
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-[#FFD400] hover:accent-yellow-400 transition-all"
                  />

                  <div className="flex justify-between text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                    <span>RD$ 5,000</span>
                    <span>Recomendado: RD$ 25,000+</span>
                    <span>RD$ 150,000</span>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-4 border border-white/10 hover:border-white/20 text-white font-black uppercase tracking-wider text-xs rounded-2xl transition-all active:scale-[0.98]"
                  >
                    Atrás
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="flex-1 py-4 bg-[#FFD400] hover:bg-yellow-400 text-black font-black uppercase tracking-wider text-xs rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    Ver Proyección
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Impact Summary & Complete */}
            {step === 3 && (
              <div className="space-y-8 relative z-10">
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-white uppercase italic tracking-tight">
                    Tu Proyección de <span className="text-[#FFD400]">Impacto Radial</span>
                  </h2>
                  <p className="text-zinc-400 text-xs">
                    Basado en el presupuesto y la flota activa en <span className="text-white font-bold">{city}</span>.
                  </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-zinc-900/40 rounded-3xl p-6 border border-white/5 text-center">
                    <div className="inline-flex items-center justify-center p-3 rounded-xl bg-blue-500/10 text-blue-400 mb-3">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <span className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Pantallas Asignadas</span>
                    <span className="text-2xl font-black text-white block">
                      {simulationLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#FFD400]" />
                      ) : (
                        simulation?.recommendedScreens || 0
                      )}
                    </span>
                  </div>

                  <div className="bg-zinc-900/40 rounded-3xl p-6 border border-white/5 text-center">
                    <div className="inline-flex items-center justify-center p-3 rounded-xl bg-emerald-500/10 text-emerald-400 mb-3">
                      <Users className="w-5 h-5" />
                    </div>
                    <span className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Alcance Único / Mes</span>
                    <span className="text-2xl font-black text-white block">
                      {simulationLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#FFD400]" />
                      ) : (
                        new Intl.NumberFormat('es-DO').format(simulation?.uniqueReach || 0)
                      )}
                    </span>
                  </div>

                  <div className="bg-zinc-900/40 rounded-3xl p-6 border border-white/5 text-center">
                    <div className="inline-flex items-center justify-center p-3 rounded-xl bg-purple-500/10 text-purple-400 mb-3">
                      <Eye className="w-5 h-5" />
                    </div>
                    <span className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Impresiones / Mes</span>
                    <span className="text-2xl font-black text-white block">
                      {simulationLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#FFD400]" />
                      ) : (
                        new Intl.NumberFormat('es-DO').format(simulation?.totalImpressions || 0)
                      )}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-zinc-900/50 border border-white/5 rounded-2xl flex items-center gap-3 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-left leading-relaxed">
                    ¡Excelente configuración! Tu marca obtendrá alta visibilidad con impactos de 30 segundos repetitivos en rutas estratégicas.
                  </p>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setStep(2)}
                    className="flex-1 py-4 border border-white/10 hover:border-white/20 text-white font-black uppercase tracking-wider text-xs rounded-2xl transition-all active:scale-[0.98]"
                  >
                    Atrás
                  </button>
                  <button
                    onClick={handleCompleteOnboarding}
                    className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase tracking-wider text-xs rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/20"
                  >
                    Confirmar y Finalizar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AdvertiserLayout>
  );
}

