import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Header } from '../../components/dashboard/Header';
import { EarningsCard } from '../../components/dashboard/EarningsCard';
import { QuickActions } from '../../components/dashboard/QuickActions';
import { KillSwitchOverlay } from '../../components/dashboard/KillSwitchOverlay';

export default function DriverDashboard() {
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'syncing'>('online');
  const [isSuspended, setIsSuspended] = useState(false);
  const [batchCount, setBatchCount] = useState(0);

  // Simulación de telemetría y red
  useEffect(() => {
    const interval = setInterval(() => {
      setBatchCount(prev => {
        if (prev >= 9) {
          setConnectionStatus('syncing');
          setTimeout(() => {
            setConnectionStatus(window.navigator.onLine ? 'online' : 'offline');
          }, 1500);
          return 0;
        }
        return prev + 1;
      });
    }, 5000);

    const handleOnline = () => setConnectionStatus('online');
    const handleOffline = () => setConnectionStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-4 pt-18 pb-8 font-sans">
      <Head>
        <title>TAD Driver | Monitor</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/>
      </Head>

      <Header connectionStatus={connectionStatus} batchCount={batchCount} />
      
      <main className="max-w-md mx-auto space-y-6">
        {/* Banner de Estado de Servicio */}
        <div className="bg-green-950/30 border border-green-500/50 p-3 flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">
            Servicio Activo: Publicidad en Curso
          </span>
        </div>

        {/* Ledger Financiero (Primer Tercio) */}
        <section>
          <EarningsCard currentBalance={4500} maxLimit={7500} />
        </section>

        {/* Acciones de Bloque (Segundo Tercio) */}
        <section>
          <h3 className="text-neutral-600 font-black text-[10px] uppercase tracking-[0.2em] mb-3 ml-1">
            Operaciones Tácticas
          </h3>
          <QuickActions />
        </section>

        {/* Footer Informativo */}
        <footer className="pt-8 text-center">
          <p className="text-neutral-700 text-[10px] font-bold uppercase tracking-widest">
            TAD DOOH Platform v11.0.0
          </p>
          <button 
            onClick={() => setIsSuspended(true)}
            className="mt-4 text-neutral-800 text-[9px] uppercase font-bold border border-neutral-900 px-3 py-1 hover:text-red-900"
          >
            Debug: Forzar Bloqueo 402
          </button>
        </footer>
      </main>

      {/* Pantalla de Lockdown */}
      <KillSwitchOverlay isVisible={isSuspended} />
    </div >
  );
}
