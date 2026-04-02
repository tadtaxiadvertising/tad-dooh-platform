'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import axios from 'axios';
import { Loader2, Navigation, Radio, Map as MapIcon, Maximize2, ShieldAlert } from 'lucide-react';
import MonitoringSidebar from '../../components/monitoring/MonitoringSidebar';

// Import dynamic of Leaflet Map for CSR (Client Side Rendering)
const MonitoringMap = dynamic(
  () => import('../../components/monitoring/MonitoringMap'),
  { 
    ssr: false, 
    loading: () => (
      <div className="flex flex-col items-center justify-center h-full w-full bg-slate-900 animate-pulse rounded-xl">
        <Loader2 className="size-16 text-emerald-500 animate-spin mb-4" />
        <p className="text-emerald-400 font-mono text-sm uppercase tracking-widest">
          Cargando Geometría de Santiago...
        </p>
      </div>
    )
  }
);

export default function RealtimeDashboard() {
  const [devices, setDevices] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchData = async () => {
    try {
      // Usamos el API Proxy de Next.js que redirige al puerto 3000 del backend
      const [devicesRes, campaignsRes] = await Promise.all([
        axios.get('/api/proxy/monitoring/fleet-status'),
        axios.get('/api/proxy/monitoring/campaigns-status')
      ]);
      
      setDevices(devicesRes.data);
      setCampaigns(campaignsRes.data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Polling cada 30 segundos (Dashboard en tiempo real)
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-200 selection:bg-emerald-500/30">
      <Head>
        <title>TAD | Live Monitoring STI</title>
        <meta name="description" content="Dashboard de monitoreo en tiempo real de la flota TAD DOOH en Santiago de los Caballeros" />
      </Head>

      <main className="flex h-screen overflow-hidden">
        {/* Contenedor Principal (Mapa + Barra Lateral) Overlay */}
        <div className="flex-1 relative flex flex-col">
          
          {/* Header Dashboard Float Dashboard */}
          <div className="absolute top-6 left-6 z-20 flex flex-col gap-2">
            <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-5">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <Navigation className="text-emerald-400 size-5" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-white tracking-tight">TAD DRIVERS LIVE</h1>
                  <div className="flex items-center gap-2">
                    <Radio className="size-3 text-rose-500 animate-pulse" />
                    <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
                      Transmisión Activa: {lastUpdate.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="h-10 w-px bg-white/10 mx-2" />

              <div className="flex gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase text-slate-500 font-bold">Ciudad</span>
                  <span className="text-sm font-bold text-white flex items-center gap-1">
                    <MapIcon className="size-3 text-indigo-400" />
                    Santiago, RD
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase text-slate-500 font-bold">Flota STI</span>
                  <span className="text-sm font-bold text-white">10 Pantallas</span>
                </div>
              </div>
            </div>

            {/* Quick Actions Actions */}
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-slate-900/60 backdrop-blur-sm border border-white/5 rounded-full text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-2">
                <Maximize2 className="size-3" /> Pantalla Completa
              </button>
              <button className="px-4 py-2 bg-rose-500/20 border border-rose-500/30 rounded-full text-xs font-bold text-rose-400 hover:bg-rose-500/30 transition-colors flex items-center gap-2">
                <ShieldAlert className="size-3" /> Alertar Flota
              </button>
            </div>
          </div>

          {/* Area Area del Mapa (Cubre todo el fondo) */}
          <div className="absolute inset-0 z-0 p-4 pt-28">
            <MonitoringMap devices={devices} />
          </div>

          {/* Copyright Floating Copyright */}
          <div className="absolute bottom-6 left-6 z-10 text-[10px] text-slate-500 bg-slate-900/50 backdrop-blur-sm px-3 py-1 rounded-full border border-white/5">
            &copy; 2026 TAD DOOH Platform - Santiago Pilot - GPS Batching Active
          </div>
        </div>

        {/* Sidebar Sidebar de Datos */}
        <aside className="h-full z-30">
          <MonitoringSidebar devices={devices} campaigns={campaigns} />
        </aside>
      </main>

      {/* Global CSS Global para Leaflet UI Overlay */}
      <style jsx global>{`
        .leaflet-container {
          background: #0f172a !important;
          border-radius: 12px;
        }
        .leaflet-bar {
          border: 1px solid rgba(255,255,255,0.1) !important;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) !important;
        }
        .leaflet-bar a {
          background-color: #1e293b !important;
          color: white !important;
          border-bottom: 1px solid rgba(255,255,255,0.1) !important;
        }
        .leaflet-popup-content-wrapper {
          background: #1e293b !important;
          color: white !important;
          border-radius: 8px !important;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .leaflet-popup-tip {
          background: #1e293b !important;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
