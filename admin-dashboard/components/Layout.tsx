import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { LayoutDashboard, CarFront, MonitorOff, Megaphone, BarChart3, CloudUpload, User, Bell, Search, Zap, Wallet, LogIn, IdCard, Tablet, Briefcase } from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthProvider';

const NAVIGATION_GROUPS = [
  {
    label: '📊 OPERACIONES',
    items: [
      { name: 'Resumen', href: '/', icon: LayoutDashboard },
      { name: 'Monitoreo de Flota', href: '/fleet', icon: CarFront },
      { name: 'Alertas y Offline', href: '/fleet/offline', icon: MonitorOff },
    ],
  },
  {
    label: '👥 RED Y SOCIOS',
    items: [
      { name: 'Choferes y Suscripciones', href: '/drivers', icon: IdCard },
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
    await supabase.auth.signOut();
    // Limpiar legacy tokens por si acaso
    localStorage.removeItem('tad_admin_token');
    localStorage.removeItem('tad_admin_user');
    // El AuthProvider detecta el SIGNED_OUT y redirige solo
  };

  return (
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-zinc-950 border-r border-white/5 flex flex-col items-start pt-8 overflow-y-auto shrink-0 transition-all">
        <div className="px-8 mb-8 w-full">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-tad-yellow rounded-xl shadow-[0_0_15px_rgba(250,212,0,0.4)]">
              <Zap className="w-6 h-6 text-black fill-current" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter text-white uppercase italic">
                TAD <span className="text-tad-yellow text-shadow-glow">Node</span>
              </h1>
              <p className="text-[10px] text-zinc-500 font-bold tracking-[0.3em] -mt-1">ECOSYSTEM OS</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 w-full px-4 h-full overflow-y-auto pb-4">
          {NAVIGATION_GROUPS.map((group, gi) => (
            <div key={group.label} className={clsx(gi > 0 && 'mt-5')}>
              <p className="px-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-3">
                {group.label}
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
                        'group flex items-center px-4 py-3 text-[11px] font-bold rounded-2xl transition-all relative overflow-hidden uppercase tracking-wider',
                        isActive
                          ? 'bg-tad-yellow text-black shadow-[0_0_20px_rgba(250,212,0,0.2)]'
                          : 'text-zinc-500 hover:text-white hover:bg-white/5'
                      )}
                    >
                      {isActive && <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-black rounded-full" />}
                      <Icon
                        className={clsx(
                          'mr-3 shrink-0 h-[18px] w-[18px] transition-transform group-hover:scale-110',
                          isActive ? 'text-black' : 'text-zinc-600 group-hover:text-tad-yellow'
                        )}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

          <div className="p-6 w-full space-y-3">
          <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-tad-yellow flex items-center justify-center font-black text-black shadow-lg">
                AD
             </div>
             <div className="flex-1 min-w-0">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter leading-none mb-1">Autenticado</p>
                <p className="font-bold text-xs text-white truncate">{userEmail}</p>
             </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-zinc-900/50 border border-white/5 hover:border-red-500/30 hover:bg-red-500/5 text-zinc-600 hover:text-red-400 rounded-xl transition-all text-[10px] font-black uppercase tracking-[0.2em]"
          >
            <LogIn className="w-3 h-3 rotate-180" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col overflow-hidden w-full relative">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-tad-yellow/5 blur-[120px] -z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-zinc-800/10 blur-[120px] -z-10 pointer-events-none" />

        <header className="h-20 shrink-0 flex items-center justify-between px-10 border-b border-white/5 backdrop-blur-md bg-black/40 z-10 w-full">
          <div className="flex items-center gap-4 flex-1">
             <div className="relative group w-full max-w-md hidden md:block">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-tad-yellow transition-colors" />
                <input 
                  type="text" 
                  placeholder="Búsqueda global..." 
                  className="w-full bg-zinc-900 border border-white/5 rounded-xl py-2.5 pl-12 pr-4 text-xs font-bold outline-none focus:border-tad-yellow focus:bg-zinc-800 transition-all italic tracking-wide text-white"
                />
             </div>
          </div>

          <div className="flex items-center gap-6">
             <button className="relative p-2 text-zinc-500 hover:text-white transition-colors">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-tad-yellow rounded-full border border-black" />
             </button>
             <div className="h-8 w-px bg-white/5" />
             <div className="flex items-center gap-3 text-white">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest hidden sm:block">March 2026 Batch</span>
                <User className="w-5 h-5" />
             </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-auto p-10 relative scroll-smooth pointer-events-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
