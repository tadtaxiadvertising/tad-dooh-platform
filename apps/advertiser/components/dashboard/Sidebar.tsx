import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  LayoutDashboard, 
  MonitorPlay, 
  Map, 
  CreditCard, 
  BarChart3, 
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  FileText,
  Film,
  LogOut
} from 'lucide-react';
import clsx from 'clsx';

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();

  const menuItems = [
    { name: 'Vista General', icon: LayoutDashboard, href: '/advertiser/bi-v6' },
    { name: 'Mis Campañas', icon: MonitorPlay, href: '/advertiser/campaigns' },
    { name: 'Media', icon: Film, href: '/advertiser/media' },
    { name: 'Red de Pantallas', icon: Map, href: '/advertiser/network' },
    { name: 'Reportes', icon: FileText, href: '/advertiser/reports' },
    { name: 'Facturación', icon: CreditCard, href: '/advertiser/billing' },
    { name: 'Marketing Insights', icon: BarChart3, href: '/advertiser/insights' },
  ];

  const subscription = {
    status: 'Activa', // or 'En riesgo'
    daysLeft: 12,
  };

  const handleLogout = () => {
    localStorage.removeItem('tad_advertiser_token');
    localStorage.removeItem('tad_advertiser_user');
    document.cookie = 'sb-access-token=; path=/; max-age=0';
    router.push('/advertiser/login');
  };

  return (
    <div 
      className={`h-screen bg-[#09090B] border-r border-[#18181B] text-[#F4F4F5] flex flex-col transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}
    >
      <div className="flex items-center justify-between p-4 border-b border-[#18181B]">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-[#FFD700]">TAD</span>
            <span className="text-sm tracking-widest text-[#F4F4F5]/60 uppercase">Advertiser</span>
          </div>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md hover:bg-[#18181B] transition-colors mx-auto"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {menuItems.map((item, index) => {
          const isActive = router.pathname === item.href || 
            (item.href !== '/advertiser/bi-v6' && router.pathname.startsWith(item.href));
          
          return (
            <Link 
              key={index} 
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-3 rounded-xl transition-all group",
                isActive 
                  ? "bg-[#FFD700]/10 border border-[#FFD700]/20 text-white" 
                  : "hover:bg-[#18181B] border border-transparent"
              )}
            >
              <item.icon 
                size={20} 
                className={clsx(
                  "transition-colors flex-shrink-0",
                  isActive ? "text-[#FFD700]" : "text-[#F4F4F5]/50 group-hover:text-[#FFD700]"
                )} 
              />
              {!collapsed && (
                <span className={clsx(
                  "text-sm font-medium transition-colors",
                  isActive ? "text-white" : "text-[#F4F4F5]/70 group-hover:text-white"
                )}>
                  {item.name}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className={`p-4 border-t border-[#18181B] space-y-3 ${collapsed ? 'hidden' : 'block'}`}>
        <div className="bg-[#18181B] rounded-xl p-4 border border-[#F4F4F5]/10 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#FFD700]" />
          <h4 className="text-sm font-semibold mb-2">Estado de Cuenta</h4>
          
          <div className="flex items-center justify-between mb-3 text-sm">
            <span className="text-[#F4F4F5]/70">Suscripción</span>
            <span className={`font-medium flex items-center gap-1 ${subscription.status === 'Activa' ? 'text-green-400' : 'text-amber-500'}`}>
              {subscription.status === 'En riesgo' && <AlertTriangle size={14} />}
              {subscription.status}
            </span>
          </div>
          
          <div className="flex items-center justify-between mb-4 text-sm">
            <span className="text-[#F4F4F5]/70">Corte en</span>
            <span className="font-bold">{subscription.daysLeft} días</span>
          </div>

          <button className="w-full bg-[#FFD700] hover:bg-[#FFD700]/90 text-black font-bold py-2 px-4 rounded-lg transition-colors text-sm">
            Pagar Mensualidad
          </button>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all text-xs font-bold uppercase tracking-wider"
        >
          <LogOut size={14} />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
};
