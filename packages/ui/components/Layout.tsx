import React from 'react';
import ReactDOM from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Menu, X, LayoutDashboard, CarFront, MonitorOff, Megaphone,
  BarChart3, CloudUpload, User, Bell, Search, Zap, Wallet,
  LogIn, IdCard, Tablet, Briefcase, Navigation, Activity,
  ShieldCheck, Cpu, Battery, MessageSquare, TrendingUp, Scale,
  Monitor, Map, Users, Building2, ClipboardList, Target, Image as ImageIcon, ChevronDown, Network
} from 'lucide-react';
import clsx from 'clsx';
import { supabase } from "@tad/services";
import { useAuth } from './AuthProvider';
import { NotificationCenter } from './NotificationCenter';
import { TADLogo } from './TADLogo';
import useSWR from 'swr';
import api, { getDevices } from "@tad/services";

const fetcher = (url: string) => api.get(url).then(res => res.data);

const ADMIN_NAVIGATION = [
  {
    label: 'Centro de Control',
    items: [
      { name: 'Resumen', href: '/admin/dashboard', icon: LayoutDashboard },
      { name: 'Pantallas', href: '/admin/fleet', icon: Monitor },
      { name: 'Mapa', href: '/admin/dashboard/realtime', icon: Map },
      { name: 'Auditoría', href: '/admin/monitoring', icon: Activity },
    ],
  },
  {
    label: 'Gestión Táctica',
    items: [
      { name: 'Conductores', href: '/admin/drivers', icon: Users },
      { name: 'Referidos', href: '/admin/referrals', icon: Network },
      { name: 'Marcas', href: '/admin/advertisers', icon: Building2 },
      { name: 'Solicitudes', href: '/admin/advertisers/requests', icon: ClipboardList },
    ],
  },
  {
    label: 'Playlist & Ads',
    items: [
      { name: 'Campañas', href: '/admin/campaigns', icon: Target },
      { name: 'Medios', href: '/admin/media', icon: ImageIcon },
    ],
  },
  {
    label: 'Resultados & ROI',
    items: [
      { name: 'BI', href: '/admin/bi', icon: TrendingUp },
      { name: 'Fiscal', href: '/admin/bi/reconciliation', icon: Scale },
      { name: 'Finanzas', href: '/admin/finance', icon: Wallet },
      { name: 'Impacto', href: '/admin/analytics', icon: BarChart3 },
    ],
  },
];

const ADVERTISER_NAVIGATION = [
  {
    label: 'Marketing Hub',
    items: [
      { name: 'Dashboard', href: '/advertiser/dashboard', icon: LayoutDashboard },
      { name: 'Campañas', href: '/advertiser/campaigns', icon: Target },
      { name: 'Medios', href: '/advertiser/media', icon: ImageIcon },
    ],
  },
  {
    label: 'Análisis & ROI',
    items: [
      { name: 'Reportes', href: '/advertiser/reports', icon: BarChart3 },
    ],
  },
];

const DRIVER_NAVIGATION = [
  {
    label: 'Mi Terminal',
    items: [
      { name: 'Dashboard', href: '/driver/dashboard', icon: LayoutDashboard },
    ],
  },
];

function FleetHealthStatus({ hasSession }: { hasSession: boolean }) {
  const { data: devices, isLoading } = useSWR(
    hasSession ? '/fleet/summary' : null, // ← null desactiva SWR cuando no hay sesión
    fetcher,
    { refreshInterval: 60000 }
  );

  const healthScore = React.useMemo(() => {
    if (!devices || !Array.isArray(devices) || devices.length === 0) return 0;
    const totalBattery = devices.reduce((acc: number, d: any) => acc + (d.battery_level || d.batteryLevel || 0), 0);
    return Math.round(totalBattery / devices.length);
  }, [devices]);

  const onlineCount = React.useMemo(() => {
    if (!devices || !Array.isArray(devices)) return 0;
    return devices.filter((d: any) => d.is_online).length;
  }, [devices]);

  if (isLoading) return <div className="w-20 h-8 bg-white/5 animate-pulse rounded-xl" />;

  return (
    <div className="flex items-center gap-6 pr-8 border-r border-white-[0.03] hidden lg:flex">
      <div className="text-right">
        <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Fleet Health</p>
        <div className="flex items-center gap-2 justify-end">
          <span className={clsx(
            "text-[10px] font-bold tracking-tight",
            healthScore > 70 ? "text-emerald-500" : healthScore > 30 ? "text-tad-yellow" : "text-rose-500"
          )}>{healthScore}% ENERGY</span>
          <Battery className={clsx(
            "w-3 h-3 transition-colors",
            healthScore > 70 ? "text-emerald-500" : healthScore > 30 ? "text-tad-yellow" : "text-rose-500"
          )} />
        </div>
      </div>
      <div className="text-right">
        <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Active Nodes</p>
        <div className="flex items-center gap-2 justify-end">
          <span className="text-[10px] font-bold text-white tracking-tight">{onlineCount} / {devices?.length || 0}</span>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session } = useAuth();
  const currentRole = session?.user?.app_metadata?.role as string;
  const role = currentRole || null;
  const userEmail = session?.user?.email || 'Administrador';
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [dropdownPos, setDropdownPos] = React.useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const avatarRef = React.useRef<HTMLDivElement>(null);

  // Auto-close mobile sidebar when route changes
  React.useEffect(() => {
    setIsSidebarOpen(false);
  }, [router.pathname]);

  // Global Shortcut: CTRL + K to focus search
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Calculate dropdown position from avatar trigger when menu opens
  React.useEffect(() => {
    if (isUserMenuOpen && avatarRef.current) {
      const rect = avatarRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 16,
        right: window.innerWidth - rect.right,
      });
    }
  }, [isUserMenuOpen]);

  const navigationGroups = React.useMemo(() => {
    if (role === 'ADVERTISER') return ADVERTISER_NAVIGATION;
    if (role === 'DRIVER') return DRIVER_NAVIGATION;
    return ADMIN_NAVIGATION;
  }, [role]);

  const handleLogout = async () => {
    let target = '/login';
    if (role === 'ADVERTISER') target = '/advertiser/login';
    if (role === 'DRIVER') target = '/driver/login';
    if (role === 'ADMIN') target = '/admin/login';

    // 1. Clear ALL localStorage tokens FIRST — prevents AuthProvider SIGNED_OUT
    //    handler from rebuilding the session from remaining portal tokens
    localStorage.removeItem('tad_admin_token');
    localStorage.removeItem('tad_admin_user');
    localStorage.removeItem('tad_advertiser_token');
    localStorage.removeItem('tad_advertiser_user');
    localStorage.removeItem('tad_driver_token');
    localStorage.removeItem('tad_driver_user');

    // 2. Kill middleware cookie
    document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';

    // 3. Sign out from Supabase (may fail if session was JWT-only, so wrap in try-catch)
    try {
      if (supabase) await supabase.auth.signOut();
    } catch {
      // Session may not exist in Supabase (e.g. NestJS JWT login) — safe to ignore
    }

    router.replace(target);
  };

  return (
    <div className="flex h-screen bg-[#0a0a0b] text-white font-sans overflow-hidden selection:bg-tad-yellow selection:text-black">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[190] bg-black/80 backdrop-blur-sm lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Premium Sidebar Component */}
      <aside className={clsx(
        "bg-zinc-950 backdrop-blur-3xl border-r border-white/5 flex flex-col items-start pt-8 overflow-hidden shrink-0 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] z-[200] fixed lg:relative h-full shadow-2xl",
        isSidebarOpen ? "translate-x-0 w-72" : "-translate-x-full lg:translate-x-0",
        isCollapsed ? "lg:w-20" : "lg:w-72"
      )}>
        <div className="absolute top-[-5%] left-[-5%] w-64 h-64 bg-tad-yellow/10 blur-[100px] -z-10 pointer-events-none transition-all duration-1000" />

        {/* Brand Identity Section */}
        <div className={clsx(
          "px-6 mb-10 w-full flex items-center transition-all duration-500",
          isCollapsed ? "justify-center" : "justify-between"
        )}>
          <div className="flex items-center group cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
            <div className={clsx("transition-all duration-500", isCollapsed ? "flex justify-center w-full" : "ml-2")}>
              <TADLogo className={clsx("transition-all duration-500", isCollapsed ? "h-10" : "h-14")} showText={!isCollapsed} />
            </div>
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            title="Alternar Menú"
            aria-label="Alternar Menú"
            className={clsx(
              "hidden lg:flex items-center justify-center p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-all outline-none",
              isCollapsed ? "hidden scale-0 opacity-0" : "opacity-100 scale-100"
            )}
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Global Navigation Nexus */}
        <nav className="flex-1 w-full px-4 h-full overflow-y-auto pb-10 custom-scrollbar overflow-x-hidden">
          {navigationGroups.map((group: any, gi: number) => (
            <div key={group.label} className={clsx(gi > 0 && 'mt-8')}>
              <p className={clsx(
                "text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-4 flex items-center transition-all duration-300 whitespace-nowrap px-2",
                isCollapsed ? "justify-center px-0 opacity-40" : "gap-4"
              )}>
                {!isCollapsed && <span className="transition-all duration-300">{group.label}</span>}
                {!isCollapsed && <span className="h-px flex-1 bg-white/5" />}
                {isCollapsed && <span className="text-[8px] tracking-[0.2em] opacity-40">—</span>}
              </p>
              <div className="space-y-1.5">
                {group.items.map((item: any) => {
                  const Icon = item.icon;
                  const allHrefTexts = navigationGroups.flatMap((g: any) => g.items.map((i: any) => i.href));
                  const isExactMatch = router.pathname === item.href;
                  const isPrefixMatch = item.href !== '/' && router.pathname.startsWith(item.href + '/');
                  // Es activo si es coincidencia exacta, O si es un sub-path y no hay otro botón en el menú que coincida mejor.
                  const isActive = isExactMatch || (isPrefixMatch && !allHrefTexts.some((otherHref: string) =>
                    otherHref !== item.href &&
                    otherHref.length > item.href.length &&
                    (router.pathname === otherHref || router.pathname.startsWith(otherHref + '/'))
                  ));

                  return (
                    <a
                      key={item.name}
                      href={item.href}
                      onClick={(e) => {
                        e.preventDefault();
                        setIsSidebarOpen(false);
                        router.push(item.href);
                      }}
                      title={isCollapsed ? item.name : undefined}
                      className={clsx(
                        'group flex items-center text-[12px] font-bold rounded-2xl transition-all duration-500 relative tracking-wider border border-transparent uppercase overflow-hidden',
                        isActive
                          ? 'bg-tad-yellow text-black shadow-[0_12px_24px_rgba(250,212,0,0.2)] border-tad-yellow/40'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5 hover:border-white/10 hover:translate-x-2',
                        isCollapsed ? 'justify-center p-4' : 'px-5 py-4 hover:pl-8'
                      )}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-black rounded-r-full opacity-20" />
                      )}

                      <div className={clsx("relative flex items-center justify-center", isCollapsed ? "w-5 h-5" : "mr-4 w-5 h-5")}>
                        <Icon
                          className={clsx(
                            'shrink-0 transition-all duration-500 relative z-10',
                            isActive ? 'text-black' : 'text-zinc-500 group-hover:text-zinc-300',
                            isCollapsed ? 'w-5 h-5' : 'w-4 h-4'
                          )}
                          aria-hidden="true"
                        />
                      </div>

                      <span className={clsx(
                        "relative z-10 transition-all duration-300 whitespace-nowrap",
                        isCollapsed ? "opacity-0 w-0 hidden lg:block translate-x-4" : "opacity-100 w-auto translate-x-0"
                      )}>
                        {item.name}
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Terminal Workspace Profile */}
        <div className={clsx(
          "p-4 w-full mt-auto bg-zinc-900/40 border-t border-white-[0.03] transition-all duration-500 relative",
          isCollapsed ? "items-center flex flex-col px-2" : ""
        )}>
          <div className={clsx(
            "bg-zinc-950 border border-white-[0.05] rounded-2xl group transition-all duration-500 relative overflow-hidden flex items-center",
            isCollapsed ? "p-2 justify-center" : "p-3 gap-3"
          )}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-tad-yellow to-yellow-500 flex items-center justify-center font-bold text-black shadow-[0_0_15px_rgba(255,212,0,0.2)] group-hover:scale-105 transition-transform text-xs uppercase shrink-0">
              {userEmail.slice(0, 2)}
            </div>
            <div className={clsx("flex-1 min-w-0 transition-all duration-300", isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100")}>
              <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest leading-none mb-1 flex items-center gap-1.5 italic">
                <ShieldCheck className="w-3 h-3 text-tad-yellow animate-pulse" /> SYSTEM_ROOT
              </p>
              <p className="font-black text-[11px] text-white truncate tracking-tight">{userEmail.toUpperCase()}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title={isCollapsed ? "Cerrar Sesión" : undefined}
            className={clsx(
              "mt-4 flex items-center justify-center bg-zinc-950/60 hover:bg-rose-500 text-zinc-600 hover:text-white rounded-xl border border-white/5 hover:border-rose-500/50 transition-all shadow-inner",
              isCollapsed ? "w-10 h-10" : "w-full py-3 gap-3 px-6"
            )}
          >
            <LogIn className="w-3.5 h-3.5 rotate-180" />
            {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-[0.2em]">Disconnect</span>}
          </button>
        </div>
      </aside>

      {/* Main Orchestration Surface */}
      <div className="flex-1 flex flex-col overflow-hidden relative h-full">
        {/* Environmental Glows */}
        <div className="fixed inset-0 -z-20 bg-[#0a0a0b]" />

        {/* Global Control Bar — Ultra-Glass with high visibility for background details */}
        <header className="h-20 shrink-0 border-b border-white/[0.03] border-t border-tad-yellow/5 backdrop-blur-3xl bg-black/40 z-[110] relative">
          {/* Subtle glass light leak */}
          <div className="absolute top-0 left-1/4 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-tad-yellow/20 to-transparent" />

          <div className="h-full px-6 flex items-center justify-between gap-6 w-full">
            {/* Left Section: Mobile Menu */}
            <div className="flex items-center shrink-0">
              <button
                className="lg:hidden p-2 text-zinc-400 hover:text-white transition-colors"
                onClick={() => setIsSidebarOpen(true)}
                title="Abrir el panel de control"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>

            {/* Center Section: Status Info & Search Bar */}
            <div className="flex flex-1 items-center justify-end lg:justify-start gap-8 min-w-0">
              {(role === 'ADMIN' || role === 'ADVERTISER') && (
                <div className="hidden xl:flex items-center gap-6 shrink-0 z-20">
                  <FleetHealthStatus hasSession={!!session} />

                  <div className="flex items-center gap-6 pl-6 border-l border-white/5">
                    <div className="text-right">
                      <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mb-0.5">Network</p>
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-[10px] font-bold text-emerald-500 tracking-tight">STABLE</span>
                        <Activity className="w-3 h-3 text-emerald-500/80 animate-pulse" />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mb-0.5">Build</p>
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-[10px] font-bold text-tad-yellow tracking-tight">V4.5</span>
                        <Cpu className="w-3 h-3 text-tad-yellow/80" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="w-full max-w-sm relative group z-10 hidden md:block">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-tad-yellow transition-colors" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="SEARCH PROTOCOL..."
                  className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl py-2 pl-11 pr-16 text-[11px] font-medium outline-none focus:bg-white/10 focus-within:ring-2 focus-within:ring-[#FFCC00]/50 focus-within:border-[#FFCC00]/30 transition-all tracking-wider text-white placeholder:text-zinc-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery) {
                      // Implement search logic or navigation
                      console.log('Searching for:', searchQuery);
                      // For example: router.push(`/admin/search?q=${searchQuery}`);
                    }
                  }}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-50 group-focus-within:opacity-100 transition-opacity pointer-events-none">
                  <kbd className="shadow-sm bg-zinc-800 border-b border-zinc-700 text-zinc-400 text-[10px] font-mono px-1.5 py-0.5 rounded">CTRL</kbd>
                  <span className="text-zinc-600 text-[10px]">+</span>
                  <kbd className="shadow-sm bg-zinc-800 border-b border-zinc-700 text-zinc-400 text-[10px] font-mono px-1.5 py-0.5 rounded">K</kbd>
                </div>
              </div>
            </div>

            {/* Right Section: User Nav Cluster */}
            <div className="flex items-center justify-end gap-4 z-20 shrink-0">
              <NotificationCenter />

              <div className="flex items-center gap-4 pl-4 border-l border-white/10">
                <div className="hidden sm:flex items-center gap-1.5 bg-green-500/10 text-green-400 text-[10px] font-bold px-2.5 py-1 rounded-full border border-green-500/20 uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{role === 'ADMIN' ? 'Admin Node' : role === 'ADVERTISER' ? 'Adv Hub' : 'Drive Node'}</span>
                </div>

                <div className="relative">
                  <div ref={avatarRef}
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 cursor-pointer group select-none"
                  >
                    <div className="w-9 h-9 rounded-full bg-zinc-800 border border-white/5 group-hover:border-tad-yellow/30 group-hover:ring-4 group-hover:ring-tad-yellow/10 transition-all duration-300 flex items-center justify-center relative shadow-sm">
                      <span className="text-[11px] font-bold text-white tracking-widest">{userEmail.slice(0, 2).toUpperCase()}</span>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0a0a0b] animate-pulse shadow-[0_0_8px_#10b981]" />
                    </div>
                    <ChevronDown className={clsx("w-4 h-4 text-zinc-500 group-hover:text-white transition-all", isUserMenuOpen && "rotate-180")} />
                  </div>

                  {isUserMenuOpen && typeof window !== 'undefined' && ReactDOM.createPortal(
                    <>
                      <div className="fixed inset-0 z-[300]" onClick={() => setIsUserMenuOpen(false)} />
                      <div
                        className="fixed z-[310] w-56 bg-zinc-900/95 border border-white-[0.05] backdrop-blur-3xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right"
                        style={{ top: dropdownPos.top, right: dropdownPos.right }}
                      >
                        <div className="p-4 border-b border-white-[0.05] bg-zinc-950/50">
                          <p className="text-[10px] font-black text-white uppercase tracking-widest truncate">{userEmail}</p>
                          <p className="text-[8px] text-zinc-500 font-bold uppercase mt-1 tracking-tight">{role || 'USUARIO'}</p>
                        </div>
                        <div className="p-2">
                          <button
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              router.push(role === 'ADMIN' ? '/admin/profile' : role === 'ADVERTISER' ? '/advertiser/profile' : '/driver/profile');
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-[10px] font-bold text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all uppercase tracking-wider"
                          >
                            <User className="w-4 h-4" />
                            Mi Perfil
                          </button>
                          {role === 'ADMIN' && (
                            <button
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                router.push('/admin/settings');
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-[10px] font-bold text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all uppercase tracking-wider"
                            >
                              <ShieldCheck className="w-4 h-4" />
                              Configuración
                            </button>
                          )}
                          <div className="h-px bg-white-[0.05] my-2" />
                          <button
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              handleLogout();
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-[10px] font-bold text-rose-500 hover:text-white hover:bg-rose-500 rounded-xl transition-all uppercase tracking-wider"
                          >
                            <LogIn className="w-4 h-4 rotate-180" />
                            Desconectar
                          </button>
                        </div>
                      </div>
                    </>,
                    document.body
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Canvas Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-8 lg:p-10 relative scroll-smooth custom-scrollbar">
          <div className="absolute right-[10%] top-[5%] w-[40%] h-[40%] bg-tad-yellow/[0.03] blur-[120px] rounded-full pointer-events-none -z-10" />
          <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 relative z-10">
            {children}
          </div>

          <footer className="mt-32 pt-10 border-t border-white-[0.03] flex flex-col md:flex-row items-center justify-between opacity-30 hover:opacity-100 transition-opacity duration-700">
            <div className="flex items-center gap-3 mt-4 md:mt-0">
              <Zap className="w-3.5 h-3.5 text-tad-yellow" />
              <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.3em]">TAD NODE OS v4.5.1 STABLE</p>
            </div>
            <div className="flex gap-8">
              <p className="text-[8px] font-bold text-zinc-700 uppercase tracking-widest">ECOSYSTEM REVISION: 04</p>
              <p className="text-[8px] font-bold text-zinc-700 uppercase tracking-widest">© 2026 TECHNOLOGY ASSET DEPLOYMENT</p>
            </div>
          </footer>
        </main>
      </div>

      {/* @ts-ignore */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 212, 0, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 212, 0, 0.2);
        }
        .bg-white-\[0\.03\] { background-color: rgba(255, 255, 255, 0.03); }
        .border-white-\[0\.03\] { border-color: rgba(255, 255, 255, 0.03); }
        .border-white-\[0\.05\] { border-color: rgba(255, 255, 255, 0.05); }
      `}</style>
    </div>
  );
}



