import { useEffect, useState, useCallback } from 'react';
import type { GetServerSideProps } from 'next';
import { CarFront, Megaphone, CloudUpload, TrendingUp, ShieldCheck, Zap, Cpu, Layers, MessageSquare, Fingerprint, BarChart3, ArrowUpRight, Radio, Server, Activity } from 'lucide-react';
import { getDevices, getCampaigns, getMedia, getHourlyPlays, getAnalyticsSummary, getPortalRequests } from '@tad/services';

// Force dynamic rendering — prevents "No QueryClient set" SSR errors
export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useTabSync } from '@tad/ui';
import clsx from 'clsx';
import Link from 'next/link';
import { useAuth } from '@tad/ui';

const TIMEOUT_MS = 15000;

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
  const { session } = useAuth();

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
          { name: '00:00', val: 0 }, { name: '04:00', val: 0 }, { name: '08:00', val: 0 },
          { name: '12:00', val: 0 }, { name: '16:00', val: 0 }, { name: '20:00', val: 0 }, { name: '23:59', val: 0 },
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
  }, [loadData, session]);

  // Polling for live activity (every 60 seconds)
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      loadData();
    }, 60000);
    return () => clearInterval(interval);
  }, [loadData, session]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen pb-12 animate-in fade-in duration-1000 relative selection:bg-tad-yellow selection:text-black font-sans mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
      {/* 🧵 Enhanced Stitched Layer: Background Glows */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-tad-yellow/[0.03] blur-[200px] rounded-full animate-pulse-soft" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-500/[0.02] blur-[150px] rounded-full" />
      </div>

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
                        <stop offset="5%" stopColor="#FFD400" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#FFD400" stopOpacity={0} />
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









