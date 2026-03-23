import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Menu, X, LayoutDashboard, CarFront, MonitorOff, Megaphone, BarChart3, CloudUpload, User, Bell, Search, Zap, Wallet, LogIn, IdCard, Tablet, Briefcase, Navigation, Activity, ShieldCheck, Cpu } from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthProvider';
import NotificationCenter from './NotificationCenter';
import { TADLogo } from './ui/TADLogo';

const NAVIGATION_GROUPS = [
  {
    label: 'Operaciones',
    items: [
      { name: 'Resumen', href: '/', icon: LayoutDashboard },
      { name: 'Pantallas TAD', href: '/fleet', icon: Tablet },
      { name: 'Rastreo GPS', href: '/tracking', icon: Navigation },
    ],
  },
  {
    label: 'Red y Socios',
    items: [
      { name: 'Conductores y Suscripciones', href: '/drivers', icon: IdCard },
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
  const [isCollapsed, setIsCollapsed] = React.useState(false);

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
        "bg-[#050505] backdrop-blur-3xl border-r border-white/5 flex flex-col items-start pt-8 overflow-hidden shrink-0 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] z-50 fixed lg:static h-full shadow-[20px_0_50px_rgba(0,0,0,0.5)]",
        isSidebarOpen ? "translate-x-0 w-[280px]" : "-translate-x-full lg:translate-x-0",
        isCollapsed ? "lg:w-[88px]" : "lg:w-[280px]"
      )}>
        <button 
          className="lg:hidden absolute top-4 right-4 text-zinc-400 hover:text-white z-50"
          onClick={() => setIsSidebarOpen(false)}
          title="Cerrar el panel de control"
          aria-label="Cerrar el panel de control"
        >
          <X className="w-5 h-5" />
        </button>
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
          {NAVIGATION_GROUPS.map((group, gi) => (
            <div key={group.label} className={clsx(gi > 0 && 'mt-8')}>
              <p className={clsx(
                 "text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-4 flex items-center transition-all duration-300 whitespace-nowrap", 
                 isCollapsed ? "justify-center px-0 opacity-40" : "px-2 gap-4"
              )}>
                 {!isCollapsed && <span className="transition-all duration-300">{group.label}</span>}
                 {!isCollapsed && <span className="h-px flex-1 bg-white/5" />}
                 {isCollapsed && <span className="text-[8px] tracking-[0.2em] opacity-40">—</span>}
              </p>
              <div className="space-y-1.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = router.pathname === item.href
                    || (item.href !== '/' && router.pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      title={isCollapsed ? item.name : undefined}
                      className={clsx(
                        'group flex items-center text-xs font-black rounded-xl transition-all relative tracking-wide border border-transparent',
                        isActive
                          ? 'bg-tad-yellow text-black shadow-[0_10px_20px_rgba(255,212,0,0.15)] border-tad-yellow/20'
                          : 'text-white/60 hover:text-white hover:bg-white/5 hover:border-white/10',
                        isCollapsed ? 'justify-center p-3' : 'px-4 py-3'
                      )}
                    >
                      {isActive && (
                         <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-tad-yellow rounded-r-full shadow-[0_0_8px_#fad400]" />
                      )}
                      
                      <div className={clsx("relative flex items-center justify-center", isCollapsed ? "w-5 h-5" : "mr-3.5 w-5 h-5")}>
                         {isActive && <div className="absolute inset-0 bg-tad-yellow/20 blur-md rounded-full" />}
                         <Icon
                           className={clsx(
                             'shrink-0 transition-all duration-500 relative z-10',
                             isActive ? 'text-black' : 'text-zinc-400 group-hover:text-white',
                             isCollapsed ? 'w-5 h-5' : 'w-4.5 h-4.5'
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
                    </Link>
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
                 <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest leading-none mb-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-3 h-3 text-tad-yellow" /> SYS_ADMIN
                 </p>
                 <p className="font-black text-xs text-white truncate tracking-tight">{userEmail}</p>
              </div>
           </div>
                      <button 
               onClick={handleLogout}
               title={isCollapsed ? "Cerrar Sesión" : undefined}
               className={clsx(
                  "mt-2.5 flex items-center justify-center bg-black hover:bg-rose-500 text-zinc-400 hover:text-white rounded-xl border border-white/5 hover:border-rose-500/50 transition-all shadow-lg",
                  isCollapsed ? "w-10 h-10" : "w-full py-2.5 gap-2 px-6"
               )}
             >
               <LogIn className="w-4 h-4 rotate-180" />
               {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-widest">Desconectar</span>}
             </button>
        </div>
      </aside>

      {/* Main Orchestration Surface */}
      <div className="flex-1 flex flex-col overflow-hidden w-full relative h-full">
        {/* Environmental Glows */}
        <div className="fixed inset-0 -z-20 bg-[#0a0a0b]" />
        
        {/* Global Control Bar — Ultra-Glass with high visibility for background details */}
        <header className="h-20 shrink-0 flex items-center justify-between px-4 md:px-10 border-b border-white-[0.03] border-t border-tad-yellow/5 backdrop-blur-3xl bg-black/10 z-30 w-full shadow-2xl relative overflow-hidden">
           {/* Subtle glass light leak */}
           <div className="absolute top-0 left-1/4 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-tad-yellow/20 to-transparent" />
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
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-tad-yellow transition-all duration-500" />
                 <input 
                   type="text" 
                   placeholder="CONSULTAR PANTALLA, PILOTO O CAMPAÑA..." 
                   className="w-full bg-black/60 border border-white/5 rounded-xl py-3 pl-12 pr-6 text-[10px] font-black outline-none focus:border-tad-yellow/40 focus:bg-black transition-all tracking-widest text-white uppercase placeholder:text-white/20"
                 />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-30 group-focus-within:opacity-100 transition-opacity pointer-events-none">
                   <span className="px-1.5 py-0.5 rounded-md bg-zinc-800 border border-white/5 text-[8px] font-mono text-zinc-400">CTRL</span>
                   <span className="px-1.5 py-0.5 rounded-md bg-zinc-800 border border-white/5 text-[8px] font-mono text-zinc-400">K</span>
                </div>
             </div>
          </div>

          <div className="flex items-center gap-8">
             <div className="flex items-center gap-8 pr-8 border-r border-white/5 hidden md:flex">
                <div className="text-right">
                   <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Status Red</p>
                   <div className="flex items-center gap-2 justify-end">
                      <span className="text-[10px] font-black text-emerald-500 tracking-tight">STABLE</span>
                      <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">OS Build</p>
                   <div className="flex items-center gap-2 justify-end">
                         <span className="text-[10px] font-black text-tad-yellow tracking-tight">V4.6.1</span>
                      <Cpu className="w-3 h-3 text-tad-yellow" />
                   </div>
                </div>
             </div>

              <div className="flex items-center gap-6">
                 <NotificationCenter />
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

