import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Menu, X, LayoutDashboard, CarFront, MonitorOff, Megaphone, BarChart3, CloudUpload, User, Bell, Search, Zap, Wallet, LogIn, IdCard, Tablet, Briefcase, Navigation, Activity, ShieldCheck, Cpu } from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthProvider';

const NAVIGATION_GROUPS = [
  {
    label: 'Operaciones',
    items: [
      { name: 'Resumen', href: '/', icon: LayoutDashboard },
      { name: 'Monitoreo de Flota', href: '/fleet', icon: CarFront },
      { name: 'Rastreo GPS', href: '/tracking', icon: Navigation },
      { name: 'Alertas y Purgas', href: '/fleet/offline', icon: MonitorOff },
    ],
  },
  {
    label: 'Red y Socios',
    items: [
      { name: 'Conductores y Suscripciones', href: '/drivers', icon: IdCard },
      { name: 'Inventario de Pantallas', href: '/devices', icon: Tablet },
    ],
  },
  {
    label: 'Publicidad y Inteligencia',
    items: [
      { name: 'Campañas', href: '/campaigns', icon: Megaphone },
      { name: 'Contenido Multimedia', href: '/media', icon: CloudUpload },
      { name: 'Marcas y Anunciantes', href: '/advertisers', icon: Briefcase },
      { name: 'Ingresos y Pagos', href: '/finance', icon: Wallet },
      { name: 'Inteligencia ROI', href: '/analytics', icon: BarChart3 },
    ],
  },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session } = useAuth();
  const userEmail = session?.user?.email || 'Administrador';
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    localStorage.removeItem('tad_admin_token');
    localStorage.removeItem('tad_admin_user');
  };

  return (
    <div className="flex h-screen bg-[#0a0a0b] text-white font-sans overflow-hidden selection:bg-tad-yellow selection:text-black">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Premium Sidebar Component */}
      <aside className={clsx(
        "w-[300px] bg-zinc-900/95 backdrop-blur-3xl border-r border-white-[0.03] flex flex-col items-start pt-10 overflow-hidden shrink-0 transition-all z-50 fixed lg:static h-full",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <button 
          className="lg:hidden absolute top-4 right-4 text-zinc-400 hover:text-white"
          onClick={() => setIsSidebarOpen(false)}
          title="Cerrar el panel de control"
          aria-label="Cerrar el panel de control"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="absolute top-[-5%] left-[-5%] w-64 h-64 bg-tad-yellow/10 blur-[100px] -z-10 pointer-events-none" />
        
        {/* Brand Identity Section */}
        <div className="px-8 mb-12 w-full">
          <div className="flex items-center gap-4 group">
            <div className="p-2.5 bg-tad-yellow rounded-2xl shadow-[0_0_25px_rgba(255,212,0,0.15)] group-hover:shadow-[0_0_35px_rgba(255,212,0,0.25)] transition-all duration-700">
              <Zap className="w-6 h-6 text-black fill-current" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white uppercase leading-none">
                TAD <span className="text-tad-yellow">Node</span>
              </h1>
              <p className="text-[10px] text-zinc-500 font-bold tracking-[0.3em] mt-1.5 uppercase transition-colors group-hover:text-zinc-400">Master Console</p>
            </div>
          </div>
        </div>

        {/* Global Navigation Nexus */}
        <nav className="flex-1 w-full px-4 h-full overflow-y-auto pb-10 custom-scrollbar">
          {NAVIGATION_GROUPS.map((group, gi) => (
            <div key={group.label} className={clsx(gi > 0 && 'mt-10')}>
              <p className="px-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-5 flex items-center gap-4">
                {group.label}
                 <span className="h-px flex-1 bg-white-[0.02]" />
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = router.pathname === item.href
                    || (item.href !== '/' && router.pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={clsx(
                        'group flex items-center px-4 py-3 text-xs font-bold rounded-xl transition-all relative overflow-hidden tracking-wide',
                        isActive
                          ? 'bg-tad-yellow text-black shadow-lg shadow-tad-yellow/5'
                          : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.03]'
                      )}
                    >
                      {isActive && (
                         <div className="absolute left-0 top-0 bottom-0 w-1 bg-black/30" />
                      )}
                      <Icon
                        className={clsx(
                          'mr-3.5 shrink-0 h-4.5 w-4.5 transition-all duration-500',
                          isActive ? 'text-black' : 'text-zinc-600 group-hover:text-tad-yellow'
                        )}
                        aria-hidden="true"
                      />
                      <span className="relative z-10">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Terminal Workspace Profile */}
        <div className="p-6 w-full mt-auto bg-zinc-900/40 border-t border-white-[0.03]">
           <div className="bg-zinc-900 border border-white-[0.05] p-4 rounded-2xl group hover:border-tad-yellow/30 transition-all duration-500 relative overflow-hidden">
              <div className="flex items-center gap-3.5 relative z-10">
                 <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-tad-yellow to-yellow-500 flex items-center justify-center font-bold text-black shadow-md group-hover:scale-105 transition-transform text-xs uppercase">
                    {userEmail.slice(0, 2)}
                 </div>
                 <div className="flex-1 min-w-0">
                    <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest leading-none mb-1 flex items-center gap-1.5">
                       <ShieldCheck className="w-3 h-3 text-emerald-500/80" /> Root_Access
                    </p>
                    <p className="font-bold text-xs text-white truncate tracking-tight">{userEmail}</p>
                 </div>
              </div>
           </div>
           
           <button 
             onClick={handleLogout}
             className="w-full mt-3 flex items-center justify-center gap-3 py-3 px-6 bg-transparent hover:bg-rose-500/10 text-zinc-600 hover:text-rose-500 rounded-xl border border-white-[0.05] hover:border-rose-500/30 transition-all text-[9px] font-bold uppercase tracking-widest"
           >
             <LogIn className="w-3 h-3 rotate-180" />
             Eyectar Hardware
           </button>
        </div>
      </aside>

      {/* Main Orchestration Surface */}
      <div className="flex-1 flex flex-col overflow-hidden w-full relative h-full">
        {/* Environmental Glows */}
        <div className="fixed inset-0 -z-20 bg-[#0a0a0b]" />
        
        {/* Global Control Bar */}
        <header className="h-20 shrink-0 flex items-center justify-between px-4 md:px-10 border-b border-white-[0.03] backdrop-blur-3xl bg-zinc-900/20 z-30 w-full shadow-2xl">
          <div className="flex items-center gap-4 flex-1">
            <button 
              className="lg:hidden p-2 text-zinc-400 hover:text-white"
              onClick={() => setIsSidebarOpen(true)}
              title="Abrir el panel de control"
              aria-label="Abrir el panel de control"
            >
              <Menu className="w-6 h-6" />
            </button>
             <div className="relative group w-full max-w-lg hidden xl:block">
                 <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-tad-yellow transition-all duration-500" />
                <input 
                  type="text" 
                  placeholder="CONSULAR NODO, PILOTO O CAMPAÑA..." 
                  className="w-full bg-zinc-900/40 border border-white-[0.03] rounded-xl py-3 pl-12 pr-6 text-[10px] font-bold outline-none focus:border-tad-yellow/40 focus:bg-zinc-900/80 transition-all tracking-widest text-white uppercase placeholder:text-zinc-700"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-30 group-focus-within:opacity-100 transition-opacity pointer-events-none">
                   <span className="px-1.5 py-0.5 rounded-md bg-zinc-800 border border-white/5 text-[8px] font-mono text-zinc-400">CTRL</span>
                   <span className="px-1.5 py-0.5 rounded-md bg-zinc-800 border border-white/5 text-[8px] font-mono text-zinc-400">K</span>
                </div>
             </div>
          </div>

          <div className="flex items-center gap-8">
             <div className="flex items-center gap-8 pr-8 border-r border-white-[0.03] hidden md:flex">
                <div className="text-right">
                   <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Status Red</p>
                   <div className="flex items-center gap-2 justify-end">
                      <span className="text-[10px] font-bold text-emerald-500 tracking-tight">STABLE</span>
                      <Activity className="w-3 h-3 text-emerald-500/80 animate-pulse" />
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mb-1">OS Build</p>
                   <div className="flex items-center gap-2 justify-end">
                        <span className="text-[10px] font-bold text-tad-yellow tracking-tight">V4.5.1</span>
                      <Cpu className="w-3 h-3 text-tad-yellow/80" />
                   </div>
                </div>
             </div>

             <div className="flex items-center gap-6">
                <button className="relative group" title="Signal Alerts">
                    <div className="p-3 bg-zinc-900/40 rounded-xl border border-white-[0.03] group-hover:border-tad-yellow/30 transition-all duration-500 text-zinc-500 group-hover:text-tad-yellow">
                       <Bell className="w-4.5 h-4.5" />
                       <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-tad-yellow rounded-full border border-black shadow-[0_0_5px_#fad400]" />
                    </div>
                </button>
                <div className="flex items-center gap-4 group cursor-pointer">
                   <div className="text-right hidden sm:block">
                      <p className="text-[10px] font-bold text-white uppercase tracking-wider mb-0.5">Admin_Terminal</p>
                      <p className="text-[8px] font-bold text-tad-yellow uppercase tracking-widest opacity-80">Level_SSS</p>
                   </div>
                   <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white-[0.05] flex items-center justify-center group-hover:border-tad-yellow/40 transition-all duration-500 p-0.5 relative overflow-hidden shadow-lg">
                      <User className="w-5 h-5 text-zinc-600 group-hover:text-white transition-colors" />
                      <div className="absolute bottom-0 left-0 w-full h-0.5 bg-tad-yellow translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
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

