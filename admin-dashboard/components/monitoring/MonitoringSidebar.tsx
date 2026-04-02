'use client';

import React from 'react';
import { Activity, Signal, AlertTriangle, Monitor, PlayCircle, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Device {
  deviceId: string;
  taxiNumber: string;
  isOnline: boolean;
  lastSeen: string;
}

interface Campaign {
  id: string;
  name: string;
  advertiser: string;
  targetImpressions: number;
  metrics: Array<{
    totalImpressions: number;
    deliveredImpressions: number;
  }>;
}

interface SidebarProps {
  devices: Device[];
  campaigns: Campaign[];
}

export default function MonitoringSidebar({ devices, campaigns }: SidebarProps) {
  const onlineCount = devices.filter(d => d.isOnline).length;
  const offlineCount = devices.length - onlineCount;

  return (
    <div className="flex flex-col h-full bg-slate-900/40 backdrop-blur-3xl border-l border-white/10 p-4 gap-6 overflow-y-auto w-96">
      {/* Header Resumen Flota */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Activity className="text-emerald-400 size-5" />
          Piloto Santiago
          <span className="ml-auto text-xs font-mono bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
            REAL-TIME
          </span>
        </h2>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800/80 p-3 rounded-xl border border-white/5 ring-1 ring-emerald-500/20">
            <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-1">Online</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white leading-none">{onlineCount}</span>
              <span className="text-slate-500 text-xs text-white">/ 10</span>
            </div>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-xl border border-white/5 ring-1 ring-rose-500/20">
            <p className="text-xs text-rose-400 font-bold uppercase tracking-wider mb-1">Offline</p>
            <div className="flex items-baseline gap-1 text-white">
              <span className="text-2xl font-black text-white leading-none tracking-tight">{offlineCount}</span>
              <span className="text-slate-500 text-xs text-white">/ 10</span>
            </div>
          </div>
        </div>
      </section>

      {/* Lista de Pantallas (STI-001 al STI-010) */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Monitor className="size-4" /> Flota STI (SANTIAGO)
        </h3>
        
        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
          {devices.map((device) => (
            <div 
              key={device.deviceId}
              className={clsx(
                "group relative p-3 rounded-lg border flex items-center justify-between transition-all duration-300",
                device.isOnline 
                  ? "bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10" 
                  : "bg-rose-500/5 border-rose-500/20 opacity-70 grayscale-[0.5] hover:opacity-100"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={clsx(
                  "p-2 rounded-md",
                  device.isOnline ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                )}>
                  <Signal className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-200">{device.deviceId}</p>
                  <p className="text-[10px] font-mono text-slate-500">Taxi: {device.taxiNumber}</p>
                </div>
              </div>
              
              <div className="text-right">
                <p className={clsx(
                  "text-[10px] font-bold",
                  device.isOnline ? "text-emerald-400" : "text-rose-400"
                )}>
                  {device.isOnline ? 'CONECTADO' : 'PENDIENTE'}
                </p>
                <p className="text-[9px] text-slate-500 font-medium">
                  <Clock className="inline size-2 mr-1" />
                  {device.lastSeen 
                    ? formatDistanceToNow(new Date(device.lastSeen), { addSuffix: true, locale: es })
                    : 'Nunca visto'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Seccion de Campañas (5 Anunciantes Activos) */}
      <section className="space-y-3 mt-auto">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <PlayCircle className="size-4" /> Campañas Activas (Piloto)
        </h3>
        
        <div className="space-y-3">
          {campaigns.map((camp) => {
            const impressions = camp?.metrics?.[0]?.totalImpressions || 0;
            const target = camp.targetImpressions || 100000;
            const progress = (impressions / target) * 100;
            
            return (
              <div key={camp.id} className="bg-slate-800/40 p-3 rounded-lg border border-white/5">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-[10px] text-indigo-400 font-bold uppercase">{camp.advertiser}</p>
                    <p className="text-sm font-bold text-white leading-tight">{camp.name}</p>
                  </div>
                  <AlertTriangle className="size-4 text-slate-600" />
                </div>
                
                {/* Progress Bar Progress */}
                <div className="w-full bg-slate-700 h-1 rounded-full overflow-hidden mb-1">
                  <div 
                    className="h-full bg-indigo-500 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(99,102,241,0.5)]" 
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>{impressions.toLocaleString()} impactos</span>
                  <span>{progress.toFixed(1)}% de meta</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
