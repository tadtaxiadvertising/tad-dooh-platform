import { useEffect, useState, useCallback, useRef } from 'react';
import { CarFront, Megaphone, CloudUpload, TrendingUp, ShieldCheck, Zap, Cpu, Layers, MessageSquare, Fingerprint, BarChart3, ArrowUpRight, Radio, Server, Activity, MapPin, Wifi, Battery, X, ChevronRight, Users, DollarSign, CheckCircle2, Clock, AlertTriangle, Play, RotateCcw } from 'lucide-react';
import { getDevices, getCampaigns, getMedia, getHourlyPlays, getAnalyticsSummary, getPortalRequests } from '@tad/services';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useTabSync } from '@tad/ui';
import clsx from 'clsx';
import Link from 'next/link';
import { useAuth } from '@tad/ui';

const TIMEOUT_MS = 15000;
const getAdminOnboardingKey = (identity: string) => `tad_admin_onboarding_seen_v2_${identity}`;

// Helper function to add a timeout to any promise
const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> => {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`Request timed out after ${timeoutMs}ms`);
      resolve(fallback);
    }, timeoutMs);
  });

  return Promise.race([
    promise.then(res => {
      clearTimeout(timeoutId);
      return res;
    }),
    timeoutPromise
  ]);
};

export default function Home() {
  const [stats, setStats] = useState({
    devices: 0,
    online: 0,
    campaigns: 0,
    activeCampaigns: 0,
    media: 0,
    totalScans: 0,
    ctr: 0,
    pendingRequests: 0
  });
  
  const [chartData, setChartData] = useState<{ name: string; val: number }[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingChart, setLoadingChart] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [pilotMode, setPilotMode] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { session } = useAuth();
  const adminIdentity =
    session?.user?.email ||
    session?.user?.id ||
    session?.user?.app_metadata?.entityId ||
    'admin';

  const loadData = useCallback(async () => {
    if (!session?.access_token) return;

    setError(null);
    setLoadingStats(true);
    setLoadingChart(true);
    
    // Fetch stats first
    try {
      const results = await Promise.all([
        withTimeout(getDevices().catch(() => []), TIMEOUT_MS, []),
        withTimeout(getCampaigns().catch(() => []), TIMEOUT_MS, []),
        withTimeout(getMedia().catch(() => []), TIMEOUT_MS, []),
        withTimeout(getAnalyticsSummary().catch(() => null), TIMEOUT_MS, null),
        withTimeout(getPortalRequests().catch(() => []), TIMEOUT_MS, [])
      ]);
      
      const [devices, campaigns, media, analytics, portalRequests] = results;
      
      const devicesList = Array.isArray(devices) ? devices : [];
      const filteredDevices = pilotMode 
        ? devicesList.filter((d: any) => (d.device_id || d.deviceId || '').startsWith('STI'))
        : devicesList;

      setStats({
        devices: filteredDevices.length,
        online: filteredDevices.filter((d: any) => d.status === 'online' || d.status === 'OPERATIVO' || d.status === 'ACTIVE' || d.is_online).length,
        campaigns: Array.isArray(campaigns) ? campaigns.length : 0,
        activeCampaigns: Array.isArray(campaigns) ? (campaigns as { active: boolean }[]).filter((c) => c.active).length : 0,
        media: Array.isArray(media) ? media.length : 0,
        totalScans: analytics?.totalScans || 0,
        ctr: analytics?.ctr || 0,
        pendingRequests: Array.isArray(portalRequests) ? portalRequests.filter((r: any) => r.status === 'PENDING').length : 0
      });
      setLoadingStats(false);
    } catch (err) {
      console.error("Dashboard Stats Error:", err);
      setLoadingStats(false);
    }

    // Fetch chart data separately to prevent blocking
    try {
      const hourly = await withTimeout(getHourlyPlays().catch(() => []), TIMEOUT_MS, []);
      if (Array.isArray(hourly) && hourly.length > 0) {
        setChartData((hourly as { hour: string; plays: string | number }[]).sort((a, b) => a.hour.localeCompare(b.hour)).map((d) => ({ name: `${d.hour}:00`, val: Number(d.plays) })));
      } else {
        setChartData([
          { name: '00:00', val: 0 },{ name: '04:00', val: 0 },{ name: '08:00', val: 0 },
          { name: '12:00', val: 0 },{ name: '16:00', val: 0 },{ name: '20:00', val: 0 },{ name: '23:59', val: 0 },
        ]);
      }
      setLoadingChart(false);
    } catch (err) {
      console.error("Dashboard Chart Error:", err);
      setLoadingChart(false);
    }
  }, [pilotMode, session]);

  useTabSync(['DEVICES', 'CAMPAIGNS', 'MEDIA', 'TAD_DRIVERS', 'FINANCE'], loadData);

  useEffect(() => {
    setMounted(true);
    if (session) {
      loadData();
    }
    // Trigger admin induction tour on first login
    const alreadyOnboarded = localStorage.getItem('tad_admin_onboarded');
    if (!alreadyOnboarded) {
      setShowTour(true);
    }
  }, [loadData, session]);

  // Polling for live activity (every 60 seconds)
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      loadData();
    }, 60000);
    return () => clearInterval(interval);
  }, [loadData, session]);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined' || !adminIdentity) return;

    const onboardingKey = getAdminOnboardingKey(adminIdentity);
    if (localStorage.getItem(onboardingKey) !== '1') {
      setShowOnboarding(true);
    }
  }, [adminIdentity, mounted]);

  const closeOnboarding = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(getAdminOnboardingKey(adminIdentity), '1');
    }
    setShowOnboarding(false);
  };

  if (!mounted) return null;

  const handleTourComplete = () => {
    localStorage.setItem('tad_admin_onboarded', 'true');
    setShowTour(false);
  };

  return (
    <div className="min-h-screen pb-12 animate-in fade-in duration-1000 relative selection:bg-tad-yellow selection:text-black font-sans mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
      {showTour && <AdminInductionTour onComplete={handleTourComplete} />}
      {/* 🧵 Enhanced Stitched Layer: Background Glows */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
         <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-tad-yellow/[0.03] blur-[200px] rounded-full animate-pulse-soft" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-500/[0.02] blur-[150px] rounded-full" />
      </div>

      {showOnboarding && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/85 backdrop-blur-xl p-4">
          <div className="w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950 shadow-[0_30px_120px_rgba(0,0,0,0.85)]">
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Zero-Flicker Onboarding</p>
                <h2 className="text-xl font-black tracking-tight text-white">Ruta inicial de operación TAD</h2>
              </div>
              <button
                onClick={closeOnboarding}
                className="rounded-full bg-white/5 px-3 py-2 text-sm font-black text-zinc-400 transition hover:bg-white/10 hover:text-white"
                aria-label="Cerrar tour"
              >
                Cerrar
              </button>
            </div>

            <div className="grid gap-0 md:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-6 p-6 md:p-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-tad-yellow/20 bg-tad-yellow/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-tad-yellow">
                  <ShieldCheck className="h-4 w-4" />
                  Acceso blindado
                </div>
                <div>
                  <h3 className="text-3xl font-black tracking-tight text-white">Tres puntos de control para abrir turno sin castigar el VPS</h3>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
                    El middleware ya te deja entrar sin flicker. Lo importante ahora es revisar flota en vivo, validar salud de nodos y ejecutar nómina en lotes secuenciales de 5 para proteger memoria y estabilidad.
                  </p>
                </div>

                <div className="grid gap-4">
                  <Link href="/admin/tracking" onClick={closeOnboarding} className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5 transition hover:border-tad-yellow/30 hover:bg-white/[0.05]">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-tad-yellow/10 text-tad-yellow">
                        <Activity className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Tracking vivo</p>
                        <h4 className="mt-1 text-xl font-black text-white">Mapa de flota y wake-up inmediato</h4>
                        <p className="mt-2 text-sm text-zinc-400">
                          Confirma taxis online, morosos y alertas críticas. Este es el punto para coordinar sincronizaciones sobre el canal `fleet_sync`.
                        </p>
                      </div>
                    </div>
                  </Link>

                  <Link href="/admin/monitoring" onClick={closeOnboarding} className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5 transition hover:border-tad-yellow/30 hover:bg-white/[0.05]">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300">
                        <Server className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Monitoreo y semáforos</p>
                        <h4 className="mt-1 text-xl font-black text-white">Conectividad, batería y salud del player</h4>
                        <p className="mt-2 text-sm text-zinc-400">
                          Usa este panel para leer heartbeat, estabilidad del player y el estado general de las tablets antes de tocar campañas o media.
                        </p>
                      </div>
                    </div>
                  </Link>

                  <Link href="/admin/finance" onClick={closeOnboarding} className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5 transition hover:border-tad-yellow/30 hover:bg-white/[0.05]">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
                        <BarChart3 className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Nómina segura</p>
                        <h4 className="mt-1 text-xl font-black text-white">Procesa pagos en ráfagas de 5</h4>
                        <p className="mt-2 text-sm text-zinc-400">
                          Mantén las corridas pequeñas y secuenciales para cuidar el VPS de 512MB-1024MB y reducir picos de Prisma en memoria.
                        </p>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>

              <div className="border-t border-white/5 bg-black/30 p-6 md:border-l md:border-t-0 md:p-8">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Checklist operativo</p>
                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">1. Tracking</p>
                    <p className="mt-2 text-sm text-zinc-300">Confirma unidades activas, morosos y nodos con más de 3 días offline.</p>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">2. Monitoring</p>
                    <p className="mt-2 text-sm text-zinc-300">Valida batería, heartbeat y estado del player antes de tocar campañas o media.</p>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">3. Payroll</p>
                    <p className="mt-2 text-sm text-zinc-300">Ejecuta lotes cortos de 5 y confirma cierres antes de seguir con el siguiente bloque.</p>
                  </div>
                </div>

                <button
                  onClick={closeOnboarding}
                  className="mt-6 w-full rounded-2xl bg-tad-yellow px-5 py-4 text-sm font-black uppercase tracking-[0.2em] text-black transition hover:bg-yellow-400"
                >
                  Entrar al Command Center
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <header className="pt-10 mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <div className="space-y-3">
          <div className="flex items-center gap-3 opacity-80 backdrop-blur-sm bg-black/20 w-fit px-4 py-1.5 rounded-full border border-white/5">
            <Fingerprint className="w-4 h-4 text-tad-yellow" />
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">Node ID: DOOH_NEXUS_v5.4</p>
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-tad-yellow to-yellow-600 drop-shadow-sm">
            Command Center
          </h1>
          <p className="text-gray-400 text-sm font-medium pl-1">Gestión Inteligente de Flota Publicitaria TAD</p>
        </div>
        
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setPilotMode(!pilotMode)}
            className={clsx(
              "flex items-center gap-3 px-6 py-3 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all duration-300",
              pilotMode 
                ? "bg-tad-yellow border-tad-yellow text-black shadow-[0_0_30px_rgba(255,212,0,0.4)]" 
                : "bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 hover:border-white/20"
            )}
          >
            <ShieldCheck className={clsx("w-4 h-4", pilotMode ? "text-black" : "text-zinc-500")} />
            {pilotMode ? 'STI PILOT ACTIVE' : 'SANTIAGO PILOT'}
          </button>

          <button
            onClick={() => setShowOnboarding(true)}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-300 transition-all duration-300 hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            <Activity className="h-4 w-4 text-tad-yellow" />
            Tour operativo
          </button>

          <div className="flex flex-col items-end bg-black/30 p-3 rounded-2xl border border-white/5 backdrop-blur-md">
            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-1">System State</span>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_#10b981] animate-pulse" />
              <span className="text-sm font-black text-white uppercase tracking-wider">Online</span>
            </div>
          </div>
        </div>
      </header>

      {/* Alert Banner for pending requests */}
      {stats.pendingRequests > 0 && !loadingStats && (
         <Link href="/admin/advertisers/requests" className="mb-10 block animate-in slide-in-from-top-4 fade-in duration-500">
            <div className="bg-gradient-to-r from-tad-yellow/90 to-yellow-600 border border-tad-yellow/50 rounded-[2rem] p-6 flex items-center justify-between group hover:scale-[1.01] transition-transform shadow-[0_20px_50px_rgba(250,212,0,0.2)] backdrop-blur-xl">
               <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-black/90 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner">
                     <MessageSquare className="w-7 h-7 text-tad-yellow" />
                  </div>
                  <div>
                     <h3 className="text-xl font-black uppercase tracking-tight text-black mb-1">Portal Requests Pending</h3>
                     <p className="text-[11px] font-bold uppercase tracking-widest text-black/70">
                       You have {stats.pendingRequests} new {stats.pendingRequests === 1 ? 'request' : 'requests'} waiting for review.
                     </p>
                  </div>
               </div>
               <div className="flex items-center gap-4">
                  <span className="hidden md:block text-[10px] font-black uppercase tracking-widest text-black">Review Now</span>
                  <div className="w-12 h-12 bg-black/10 rounded-2xl flex items-center justify-center group-hover:bg-black group-hover:text-tad-yellow transition-colors duration-300">
                     <ArrowUpRight className="w-6 h-6" />
                  </div>
               </div>
            </div>
         </Link>
      )}

      {/* Primary Metrics: Premium Glassmorphic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {loadingStats ? (
             Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[220px] bg-white/5 rounded-[2.5rem] animate-pulse border border-white/5 flex flex-col justify-between p-8 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                  <div className="w-12 h-12 rounded-2xl bg-white/10" />
                  <div className="space-y-4">
                    <div className="h-3 w-24 bg-white/10 rounded-full" />
                    <div className="h-10 w-16 bg-white/10 rounded-full" />
                    <div className="h-2 w-32 bg-white/10 rounded-full" />
                  </div>
                </div>
             ))
        ) : (
          [
            { icon: <CarFront />, label: "Pantallas Activas", value: stats.devices, sub: `${stats.online} Sesiones Online`, trend: "+12%", primary: true },
            { icon: <Megaphone />, label: "Flujo de Campañas", value: stats.campaigns, sub: `${stats.activeCampaigns} Activas`, trend: "Live", primary: false },
            { icon: <CloudUpload />, label: "Media Assets", value: stats.media, sub: "S3 Storage Sync", trend: "99.9%", primary: false },
            { icon: <Zap />, label: "Escaneos 24H", value: stats.totalScans.toLocaleString(), sub: `${stats.ctr.toFixed(2)}% Conversion`, trend: "Active", primary: true }
          ].map((s, i) => (
            <PremiumStatCard key={i} {...s} delay={i * 100} />
          ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Main Analytics Terminal */}
        <div className="lg:col-span-2 space-y-6 lg:space-y-8">
          <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-6 lg:p-8 shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-tad-yellow/[0.02] blur-[100px] rounded-full pointer-events-none transition-opacity duration-700 opacity-50 group-hover:opacity-100" />
             
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative z-10">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
                     <TrendingUp className="w-6 h-6 text-tad-yellow" />
                   </div>
                   <div>
                     <h3 className="text-2xl font-black text-white mb-1 tracking-tight">Impactos por Hora</h3>
                     <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Frecuencia de Flota Verificada</p>
                   </div>
                </div>
                 <div className="flex gap-2 bg-black/50 p-1.5 rounded-full border border-white/10">
                   {['Live', '24H', '7D'].map((t) => (
                      <button key={t} className={clsx(
                        "px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-300", 
                        t === '24H' ? "bg-tad-yellow text-black shadow-[0_0_15px_rgba(255,212,0,0.4)]" : "text-gray-400 hover:text-white hover:bg-white/5"
                      )}>{t}</button>
                   ))}
                </div>
             </div>

             <div className="h-[350px] relative w-full overflow-hidden flex items-center justify-center bg-black/20 rounded-3xl border border-white/5 p-4">
               {loadingChart ? (
                   <div className="flex flex-col items-center justify-center text-center gap-6 animate-in zoom-in duration-700">
                     <div className="relative">
                        <Activity className="w-16 h-16 text-tad-yellow absolute inset-0 animate-ping opacity-20" />
                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner relative z-10 backdrop-blur-sm">
                           <Activity className="w-8 h-8 text-tad-yellow animate-pulse" />
                        </div>
                     </div>
                     <div>
                        <p className="text-[10px] font-black tracking-[0.4em] uppercase text-zinc-400 mb-2">Analyzing Telemetry</p>
                        <p className="text-[9px] font-bold text-tad-yellow/80 uppercase italic">Syncing with neural core...</p>
                     </div>
                   </div>
                 ) : (
                   <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                       <defs>
                          <linearGradient id="chartGradientMain" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FFD400" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#FFD400" stopOpacity={0}/>
                          </linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                       <XAxis dataKey="name" stroke="#52525b" fontSize={10} axisLine={false} tickLine={false} dy={15} tick={{ fill: '#71717a', fontWeight: 700 }} />
                       <YAxis stroke="#52525b" fontSize={10} axisLine={false} tickLine={false} dx={-10} tick={{ fill: '#71717a', fontWeight: 700 }} />
                       <Tooltip 
                         cursor={{ stroke: 'rgba(255,212,0,0.2)', strokeWidth: 2, strokeDasharray: '5 5' }}
                         contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,212,0,0.3)', borderRadius: '1rem', fontSize: '12px', backdropFilter: 'blur(12px)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                         itemStyle={{ color: '#FFD400', fontWeight: '900' }}
                         labelStyle={{ color: '#fff', marginBottom: '8px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                       />
                       <Area 
                         type="monotone" 
                         dataKey="val" 
                         stroke="#FFD400" 
                         strokeWidth={4} 
                         fillOpacity={1} 
                         fill="url(#chartGradientMain)" 
                         animationDuration={1500}
                         activeDot={{ r: 6, fill: '#FFD400', stroke: '#000', strokeWidth: 4, style: { filter: 'drop-shadow(0 0 8px rgba(255,212,0,0.8))' } }}
                       />
                     </AreaChart>
                   </ResponsiveContainer>
                 )}
             </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
            <PremiumInfoCard 
              icon={<Server className="text-tad-yellow w-6 h-6" />}
              title="Decentralized Network"
              label="PROTOCOL_V4"
              description="Nodos distribuidos operando con sincronización atómica. Network Latency: 24ms."
              progress={88}
              primary={true}
              uid="net"
            />
            <PremiumInfoCard 
              icon={<Layers className="text-blue-400 w-6 h-6" />}
              title="Content Layer"
              label="S3_INTEGRITY"
              description="Verificación hash de activos multimedia completada. 0 fallos detectados."
              progress={100}
              primary={false}
              uid="s3"
            />
          </div>

          {/* ⚡ Fleet Pulse Terminal */}
          <FleetPulseTerminal />

          {/* 💰 Sequential Payroll Batcher */}
          <PayrollBatcher />
        </div>

        {/* Intelligence Sidebar */}
        <aside className="space-y-6 lg:space-y-8">
          <div className="bg-gradient-to-b from-black/80 to-black border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden group shadow-2xl">
             <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/10 blur-[50px] rounded-full" />
             <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-8 border border-white/10 shadow-inner group-hover:scale-110 group-hover:border-emerald-500/30 transition-all duration-500">
                <ShieldCheck className="w-8 h-8 text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
             </div>
             <h4 className="text-2xl font-black text-white mb-4 tracking-tight">Security Layer</h4>
             <p className="text-sm text-gray-400 mb-8 leading-relaxed font-medium">
               Protección biométrica y cifrado TLS 1.3 activo. Auditoría de nodos automática cada 300 segundos. Integridad validada.
             </p>
             <div className="flex items-center justify-between p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_#10b981] animate-pulse" />
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">SISTEMA BLINDADO</span>
                </div>
                <span className="text-[10px] font-black text-emerald-500/50">SEC-9</span>
             </div>
          </div>

          <Link href="/admin/analytics" className="block bg-black/60 backdrop-blur-md border border-white/10 rounded-[2.5rem] p-8 group hover:border-tad-yellow/30 transition-all duration-500 relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-tr from-tad-yellow/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
             <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="w-14 h-14 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center group-hover:bg-tad-yellow/10 group-hover:border-tad-yellow/30 transition-colors duration-300">
                   <BarChart3 className="w-7 h-7 text-white group-hover:text-tad-yellow transition-colors" />
                </div>
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-tad-yellow group-hover:text-black transition-all duration-300">
                  <ArrowUpRight className="w-5 h-5 text-gray-500 group-hover:text-black" />
                </div>
             </div>
             <h4 className="text-2xl font-black text-white mb-2 tracking-tight relative z-10">Intelligence Engine</h4>
             <p className="text-[10px] text-gray-500 font-bold tracking-[0.2em] uppercase relative z-10">Deep Analytics Access</p>
          </Link>

          <div className="p-8 border border-dashed border-white/10 rounded-[2.5rem] bg-black/20 flex flex-col items-center text-center group hover:border-tad-yellow/20 transition-all duration-500">
             <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:bg-tad-yellow/10 transition-colors">
               <Cpu className="w-6 h-6 text-gray-600 group-hover:text-tad-yellow transition-colors" />
             </div>
             <p className="text-[10px] font-black text-gray-600 tracking-[0.4em] font-mono group-hover:text-tad-yellow/60 transition-colors">TAD_CORE_v5.4</p>
          </div>

          {/* 🔁 Re-trigger tour button */}
          <button
            onClick={() => { localStorage.removeItem('tad_admin_onboarded'); setShowTour(true); }}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-white/5 bg-white/[0.02] text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-tad-yellow hover:border-tad-yellow/20 hover:bg-tad-yellow/5 transition-all duration-300"
          >
            <Radio className="w-3.5 h-3.5" />
            Ver Tour de Inducción
          </button>
        </aside>
      </div>
    </div>
  );
}

function PremiumStatCard({ icon, label, value, sub, primary, delay }: any) {
  return (
    <div className={clsx(
      "bg-black/40 backdrop-blur-xl border rounded-[2.5rem] p-8 flex flex-col justify-between min-h-[220px] group relative overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl",
      primary ? "border-tad-yellow/30 hover:border-tad-yellow/60" : "border-white/10 hover:border-white/30",
      "animate-in fade-in slide-in-from-bottom-8 fill-mode-both"
    )} style={{ animationDelay: `${delay}ms` }}>
      
      {primary && (
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-tad-yellow/10 blur-[30px] rounded-full group-hover:bg-tad-yellow/20 transition-colors duration-500" />
      )}

      <div className="flex justify-between items-start relative z-10">
        <div className={clsx(
          "w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-500 shadow-inner",
          primary 
            ? 'bg-tad-yellow border-tad-yellow/50 text-black shadow-[0_0_20px_rgba(255,212,0,0.3)] group-hover:shadow-[0_0_30px_rgba(255,212,0,0.5)]' 
            : 'bg-white/5 border-white/10 text-white group-hover:bg-white/10'
        )}>
          {icon}
        </div>
        <div className={clsx(
          "w-2 h-2 rounded-full transition-all duration-500 shadow-[0_0_10px_currentColor]",
          primary ? "bg-tad-yellow text-tad-yellow" : "bg-white/30 text-white group-hover:bg-white/60"
        )} />
      </div>
      
      <div className="relative z-10 mt-6">
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">{label}</p>
        <h3 className={clsx(
          "text-5xl lg:text-6xl font-black tracking-tighter mb-4 leading-none",
          primary ? 'text-transparent bg-clip-text bg-gradient-to-r from-white to-tad-yellow' : 'text-white'
        )}>
          {typeof value === 'number' && value < 10 ? `0${value}` : value}
        </h3>
        <div className="flex items-center gap-2">
          <div className={clsx("w-1.5 h-1.5 rounded-full", primary ? "bg-tad-yellow/80" : "bg-white/40")} />
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{sub}</p>
        </div>
      </div>
    </div>
  );
}

function PremiumInfoCard({ icon, title, label, description, progress, primary, uid }: any) {
  return (
    <div className="bg-black/60 backdrop-blur-lg border border-white/10 rounded-[2.5rem] p-8 group relative overflow-hidden hover:border-white/20 transition-all duration-500 shadow-xl">
      <div className="flex items-center gap-4 mb-6 relative z-10">
        <div className={clsx(
          "w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 shadow-inner transition-colors duration-500",
          primary ? "bg-tad-yellow/10 border-tad-yellow/30 group-hover:border-tad-yellow/50" : "bg-white/5 border-white/10 group-hover:border-white/20"
        )}>
          {icon}
        </div>
        <div>
          <h4 className="text-white font-black text-xl tracking-tight leading-none mb-1.5">{title}</h4>
          <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.25em]">{label}</span>
        </div>
      </div>
      <p className="text-sm text-gray-400 leading-relaxed font-medium mb-8 relative z-10">
        {description}
      </p>
      <div className="space-y-3 relative z-10">
        <div className="flex justify-between items-end">
          <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">System Status</span>
          <span className="text-xs font-black text-white">{progress}%</span>
        </div>
        <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden p-[2px] border border-white/5">
          <div className={clsx(
            `progress-bar-${uid}`,
            "h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_12px_currentColor]",
            primary ? 'bg-tad-yellow text-tad-yellow' : 'bg-blue-500 text-blue-500'
          )} style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// 🎓 ADMIN INDUCTION TOUR — 3-Step Glassmorphic Overlay
// ══════════════════════════════════════════════════════════════
const TOUR_STEPS = [
  {
    id: 'welcome',
    icon: <Fingerprint className="w-8 h-8 text-tad-yellow" />,
    tag: 'STEP_01 // ACCESO MAESTRO',
    title: 'Bienvenido al Command Center',
    description: 'Este es el núcleo de control operativo de la Flota TAD. Desde aquí monitorizas en tiempo real cada pantalla publicitaria en la red de taxis de la República Dominicana.',
    highlight: null,
    color: 'tad-yellow',
  },
  {
    id: 'tracking',
    icon: <MapPin className="w-8 h-8 text-cyan-400" />,
    tag: 'STEP_02 // GPS EN VIVO',
    title: 'Mapa de Flota en Tiempo Real',
    description: 'Accede a /admin/tracking para ver la posición GPS en vivo de cada taxi con una pantalla TAD activa. Puedes filtrar por zona (STI/SDQ), estado de conectividad y batería.',
    highlight: '/admin/tracking',
    color: 'cyan-400',
    ctaHref: '/admin/tracking',
    ctaLabel: 'Abrir Mapa GPS',
  },
  {
    id: 'semaphores',
    icon: <Wifi className="w-8 h-8 text-emerald-400" />,
    tag: 'STEP_03 // SEMÁFOROS DE SALUD',
    title: 'Semáforos de Conectividad y Batería',
    description: 'En /admin/monitoring cada dispositivo muestra un semáforo de 3 estados: Verde (Online >80% batería), Amarillo (Latencia alta o batería 20-80%), Rojo (Offline o batería crítica <20%). Usa la Nómina por Lotes en el Dashboard para procesar pagos de forma segura.',
    highlight: '/admin/monitoring',
    color: 'emerald-400',
    ctaHref: '/admin/monitoring',
    ctaLabel: 'Ver Monitoreo',
  },
];

function AdminInductionTour({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);
  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  const advance = () => {
    if (isLast) {
      setExiting(true);
      setTimeout(() => onComplete(), 400);
    } else {
      setStep(s => s + 1);
    }
  };

  const dismiss = () => {
    setExiting(true);
    setTimeout(() => onComplete(), 400);
  };

  return (
    <div
      className={clsx(
        'fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-400',
        exiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      )}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        onClick={dismiss}
      />

      {/* Tour Card */}
      <div
        className="relative z-10 w-full max-w-lg animate-in zoom-in-95 fade-in duration-500"
        key={step}
      >
        {/* Corner glow */}
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-tad-yellow/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-cyan-500/5 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative bg-black/90 border border-white/10 rounded-[2.5rem] p-8 shadow-[0_40px_120px_rgba(0,0,0,0.8)] overflow-hidden">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-tad-yellow/60 to-transparent" />

          {/* Dismiss */}
          <button
            onClick={dismiss}
            className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-all"
            aria-label="Cerrar tour"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Step tag */}
          <div className="flex items-center gap-2 mb-6">
            <span className="text-[9px] font-black uppercase tracking-[0.35em] text-tad-yellow/70 font-mono">
              {current.tag}
            </span>
          </div>

          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-inner">
            {current.icon}
          </div>

          {/* Title */}
          <h2 className="text-3xl font-black text-white tracking-tight mb-3">
            {current.title}
          </h2>

          {/* Description */}
          <p className="text-sm text-gray-400 leading-relaxed mb-6">
            {current.description}
          </p>

          {/* Highlight path pill */}
          {current.highlight && (
            <div className="flex items-center gap-2 mb-8 p-3 rounded-2xl bg-white/5 border border-white/5 w-fit">
              <div className="w-1.5 h-1.5 rounded-full bg-tad-yellow animate-pulse" />
              <code className="text-xs text-tad-yellow font-mono font-bold">{current.highlight}</code>
            </div>
          )}

          {/* Progress dots */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {TOUR_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={clsx(
                    'rounded-full transition-all duration-300',
                    i === step
                      ? 'w-6 h-2 bg-tad-yellow shadow-[0_0_8px_rgba(255,212,0,0.6)]'
                      : i < step
                      ? 'w-2 h-2 bg-tad-yellow/40'
                      : 'w-2 h-2 bg-white/10'
                  )}
                />
              ))}
            </div>

            <div className="flex items-center gap-3">
              {(current as any).ctaHref && (
                <Link
                  href={(current as any).ctaHref}
                  className="px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all"
                >
                  {(current as any).ctaLabel}
                </Link>
              )}
              <button
                onClick={advance}
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-tad-yellow text-black text-[10px] font-black uppercase tracking-widest hover:bg-yellow-400 transition-all shadow-[0_0_20px_rgba(255,212,0,0.3)] hover:shadow-[0_0_30px_rgba(255,212,0,0.5)]"
              >
                {isLast ? (
                  <><CheckCircle2 className="w-3.5 h-3.5" /> Comenzar</>
                ) : (
                  <>Siguiente <ChevronRight className="w-3.5 h-3.5" /></>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// 💰 SEQUENTIAL PAYROLL BATCHER — 15 drivers, 3×5 async batches
// ══════════════════════════════════════════════════════════════
const MOCK_DRIVERS = [
  { id: 'DRV-001', name: 'Carlos Méndez',    ads: 15, cpa: 2 },
  { id: 'DRV-002', name: 'Ana Rodríguez',    ads: 12, cpa: 1 },
  { id: 'DRV-003', name: 'Luis Fernández',   ads: 15, cpa: 3 },
  { id: 'DRV-004', name: 'María Santos',     ads: 9,  cpa: 0 },
  { id: 'DRV-005', name: 'Pedro Jiménez',    ads: 15, cpa: 4 },
  { id: 'DRV-006', name: 'Rosa Martínez',    ads: 11, cpa: 2 },
  { id: 'DRV-007', name: 'Juan García',      ads: 15, cpa: 1 },
  { id: 'DRV-008', name: 'Elena Torres',     ads: 7,  cpa: 0 },
  { id: 'DRV-009', name: 'Miguel Herrera',   ads: 15, cpa: 5 },
  { id: 'DRV-010', name: 'Carmen López',     ads: 13, cpa: 2 },
  { id: 'DRV-011', name: 'Roberto Díaz',     ads: 15, cpa: 3 },
  { id: 'DRV-012', name: 'Sandra Vargas',    ads: 8,  cpa: 1 },
  { id: 'DRV-013', name: 'Andrés Castillo',  ads: 15, cpa: 6 },
  { id: 'DRV-014', name: 'Patricia Flores',  ads: 10, cpa: 2 },
  { id: 'DRV-015', name: 'Francisco Morales',ads: 14, cpa: 3 },
];

type PayrollEntry = {
  driver: typeof MOCK_DRIVERS[0];
  earnings: number;
  status: 'pending' | 'processing' | 'done' | 'error';
};

type BatchLog = { id: string; msg: string; time: string; type: 'info' | 'success' | 'warn' };

function PayrollBatcher() {
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [entries, setEntries] = useState<PayrollEntry[]>(
    MOCK_DRIVERS.map(d => ({ driver: d, earnings: 0, status: 'pending' }))
  );
  const [logs, setLogs] = useState<BatchLog[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const runningRef = useRef(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string, type: BatchLog['type'] = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [{ id: `${Date.now()}-${Math.random()}`, msg, time, type }, ...prev].slice(0, 40));
  };

  const delay = (ms: number) => new Promise<void>(res => setTimeout(res, ms));

  const runBatcher = async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setPhase('running');
    setProgress(0);
    setCurrentBatch(0);
    setLogs([]);
    setEntries(MOCK_DRIVERS.map(d => ({ driver: d, earnings: 0, status: 'pending' })));

    const BATCH_SIZE = 5;
    const totalDrivers = MOCK_DRIVERS.length;
    let processed = 0;

    addLog('🚀 Iniciando procesador de nómina TAD v12...', 'info');
    addLog(`📋 Total conductores: ${totalDrivers} | Lotes: ${Math.ceil(totalDrivers / BATCH_SIZE)} × ${BATCH_SIZE}`, 'info');
    await delay(400);

    for (let batchIdx = 0; batchIdx < Math.ceil(totalDrivers / BATCH_SIZE); batchIdx++) {
      const batchStart = batchIdx * BATCH_SIZE;
      const batchDrivers = MOCK_DRIVERS.slice(batchStart, batchStart + BATCH_SIZE);
      setCurrentBatch(batchIdx + 1);

      addLog(`⚡ Procesando Lote ${batchIdx + 1} (conductores ${batchStart + 1}-${batchStart + batchDrivers.length})...`, 'info');

      // Mark batch as 'processing'
      setEntries(prev => prev.map((e, idx) =>
        idx >= batchStart && idx < batchStart + BATCH_SIZE
          ? { ...e, status: 'processing' }
          : e
      ));

      await delay(300);

      // Process each driver in the batch
      for (let di = 0; di < batchDrivers.length; di++) {
        const drv = batchDrivers[di];
        const earnings = (Math.min(drv.ads, 15) * 500) + (drv.cpa * 500);
        const globalIdx = batchStart + di;

        await delay(120);

        setEntries(prev => prev.map((e, idx) =>
          idx === globalIdx
            ? { ...e, earnings, status: 'done' }
            : e
        ));

        processed++;
        setProgress(Math.round((processed / totalDrivers) * 100));
        addLog(`✅ ${drv.id} · ${drv.name} → RD$${earnings.toLocaleString()}`, 'success');
      }

      // Inter-batch delay to protect RAM (512MB VPS safeguard)
      if (batchIdx < Math.ceil(totalDrivers / BATCH_SIZE) - 1) {
        addLog(`⏳ Pausa de seguridad (800ms) antes del Lote ${batchIdx + 2}...`, 'warn');
        await delay(800);
      }
    }

    const totalPayoutFinal = MOCK_DRIVERS.reduce((acc, d) => acc + (Math.min(d.ads, 15) * 500 + d.cpa * 500), 0);
    addLog(`🎉 Nómina completada. Total desembolsado: RD$${totalPayoutFinal.toLocaleString()}`, 'success');
    addLog('🔒 Registros archivados. RAM liberada. Sistema estabilizado.', 'info');
    setPhase('done');
    runningRef.current = false;
  };

  const resetBatcher = () => {
    setPhase('idle');
    setProgress(0);
    setCurrentBatch(0);
    setLogs([]);
    setEntries(MOCK_DRIVERS.map(d => ({ driver: d, earnings: 0, status: 'pending' })));
    runningRef.current = false;
  };

  const totalPayout = MOCK_DRIVERS.reduce((acc, d) => acc + (Math.min(d.ads, 15) * 500 + d.cpa * 500), 0);

  return (
    <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
      {/* Top glow accent */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-tad-yellow/40 to-transparent" />
      <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-32 bg-tad-yellow/[0.04] blur-[60px] rounded-full pointer-events-none" />

      <div className="p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-tad-yellow/10 border border-tad-yellow/20 flex items-center justify-center shadow-inner">
              <DollarSign className="w-7 h-7 text-tad-yellow" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white tracking-tight">Procesador de Nómina</h3>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-500">Sequential Batching · 3 × 5 Drivers</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
            <div className={clsx(
              'w-2 h-2 rounded-full transition-colors',
              phase === 'running' ? 'bg-tad-yellow animate-pulse shadow-[0_0_8px_rgba(255,212,0,0.8)]'
              : phase === 'done' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
              : 'bg-white/20'
            )} />
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
              {phase === 'idle' ? 'STANDBY' : phase === 'running' ? `LOTE ${currentBatch}/3` : 'COMPLETADO'}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-500">Progreso Global</span>
            <span className="text-xs font-black text-white">{progress}%</span>
          </div>
          <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/5 p-[2px]">
            <div
              className="h-full rounded-full transition-all duration-300 ease-out bg-gradient-to-r from-tad-yellow to-yellow-500 shadow-[0_0_12px_rgba(255,212,0,0.5)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            {[1, 2, 3].map(b => (
              <div key={b} className={clsx(
                'flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider transition-colors duration-300',
                currentBatch > b ? 'text-tad-yellow'
                : currentBatch === b && phase === 'running' ? 'text-white'
                : 'text-white/20'
              )}>
                <div className={clsx(
                  'w-1.5 h-1.5 rounded-full',
                  currentBatch > b ? 'bg-tad-yellow'
                  : currentBatch === b && phase === 'running' ? 'bg-white animate-pulse'
                  : 'bg-white/20'
                )} />
                Lote {b}
              </div>
            ))}
          </div>
        </div>

        {/* Driver Grid — mini status rows */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {entries.map((e) => (
            <div
              key={e.driver.id}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-mono transition-all duration-300',
                e.status === 'done'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : e.status === 'processing'
                  ? 'bg-tad-yellow/10 border-tad-yellow/20 text-tad-yellow animate-pulse'
                  : 'bg-white/[0.03] border-white/5 text-zinc-600'
              )}
            >
              <div className={clsx(
                'w-1.5 h-1.5 rounded-full shrink-0',
                e.status === 'done' ? 'bg-emerald-500'
                : e.status === 'processing' ? 'bg-tad-yellow animate-pulse'
                : 'bg-white/10'
              )} />
              <span className="truncate">{e.driver.id}</span>
              {e.status === 'done' && (
                <span className="ml-auto shrink-0 text-emerald-400 font-black">✓</span>
              )}
            </div>
          ))}
        </div>

        {/* Live Log Terminal */}
        <div className="bg-[#030303] border border-white/5 rounded-2xl p-4 font-mono text-[11px] h-[140px] overflow-y-auto space-y-1.5 mb-6 relative" id="payroll-log">
          {logs.length === 0 ? (
            <p className="text-zinc-700 italic">{'>'} Batcher en espera. Presiona EJECUTAR para iniciar...</p>
          ) : (
            logs.map(log => (
              <div key={log.id} className="flex gap-3 leading-relaxed">
                <span className="text-zinc-600 shrink-0">[{log.time}]</span>
                <span className={clsx(
                  'font-bold',
                  log.type === 'success' ? 'text-emerald-400'
                  : log.type === 'warn' ? 'text-yellow-400'
                  : 'text-blue-400'
                )}>{log.msg}</span>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>

        {/* Summary row when done */}
        {phase === 'done' && (
          <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-xs font-black text-white">Nómina Procesada Exitosamente</p>
                <p className="text-[10px] text-gray-500">15 conductores · 3 lotes secuenciales</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-0.5">Total Desembolsado</p>
              <p className="text-lg font-black text-emerald-400">RD${totalPayout.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {phase !== 'running' && (
            <button
              onClick={phase === 'done' ? resetBatcher : runBatcher}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300',
                phase === 'done'
                  ? 'bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
                  : 'bg-tad-yellow text-black shadow-[0_0_20px_rgba(255,212,0,0.3)] hover:shadow-[0_0_30px_rgba(255,212,0,0.5)] hover:bg-yellow-400'
              )}
            >
              {phase === 'done' ? (
                <><RotateCcw className="w-4 h-4" /> Reiniciar</>  
              ) : (
                <><Play className="w-4 h-4" /> Ejecutar Nómina</>  
              )}
            </button>
          )}
          {phase === 'running' && (
            <div className="flex-1 flex items-center justify-center gap-3 py-3.5 rounded-2xl bg-tad-yellow/5 border border-tad-yellow/20 text-[11px] font-black uppercase tracking-widest text-tad-yellow">
              <Clock className="w-4 h-4 animate-spin" style={{ animationDuration: '2s' }} />
              Procesando Lote {currentBatch} / 3...
            </div>
          )}
        </div>
      </div>

      {/* RAM safeguard badge */}
      <div className="px-8 pb-6">
        <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5">
          <AlertTriangle className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
          <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">
            RAM Safeguard activo · VPS 512MB · Batches secuenciales con 800ms de pausa inter-lote
          </p>
        </div>
      </div>
    </div>
  );
}

function FleetPulseTerminal() {
  const [logs, setLogs] = useState<{ id: string; msg: string; time: string; type: 'success' | 'warn' | 'info' | 'error' }[]>([]);

  useEffect(() => {
    const prefixes = ['STI', 'SDQ', 'POP'];
    const generateLog = () => {
      const id = `${prefixes[Math.floor(Math.random() * prefixes.length)]}-${Math.floor(Math.random() * 90) + 10}`;
      const types: ('success' | 'warn' | 'info' | 'error')[] = ['success', 'success', 'success', 'info', 'warn', 'success', 'error'];
      const type = types[Math.floor(Math.random() * types.length)];
      
      let msg = `Device ${id} -> Telemetry synced [OK]`;
      if (type === 'warn') msg = `Device ${id} -> Latency spike detected (120ms)`;
      if (type === 'info') msg = `Device ${id} -> Media assets validating`;
      if (type === 'error') msg = `Device ${id} -> Thermal warning (72°C)`;

      const newLog = { 
        id: Math.random().toString(), 
        msg, 
        time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }), 
        type 
      };
      setLogs(prev => [newLog, ...prev].slice(0, 5));
    };

    const timer = setInterval(generateLog, 3000);
    generateLog();
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-[#050505] border border-white/5 rounded-[2.5rem] p-8 font-mono overflow-hidden relative group shadow-2xl">
       <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
       
       <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
             <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_#10b981]" />
             <h4 className="text-xs font-black text-white uppercase tracking-[0.2em]">Fleet Pulse Terminal</h4>
          </div>
          <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Live Stream</span>
       </div>
       
       <div className="space-y-3 relative">
          {logs.map((log, i) => (
             <div key={log.id} className="flex gap-4 text-[11px] animate-in slide-in-from-left-4 fade-in duration-300" style={{ opacity: 1 - (i * 0.15) }}>
                <span className="text-zinc-600 shrink-0">[{log.time}]</span>
                <span className={clsx(
                  "font-bold tracking-wide",
                  log.type === 'success' ? 'text-emerald-400' : 
                  log.type === 'warn' ? 'text-yellow-400' : 
                  log.type === 'error' ? 'text-rose-500' : 
                  'text-blue-400'
                )}>
                  {log.msg}
                </span>
             </div>
          ))}
       </div>
    </div>
  );
}









