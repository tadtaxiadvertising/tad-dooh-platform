import React from 'react';
import { Home, ClipboardList, History, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'portal', label: 'Portal', icon: ClipboardList },
  { id: 'history', label: 'Historial', icon: History },
  { id: 'settings', label: 'Ajustes', icon: Settings },
];

export const BottomNavigation: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  return (
    <nav className="fixed bottom-6 left-4 right-4 z-40 h-20 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl flex items-center justify-around px-2 shadow-2xl">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <motion.button
            key={item.id}
            whileTap={{ scale: 0.9 }}
            className={`flex flex-col items-center justify-center gap-1 w-16 h-16 rounded-2xl transition-colors ${
              isActive ? 'text-[#FFD400]' : 'text-neutral-500'
            }`}
          >
            <div className={`relative flex items-center justify-center`}>
              <item.icon size={24} />
              {isActive && (
                <motion.div
                  layoutId="active-indicator"
                  className="absolute -bottom-2 w-1 h-1 bg-[#FFD400] rounded-full"
                />
              )}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
          </motion.button>
        );
      })}
    </nav>
  );
};
