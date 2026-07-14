// apps/driver/components/dashboard/BottomNavigationBar.tsx
/**
 * BottomNavigationBar — Barra de navegación inferior premium
 *
 * Mobile-first, 4 tabs (Inicio, Rutas, Billetera, Ajustes).
 * Glassmorphism, animaciones framer-motion, safe-area-inset.
 * z-30 para que modales (DriverOnboardingModal z-[95], LockdownScreen z-[100])
 * queden por encima.
 *
 * @usage
 *   <BottomNavigationBar activeTab="home" onChange={(tab) => setActiveTab(tab)} />
 */
'use client';

import React from 'react';
import { Home, MapPin, Wallet, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

export type DriverTab = 'home' | 'routes' | 'wallet' | 'settings';

interface NavItem {
  id: DriverTab;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home',     label: 'Inicio',     icon: Home },
  { id: 'routes',   label: 'Rutas',      icon: MapPin },
  { id: 'wallet',   label: 'Billetera',  icon: Wallet },
  { id: 'settings', label: 'Ajustes',    icon: Settings },
];

interface BottomNavigationBarProps {
  activeTab: DriverTab;
  onChange: (tab: DriverTab) => void;
}

export const BottomNavigationBar: React.FC<BottomNavigationBarProps> = ({
  activeTab,
  onChange,
}) => {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 pb-[env(safe-area-inset-bottom,0px)] bg-black/80 backdrop-blur-3xl border-t border-white/[0.06] shadow-[0_-10px_40px_rgba(0,0,0,0.6)]"
      role="navigation"
      aria-label="Navegación principal del conductor"
    >
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <motion.button
              key={item.id}
              onClick={() => onChange(item.id)}
              whileTap={{ scale: 0.9 }}
              className={`relative flex flex-col items-center justify-center gap-0.5 w-20 h-14 rounded-2xl transition-colors duration-200 ${
                isActive
                  ? 'text-[#FFD400]'
                  : 'text-zinc-600 active:text-zinc-400'
              }`}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
            >
              {/* Highlight background for active tab */}
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-active-bg"
                  className="absolute inset-0 rounded-2xl bg-[#FFD400]/5 border border-[#FFD400]/10"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}

              {/* Icon container */}
              <div className="relative z-10 flex items-center justify-center">
                <Icon size={22} />
              </div>

              {/* Label */}
              <span
                className={`relative z-10 text-[9px] font-black uppercase tracking-[0.15em] transition-colors duration-200 ${
                  isActive ? 'text-[#FFD400]' : 'text-zinc-600'
                }`}
              >
                {item.label}
              </span>

              {/* Active dot indicator */}
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-active-dot"
                  className="absolute -top-0.5 w-5 h-0.5 rounded-full bg-[#FFD400] shadow-[0_0_10px_rgba(255,212,0,0.6)]"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigationBar;