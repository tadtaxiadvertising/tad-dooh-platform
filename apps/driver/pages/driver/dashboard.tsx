import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Header } from '../../components/dashboard/Header';
import { EarningsCard } from '../../components/dashboard/EarningsCard';
import { QuickActions } from '../../components/dashboard/QuickActions';
import { BottomNavigation } from '../../components/dashboard/BottomNavigation';
import { KillSwitchOverlay } from '../../components/dashboard/KillSwitchOverlay';
import { motion } from 'framer-motion';

export default function DriverDashboard() {
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'syncing'>('online');
  const [isSuspended, setIsSuspended] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

  // Simulación de estados para demostración
  useEffect(() => {
    // Simular sincronización cada 30 segundos
    const syncInterval = setInterval(() => {
      setConnectionStatus('syncing');
      setTimeout(() => setConnectionStatus('online'), 2000);
    }, 30000);

    // Escuchar cambios de red reales
    const handleOnline = () => setConnectionStatus('online');
    const handleOffline = () => setConnectionStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-32 pt-20">
      <Head>
        <title>Dashboard | TAD Driver</title>
      </Head>

      <Header connectionStatus={connectionStatus} />
      
      <main className="px-5 space-y-8 max-w-lg mx-auto">
        {/* Sección de Bienvenida */}
        <section>
          <h2 className="text-neutral-500 font-bold text-xs uppercase tracking-widest mb-1">
            Hola, Arismendy
          </h2>
          <h1 className="text-3xl font-bold tracking-tight">Tu Resumen de Hoy</h1>
        </section>

        {/* Tarjeta Principal de Ganancias */}
        <EarningsCard currentBalance={4500} maxLimit={7500} />

        {/* Acciones Rápidas */}
        <section>
          <h3 className="text-neutral-400 font-bold text-sm mb-4">Servicios y Soporte</h3>
          <QuickActions />
        </section>

        {/* Estado del Servicio / Telemetría */}
        <motion.section 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-5 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center justify-between"
        >
          <div>
            <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider mb-1">GPS & Telemetría</p>
            <p className="text-sm font-medium text-white/80">1,240 coordenadas enviadas hoy</p>
          </div>
          <div className="w-2 h-2 bg-[#FFD400] rounded-full animate-pulse shadow-[0_0_8px_#FFD400]" />
        </motion.section>

        {/* Botón de Test para Kill-Switch */}
        <button 
          onClick={() => setIsSuspended(true)}
          className="w-full py-2 text-neutral-600 text-[10px] uppercase font-bold hover:text-red-500/50 transition-colors"
        >
          Simular Suspensión de Cuenta (402)
        </button>
      </main>

      <BottomNavigation activeTab={activeTab} />

      {/* Pantalla de Bloqueo por Falta de Pago */}
      <KillSwitchOverlay isVisible={isSuspended} />
    </div>
  );
}
