import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { LayoutDashboard, CarFront, MonitorOff, Megaphone, BarChart3, CloudUpload, User, Bell, Search, Zap, Wallet, LogIn, IdCard, Tablet, Briefcase, Navigation, Activity, ShieldCheck, Cpu } from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthProvider';

const NAVIGATION_GROUPS = [
  {
    label: '📊 OPERACIONES',
    items: [
      { name: 'Resumen', href: '/', icon: LayoutDashboard },
      { name: 'Monitoreo de Flota', href: '/fleet', icon: CarFront },
      { name: 'Rastreo GPS', href: '/tracking', icon: Navigation },
      { name: 'Alertas y Offline', href: '/fleet/offline', icon: MonitorOff },
    ],
  },
  {
    label: '👥 RED Y SOCIOS',
    items: [
      { name: 'Conductores y Suscripciones', href: '/drivers', icon: IdCard },
      { name: 'Inventario de Pantallas', href: '/devices', icon: Tablet },
    ],
  },
  {
    label: '📢 PUBLICIDAD Y VENTAS',
    items: [
      { name: 'Campañas', href: '/campaigns', icon: Megaphone },
      { name: 'Contenido Multimedia', href: '/media', icon: CloudUpload },
      { name: 'Marcas y Anunciantes', href: '/advertisers', icon: Briefcase },
      { name: 'Ingresos y Pagos', href: '/finance', icon: Wallet },
      { name: 'Inteligencia', href: '/analytics', icon: BarChart3 },
    ],
  },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session } = useAuth();
  const userEmail = session?.user?.email || 'Administrador';

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    localStorage.removeItem('tad_admin_token');
    localStorage.removeItem('tad_admin_user');
  };

  return (
    <div className="flex h-screen bg-[#0d0d0f] text-white font-sans overflow-hidden selection:bg-tad-yellow selection:text-black">
      {/* Premium Sidebar */}
      <aside className="w-80 bg-zinc-900/40 backdrop-blur-2xl border-r border-white/10 flex flex-col items-start pt-10 overflow-hidden shrink-0 transition-all relative">
        <div className="absolute top-[-10%] left-[-10%] w-80 h-80 bg-tad-yellow/15 blur-[120px] -z-10" />
        
        <div className="px-10 mb-12 w-full">
          <div className="flex items-center gap-4 group">
            <div className="p-3 bg-tad-yellow rounded-[1.25rem] shadow-2xl shadow-tad-yellow/20 group-hover:rotate-[360deg] transition-transform duration-1000 ease-in-out">
              <Zap className="w-7 h-7 text-black fill-current" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-white uppercase italic leading-none text-shadow-glow">
                TAD <span className="text-tad-yellow italic">Node</span>
              </h1>
              <p className="text-[9px] text-zinc-600 font-black tracking-[0.4em] mt-1 italic opacity-80">ESTABLISHED 2024</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 w-full px-6 h-full overflow-y-auto pb-10 custom-scrollbar">
          {NAVIGATION_GROUPS.map((group, gi) => (
            <div key={group.label} className={clsx(gi > 0 && 'mt-8')}>
              <p className="px-5 text-[9px] font-black text-zinc-700 uppercase tracking-[0.3em] mb-4 flex items-center gap-2 italic">
                {group.label}
                 <span className="h-px flex-1 bg-white/5" />
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
                      className={clsx(
                        'group flex items-center px-5 py-4 text-[10px] font-black rounded-2xl transition-all relative overflow-hidden uppercase tracking-widest italic',
                        isActive
                          ? 'bg-tad-yellow text-black shadow-2xl shadow-tad-yellow/10'
                          : 'text-zinc-500 hover:text-white hover:bg-white/5'
                      )}
                    >
                      {isActive && <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-black/40 shadow-[0_0_15px_rgba(255,212,0,0.6)]" />}
                      <Icon
                        className={clsx(
                          'mr-4 shrink-0 h-5 w-5 transition-all duration-500',
                          isActive ? 'text-black scale-110' : 'text-zinc-700 group-hover:text-tad-yellow group-hover:scale-110'
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

        {/* User Workspace Profile */}
        <div className="p-8 w-full mt-auto bg-white/[0.01] border-t border-white/5 backdrop-blur-xl">
           <div className="bg-zinc-900/60 p-5 rounded-[2rem] border border-white/5 group hover:border-tad-yellow/30 transition-all duration-500 overflow-hidden relative">
              <div className="absolute -top-10 -right-10 w-20 h-20 bg-tad-yellow/5 blur-2xl group-hover:opacity-100 opacity-0 transition-opacity" />
              <div className="flex items-center gap-4 relative z-10">
                 <div className="w-12 h-12 rounded-2xl bg-tad-yellow flex items-center justify-center font-black text-black shadow-lg shadow-tad-yellow/10 group-hover:scale-105 transition-transform text-xs uppercase italic">
                    {userEmail.slice(0, 2)}
                 </div>
                 <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-zinc-600 font-black uppercase tracking-tighter leading-none mb-1.5 flex items-center gap-1.5 italic">
                       <ShieldCheck className="w-3 h-3 text-emerald-500" /> Root_Access
                    </p>
                    <p className="font-black text-xs text-white truncate italic tracking-tight">{userEmail}</p>
                 </div>
              </div>
           </div>
           
           <button 
             onClick={handleLogout}
             className="w-full mt-4 flex items-center justify-center gap-3 py-4 px-6 bg-transparent hover:bg-rose-500 text-zinc-600 hover:text-white rounded-[1.5rem] border border-white/5 hover:border-rose-500 transition-all text-[10px] font-black uppercase tracking-[0.3em] font-display italic"
           >
             <LogIn className="w-3.5 h-3.5 rotate-180" />
             Eyectar Sesión
           </button>
        </div>
      </aside>

      {/* Main Command Console */}
      <div className="flex-1 flex flex-col overflow-hidden w-full relative h-full">
        {/* Dynamic Background Surface */}
        <div className="fixed inset-0 -z-20 bg-[#0d0d0f]" />
        
        <header className="h-28 shrink-0 flex items-center justify-between px-12 border-b border-white/10 backdrop-blur-xl bg-zinc-900/40 z-50 w-full shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-8 flex-1">
             <div className="relative group w-full max-w-xl hidden xl:block">
                 <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-500 group-focus-within:text-tad-yellow transition-all duration-500 group-focus-within:scale-110" />
                <input 
                  type="text" 
                  placeholder="CONSULTAR NODO, CONDUCTOR O CAMPAÑA..." 
                  className="w-full bg-zinc-900/60 border border-white/10 rounded-2xl py-4.5 pl-16 pr-8 text-[11px] font-black outline-none focus:border-tad-yellow/60 focus:bg-zinc-800 transition-all italic tracking-widest text-white uppercase placeholder:text-zinc-600 placeholder:font-black shadow-inner"
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-50 group-focus-within:opacity-100 transition-opacity">
                   <div className="px-2 py-1 rounded bg-zinc-900 border border-white/5 text-[9px] font-mono font-black text-zinc-600">CMD</div>
                   <div className="px-2 py-1 rounded bg-zinc-900 border border-white/5 text-[9px] font-mono font-black text-zinc-600">K</div>
                </div>
             </div>
          </div>

          <div className="flex items-center gap-10">
             <div className="flex items-center gap-8 pr-10 border-r border-white/5 hidden lg:flex">
                <div className="text-right">
                   <p className="text-[8px] font-black text-zinc-700 uppercase tracking-widest leading-none mb-1.5">Latencia de Red</p>
                   <div className="flex items-center gap-2 justify-end">
                      <span className="text-[10px] font-black text-emerald-500 italic">42MS</span>
                      <Activity className="w-3.5 h-3.5 text-emerald-500 animate-[pulse_2s_infinite]" />
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-[8px] font-black text-zinc-700 uppercase tracking-widest leading-none mb-1.5">Hash del Sistema</p>
                   <div className="flex items-center gap-2 justify-end">
                       <span className="text-[10px] font-black text-tad-yellow italic">V4.5.0-STABLE</span>
                      <Cpu className="w-3.5 h-3.5 text-tad-yellow" />
                   </div>
                </div>
             </div>

             <div className="flex items-center gap-8">
                <button className="relative group" title="Centro de Notificaciones">
                    <div className="p-3.5 bg-zinc-900/50 rounded-2xl border border-white/5 group-hover:border-tad-yellow/30 transition-all duration-500 text-zinc-600 group-hover:text-tad-yellow shadow-2xl">
                       <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                       <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-tad-yellow rounded-full border-2 border-black animate-pulse" />
                    </div>
                </button>
                <div className="flex items-center gap-4 group cursor-pointer transition-all">
                   <div className="text-right hidden sm:block">
                      <p className="text-[9px] font-black text-white uppercase italic tracking-widest leading-none">Admin_Terminal</p>
                      <p className="text-[8px] font-black text-tad-yellow uppercase tracking-[0.4em] mt-1.5">AUTH_LEVEL: SSS</p>
                   </div>
                   <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center group-hover:border-tad-yellow/50 transition-all duration-500 p-0.5 relative overflow-hidden">
                      <User className="w-6 h-6 text-zinc-500 group-hover:text-white transition-colors" />
                      <div className="absolute bottom-0 left-0 w-full h-1 bg-tad-yellow translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                   </div>
                </div>
             </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-8 lg:p-12 relative scroll-smooth pointer-events-auto custom-scrollbar">
           <div className="absolute right-[20%] top-[10%] w-[40%] h-[40%] bg-tad-yellow/10 blur-[150px] rounded-full pointer-events-none -z-10" />
           <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-tad-yellow/40 to-transparent" />
           <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-12 duration-1000 relative z-10">
             {children}
           </div>
           
           <footer className="mt-32 pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between opacity-20 hover:opacity-100 transition-opacity duration-1000">
              <div className="flex items-center gap-3 mb-4 md:mb-0">
                 <Zap className="w-4 h-4 text-tad-yellow" />
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.5em] italic">TAD NODE ECOSYSTEM OS v4.5.0-STABLE</p>
              </div>
              <div className="flex gap-8">
                 <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">ENLACC CENTRAL: STO_DGO_CLUSTER_01</p>
                 <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">© 2026 TECHNOLOGY ASSET DEPLOYMENT</p>
              </div>
           </footer>
        </main>
      </div>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 212, 0, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 212, 0, 0.3);
        }
        .text-shadow-glow {
          text-shadow: 0 0 25px rgba(255, 212, 0, 0.5), 0 0 50px rgba(255, 212, 0, 0.2);
        }
      `}</style>
    </div>
  );
}
