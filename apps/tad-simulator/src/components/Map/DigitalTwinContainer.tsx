// @ts-nocheck
'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Expand, Shrink, Car, Zap, ShieldAlert, Activity, Wifi, Radio } from 'lucide-react';
import { useDigitalTwinEngine } from './useDigitalTwinEngine';

const MapView = dynamic(() => import('./MapView'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-screen bg-[#0e0e0e] flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-16 h-16 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"></div>
        <p className="mt-6 font-mono text-xs tracking-[0.3em] uppercase text-yellow-500">Iniciando Cartografía</p>
      </div>
    </div>
  )
});

export default function DigitalTwinContainer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showUI, setShowUI] = useState(true);
  
  // Parametros Core
  const [volume, setVolume] = useState(150);
  const [speed, setSpeed] = useState(2);
  const [debtorRate, setDebtorRate] = useState(8);
  
  // Resiliencia y Fallback (Network / API status)
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [apiPing, setApiPing] = useState('Online');

  useEffect(() => {
    // Health check autónomo para evitar caidas completas si el backend de TAD muere.
    const checkApi = async () => {
      try {
        // En una app real, apuntaría a /api/health real de la plataforma TAD.
        const res = await fetch('/api/simulation/state');
        if (!res.ok) throw new Error('API down');
        
        const data = await res.json();
        if (data.isFallback) throw new Error('API fallback');
        
        setIsLocalMode(false);
        setApiPing('Online');
      } catch (err) {
        setIsLocalMode(true);
        setApiPing('Local Engine');
      }
    };
    
    checkApi();
    const interval = setInterval(checkApi, 10000);
    return () => clearInterval(interval);
  }, []);

  const stats = useDigitalTwinEngine(volume, speed, debtorRate, isLocalMode);

  // Broadcasting Mode (Full-Screen API Nativa)
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error("Error entering fullscreen", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full transition-all duration-700 bg-black overflow-hidden font-sans ${
        isFullscreen ? 'h-screen fixed inset-0 z-[9999]' : 'h-[750px] rounded-2xl border border-white/5'
      }`}
    >
      {/* Map Content */}
      <MapView />

      <AnimatePresence>
        {showUI && (
          <>
            {/* Glassmorphism HUD Principal (Panel de Parámetros) */}
            <motion.div 
              initial={{ x: -400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -400, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 120 }}
              className="absolute top-6 left-6 z-50 w-80 bg-neutral-950/40 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.8)]"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                    <Car size={20} />
                  </div>
                  <div>
                    <h1 className="text-white font-bold text-lg leading-none tracking-tight">TAD Twin</h1>
                    <p className="text-neutral-400 text-[10px] uppercase tracking-widest mt-1">Control Hub</p>
                  </div>
                </div>
                
                {/* SRE: Network Pulse Tracker */}
                <div className="flex items-center gap-2" title={isLocalMode ? 'Autónomo - Fallback Data' : 'Conectado a TAD API'}>
                  <span className={`text-[10px] font-bold tracking-wider uppercase ${isLocalMode ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {apiPing}
                  </span>
                  <div className={`w-2.5 h-2.5 rounded-full ${isLocalMode ? 'bg-amber-500' : 'bg-emerald-500'} animate-[network-pulse_2s_infinite]`}></div>
                </div>
              </div>

              <div className="space-y-6">
                {/* HUD Slider: Volume */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-300 font-medium tracking-wide flex items-center gap-2">
                      <Activity size={14} className="text-yellow-500"/> Flota Renderizada
                    </span>
                    <span className="text-yellow-400 font-mono bg-neutral-900 px-2 py-1 rounded border border-white/5 shadow-inner">
                      {volume} / 500
                    </span>
                  </div>
                  <input 
                    type="range" min="10" max="500" step="10"
                    value={volume} onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-full accent-yellow-500 cursor-pointer h-1 bg-neutral-800 rounded-full appearance-none outline-none focus:ring-2 focus:ring-yellow-500/50"
                  />
                </div>

                {/* HUD Slider: Speed */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-300 font-medium tracking-wide flex items-center gap-2">
                      <Zap size={14} className="text-blue-400"/> Factor de Tiempo
                    </span>
                    <span className="text-blue-400 font-mono bg-neutral-900 px-2 py-1 rounded border border-white/5 shadow-inner">
                      {speed.toFixed(1)}x
                    </span>
                  </div>
                  <input 
                    type="range" min="1" max="10" step="0.5"
                    value={speed} onChange={(e) => setSpeed(Number(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer h-1 bg-neutral-800 rounded-full appearance-none outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                {/* HUD Slider: Debtor Rate */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-300 font-medium tracking-wide flex items-center gap-2">
                      <ShieldAlert size={14} className="text-red-500"/> Corte Morosidad
                    </span>
                    <span className="text-red-400 font-mono bg-neutral-900 px-2 py-1 rounded border border-white/5 shadow-inner">
                      {debtorRate}%
                    </span>
                  </div>
                  <input 
                    type="range" min="0" max="20" step="1"
                    value={debtorRate} onChange={(e) => setDebtorRate(Number(e.target.value))}
                    className="w-full accent-red-500 cursor-pointer h-1 bg-neutral-800 rounded-full appearance-none outline-none focus:ring-2 focus:ring-red-500/50"
                  />
                </div>
              </div>
            </motion.div>

            {/* SRE Stats Mini-Panel Bottom */}
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="absolute bottom-6 left-6 z-50 bg-neutral-950/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex gap-6 shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
            >
              <div className="flex flex-col min-w-[70px]">
                <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5 mb-1.5">
                  <Radio size={12} /> ENGINE FPS
                </span>
                <span className={`font-mono text-xl font-bold tracking-tighter ${stats.fps >= 55 ? 'text-green-400' : 'text-yellow-500'}`}>
                  {stats.fps}
                </span>
              </div>
              
              <div className="flex flex-col min-w-[70px] border-l border-white/10 pl-6">
                <span className="text-yellow-500/80 text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5 mb-1.5">
                  <Car size={12} /> ACTIVOS
                </span>
                <span className="font-mono text-xl font-bold text-yellow-500 tracking-tighter">
                  {stats.activeNodes}
                </span>
              </div>

              <div className="flex flex-col min-w-[70px] border-l border-white/10 pl-6">
                <span className="text-red-500/80 text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5 mb-1.5">
                  <ShieldAlert size={12} /> MOROSOS
                </span>
                <span className="font-mono text-xl font-bold text-red-500 tracking-tighter">
                  {stats.debtorNodes}
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Controles de Broadcasting y Visibilidad (Top Right) */}
      <div className="absolute top-6 right-6 z-50 flex flex-col gap-3">
        <button 
          onClick={() => setShowUI(!showUI)}
          className="w-12 h-12 bg-neutral-900/80 backdrop-blur-md border border-white/10 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer shadow-lg flex items-center justify-center"
          title="Toggle HUD OSD"
        >
          <span className="font-mono text-[10px] font-bold tracking-wider">{showUI ? 'OSD OFF' : 'OSD ON'}</span>
        </button>
        <button 
          onClick={toggleFullscreen}
          className="w-12 h-12 bg-yellow-500/10 backdrop-blur-md border border-yellow-500/20 rounded-xl text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/20 transition-all cursor-pointer shadow-lg flex items-center justify-center group"
          title="Broadcasting Mode"
        >
          {isFullscreen ? <Shrink size={20} className="group-hover:scale-90 transition-transform" /> : <Expand size={20} className="group-hover:scale-110 transition-transform" />}
        </button>
      </div>

    </div>
  );
}
