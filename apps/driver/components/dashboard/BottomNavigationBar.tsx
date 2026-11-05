"use client";

// apps/driver/components/dashboard/BottomNavigationBar.tsx
/**
 * BottomNavigationBar — Barra de navegación inferior premium
 *
 * Mobile-first, 4 tabs (Inicio, Rutas, Billetera, Ajustes).
 * Glassmorphism intenso, animaciones framer-motion, safe-area-inset.
 * z-30 para que modales (DriverOnboardingModal z-[95], LockdownScreen z-[100])
 * queden por encima.
 *
 * @usage
 *   <BottomNavigationBar activeTab="home" onChange={(tab) => setActiveTab(tab)} />
 */

import React from "react";
import { Home, MapPin, Wallet, Settings } from "lucide-react";
import { motion } from "framer-motion";

export type DriverTab = "home" | "routes" | "wallet" | "settings";

interface NavItem {
  id: DriverTab;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Inicio", icon: Home },
  { id: "routes", label: "Rutas", icon: MapPin },
  { id: "wallet", label: "Billetera", icon: Wallet },
  { id: "settings", label: "Ajustes", icon: Settings },
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
    <>
      {/* Gradient fade para separar contenido del nav */}
      <div
        className="fixed bottom-16 left-0 right-0 z-30 h-8 pointer-events-none"
        style={{
          background: "linear-gradient(to top, #0a0a0a 0%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      <nav
        className="fixed bottom-0 left-0 right-0 z-30"
        role="navigation"
        aria-label="Navegación principal del conductor"
        style={{
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          background: "rgba(10, 10, 10, 0.92)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          borderTop: "1px solid rgba(255, 212, 0, 0.08)",
          boxShadow:
            "0 -8px 32px rgba(0, 0, 0, 0.5), 0 -1px 0 rgba(255, 255, 255, 0.03) inset",
        }}
      >
        <div className="mx-auto flex h-16 max-w-md items-center justify-around px-3">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <motion.button
                key={item.id}
                onClick={() => onChange(item.id)}
                whileTap={{ scale: 0.88 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="relative flex flex-col items-center justify-center gap-1 rounded-2xl transition-colors duration-200"
                style={{
                  width: "64px",
                  height: "56px",
                  minHeight: "48px",
                  color: isActive ? "#FFD400" : "#52525b",
                }}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
              >
                {/* Highlight background for active tab */}
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-active-bg"
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      background: "rgba(255, 212, 0, 0.08)",
                      border: "1px solid rgba(255, 212, 0, 0.12)",
                      boxShadow: "0 0 12px rgba(255, 212, 0, 0.1)",
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}

                {/* Icon container with glow when active */}
                <div
                  className="relative z-10 flex items-center justify-center"
                  style={{
                    filter: isActive
                      ? "drop-shadow(0 0 8px rgba(255, 212, 0, 0.4))"
                      : "none",
                  }}
                >
                  <Icon size={22} />
                </div>

                {/* Label */}
                <span
                  className="relative z-10 font-black uppercase tracking-[0.12em] transition-colors duration-200"
                  style={{
                    fontSize: "9px",
                    color: isActive ? "#FFD400" : "#52525b",
                  }}
                >
                  {item.label}
                </span>

                {/* Active dot indicator — top center */}
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-active-dot"
                    className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full"
                    style={{
                      width: "24px",
                      height: "3px",
                      background: "#FFD400",
                      boxShadow: "0 0 10px rgba(255, 212, 0, 0.6)",
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default BottomNavigationBar;
