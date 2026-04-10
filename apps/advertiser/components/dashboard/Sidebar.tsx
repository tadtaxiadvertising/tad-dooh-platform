import React, { useState } from 'react';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  MonitorPlay, 
  Map, 
  CreditCard, 
  BarChart3, 
  ChevronLeft,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { name: 'Vista General', icon: LayoutDashboard, href: '/advertiser/bi-v6' },
    { name: 'Mis Campañas', icon: MonitorPlay, href: '/advertiser/campaigns' },
    { name: 'Red de Pantallas', icon: Map, href: '/advertiser/network' },
    { name: 'Facturación', icon: CreditCard, href: '/advertiser/billing' },
    { name: 'Marketing Insights', icon: BarChart3, href: '/advertiser/insights' },
  ];

  const subscription = {
    status: 'Activa', // or 'En riesgo'
    daysLeft: 12,
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

      <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
        {menuItems.map((item, index) => (
          <Link 
            key={index} 
            href={item.href}
            className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-[#18181B] transition-colors group"
          >
            <item.icon size={22} className="text-[#F4F4F5]/70 group-hover:text-[#FFD700] transition-colors" />
            {!collapsed && (
              <span className="font-medium text-[#F4F4F5]/90 group-hover:text-white transition-colors">
                {item.name}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className={`p-4 border-t border-[#18181B] ${collapsed ? 'hidden' : 'block'}`}>
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
      </div>
    </div>
  );
};
