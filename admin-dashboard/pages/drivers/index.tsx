import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { IdCard, Search, UserCheck, UserX, Tablet, ChevronDown, Plus, AlertTriangle, CheckCircle2, Download, Lock, Unlock, Zap, User, ShieldCheck, CreditCard, Radio, ExternalLink, Smartphone, Navigation } from 'lucide-react';
import clsx from 'clsx';
import { getDrivers, updateDriverSubscription } from '../../services/api';
import DriverModal from '../../components/DriverModal';
import { useTabSync } from '../../hooks/useTabSync';
import { notifyChange } from '../../lib/sync-channel';
import WhatsAppButton from '../../components/ui/WhatsAppButton';

// Helper: obtiene la base URL del API de producción
const getApiBase = () => {
  if (typeof window === 'undefined') return '';
  // @ts-ignore
  const stored = (window as unknown as Record<string, string>).TAD_API_URL;
  if (stored) return stored;
  // En producción usa la URL del backend desplegado en EasyPanel
  return process.env.NEXT_PUBLIC_API_URL || 'https://proyecto-ia-tad-api.rewvid.easypanel.host/api';
};

const getTelemetryUrl = (deviceId: string) => {
  // Points to the new tad-driver.html business hub, pre-filling the deviceId and server via URL
  const base = process.env.NEXT_PUBLIC_PLAYER_URL || 'https://proyecto-ia-tad-player.rewvid.easypanel.host';
  const api = getApiBase();
  return `${base}/tad-driver.html?deviceId=${deviceId}&server=${encodeURIComponent(api)}`;
};

export default function DriversPage() {
  const [drivers, setDrivers] = useState<{ 
    id: string; 
    fullName: string; 
    phone?: string; 
    taxiPlate?: string; 
    taxiNumber?: string; 
    deviceId?: string; 
    status: string; 
    subscriptionPaid: boolean; 
    device?: { deviceId: string };
    activeAds?: number;
    projectedEarnings?: number;
    cedula?: string;
    licensePlate?: string;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'blocked' | 'unpaid'>('all');

  // Recuperar filtros guardados al montar el componente
  useEffect(() => {
    const savedSearch = localStorage.getItem('tad_drivers_search');
    const savedFilter = localStorage.getItem('tad_drivers_filter');
    if (savedSearch) setSearch(savedSearch);
    if (savedFilter) setFilter(savedFilter as any);
  }, []);

  // Persistir cambios en filtros
  const handleSearchChange = (val: string) => {
    setSearch(val);
    localStorage.setItem('tad_drivers_search', val);
  };

  const handleFilterChange = (val: 'all' | 'active' | 'blocked' | 'unpaid') => {
    setFilter(val);
    localStorage.setItem('tad_drivers_filter', val);
  };

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDrivers();
      setDrivers(data || []);
    } catch (err: unknown) {
      console.error('Error loading drivers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useTabSync('CONDUCTORES', loadDrivers);

  useEffect(() => {
    loadDrivers();
  }, [loadDrivers]);

  const handleToggleStatus = async (driverId: string, currentPaidStatus: boolean) => {
    try {
      const newStatus = !currentPaidStatus;
      await updateDriverSubscription(driverId, { paid: newStatus });
      setDrivers(prev => prev.map(d => {
        if (d.id === driverId) {
          return { ...d, subscriptionPaid: newStatus, status: newStatus ? 'ACTIVE' : 'BLOCKED' };
        }
        return d;
      }));
      notifyChange('CONDUCTORES');
    } catch (err: unknown) {
      console.error(err);
      alert('Error crítico en actualización de credenciales.');
    }
  };

  const downloadCSV = () => {
    const headers = ['ID Flota', 'Nombre', 'Teléfono', 'Placa', 'Estado', 'Suscripción'];
    const rows = filtered.map(d => [
      d.taxiNumber, 
      `"${d.fullName}"`, 
      d.phone, 
      d.taxiPlate, 
      d.status, 
      d.subscriptionPaid ? 'Pagado' : 'Pendiente'
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `RED_TAD_REPORT_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = drivers.filter(d => {
    const name = d.fullName || '';
    const plate = d.taxiPlate || '';
    const matchSearch = name.toLowerCase().includes(search.toLowerCase()) || plate.toLowerCase().includes(search.toLowerCase());
    if (filter === 'active') return matchSearch && d.status === 'ACTIVE';
    if (filter === 'blocked') return matchSearch && (d.status === 'BLOCKED' || d.status === 'SUSPENDED' || d.status === 'INACTIVE');
    if (filter === 'unpaid') return matchSearch && !d.subscriptionPaid;
    return matchSearch;
  });

  const stats = {
    total: drivers.length,
    active: drivers.filter(d => d.status === 'ACTIVE').length,
    blocked: drivers.filter(d => d.status !== 'ACTIVE').length,
    revenue: drivers.filter(d => d.status === 'ACTIVE').length * 6000,
  };

  return (
    <div className="min-h-screen pb-20 animate-in fade-in duration-1000 relative selection:bg-tad-yellow selection:text-black font-sans">
      {/* Background Decor */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-tad-yellow/[0.04] blur-[150px] rounded-full animate-pulse-soft" />
         <div className="absolute bottom-[0%] right-[-5%] w-[40%] h-[40%] bg-white/[0.01] blur-[120px] rounded-full" />
      </div>

      {/* Page Context Transition */}
      <div className="flex items-center gap-3 mb-8 opacity-60">
        <div className="w-8 h-px bg-white/20" />
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.4em]">Fleet Partners / Crew Management v4.2</p>
      </div>

      <div className="flex justify-end mb-10">
        <div className="flex items-center gap-4 bg-zinc-900/40 backdrop-blur-3xl p-1.5 rounded-2xl border border-white-[0.03] shadow-inner">
           <button 
             onClick={downloadCSV}
             className="px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white hover:bg-gray-800 transition-all flex items-center gap-2"
           >
             <Download className="h-4 w-4" />
             Exportar
           </button>
           <button 
             onClick={() => setIsModalOpen(true)}
             className="bg-tad-yellow text-black px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-yellow-400 transition-all shadow-md"
           >
             <Plus className="h-4 w-4" />
             Nuevo Socio
           </button>
        </div>
      </div>

      {/* Stats Cluster */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
         {[
           { label: 'Red Global', value: stats.total, icon: User, color: 'text-white', bgColor: 'bg-gray-800/80', border: 'border-gray-700' },
           { label: 'Online / Activos', value: stats.active, icon: UserCheck, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
           { label: 'Escrutinio / Bloqueo', value: stats.blocked, icon: UserX, color: 'text-rose-400', bgColor: 'bg-rose-500/10', border: 'border-rose-500/20' },
           { label: 'Proyección Anual', value: `RD$ ${stats.revenue.toLocaleString()}`, icon: CreditCard, color: 'text-tad-yellow', bgColor: 'bg-tad-yellow/10', border: 'border-tad-yellow/20' },
         ].map((stat, i) => (
            <div key={i} className={clsx("bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 p-6 rounded-3xl group hover:border-gray-500 transition-all duration-300 relative flex flex-col justify-between shadow-md hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-8 fill-mode-both driver-stat-card")}>
               <style jsx>{`
                 .driver-stat-card { animation-delay: ${i * 50}ms; }
               `}</style>
               <div className="flex justify-between items-start mb-6">
                  <div className={clsx("p-3 rounded-2xl border transition-all duration-300 shadow-sm", stat.bgColor, stat.border, stat.color)}>
                     <stat.icon className="w-5 h-5" />
                  </div>
                  <div className="h-1.5 w-1.5 rounded-full bg-gray-600 group-hover:bg-tad-yellow transition-colors shadow-[0_0_8px_#fad400]" />
               </div>
               <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{stat.label}</p>
                  <h3 className={clsx("text-3xl font-bold tracking-tight leading-none mt-1", stat.color)}>{stat.value}</h3>
               </div>
            </div>
          ))}
      </div>

      {/* Search & Filtration Terminal */}
      <div className="relative mb-10 animate-in slide-in-from-top-10 duration-700 fill-mode-both">
          <div className="relative flex flex-col lg:flex-row gap-4 p-2 bg-gray-800/40 border border-gray-700/50 backdrop-blur-xl rounded-2xl shadow-md">
            <div className="relative flex-1 group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-tad-yellow transition-colors" />
              <input 
                type="text" 
                placeholder="BUSCAR SOCIOS, PLACAS O PANTALLAS..."
                className="w-full bg-gray-900/50 border border-gray-700/50 rounded-xl py-4 pl-14 pr-6 text-xs font-bold uppercase tracking-widest text-white outline-none focus:border-tad-yellow/50 transition-all placeholder:text-gray-600 shadow-inner"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <div className="flex p-1 bg-gray-900/50 rounded-xl border border-gray-700/50 shadow-inner overflow-x-auto">
              {(['all', 'active', 'blocked', 'unpaid'] as const).map((f) => (
                <button
                  key={f}
                onClick={() => handleFilterChange(f)}
                  className={clsx(
                    "px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                    filter === f 
                      ? "bg-gray-700 text-white shadow-sm" 
                      : "text-gray-500 hover:text-white hover:bg-gray-800"
                  )}
                >
                  {f === 'all' ? 'All' : f === 'active' ? 'Active' : f === 'blocked' ? 'Blocked' : 'Unpaid'}
                </button>
              ))}
            </div>
          </div>
      </div>

      {loading && !drivers.length ? (
        <div className="py-32 flex flex-col items-center justify-center animate-in fade-in duration-1000">
           <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mb-6 relative group border border-gray-700/50 shadow-md">
              <Radio className="w-8 h-8 text-tad-yellow animate-pulse" />
              <div className="absolute inset-0 bg-tad-yellow/10 blur-xl animate-pulse -z-10" />
           </div>
           <h3 className="text-xl font-bold text-white uppercase tracking-widest mb-2">Sincronizando Pantallas</h3>
           <p className="text-xs text-gray-500 font-bold uppercase tracking-widest animate-pulse">Descargando Base de Datos...</p>
        </div>
      ) : (
        <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-3xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-900/40 border-b border-gray-700/50">
                  <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Bio/Contacto</th>
                  <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Identidad Vehicular</th>
                  <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Hardware Core</th>
                  <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Auditoría</th>
                  <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Status</th>
                  <th className="px-8 py-6 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {filtered.map((driver, idx) => (
                  <React.Fragment key={driver.id}>
                    <tr className={clsx(
                      "group hover:bg-gray-900/40 transition-all cursor-default",
                      expandedId === driver.id && "bg-tad-yellow/[0.02]"
                    )}>
                      <td className="px-8 py-6">
                        <div className={"flex items-center gap-5 animate-in slide-in-from-left-4 duration-500 fill-mode-both " + (idx === 0 ? "delay-0" : idx === 1 ? "delay-50" : idx === 2 ? "delay-100" : idx === 3 ? "delay-150" : "delay-200")}>
                          <div className="w-12 h-12 bg-gray-900/80 rounded-xl flex items-center justify-center border border-gray-700/50 group-hover:border-tad-yellow/40 transition-all shadow-sm group-hover:-translate-y-1">
                            <span className="text-sm font-bold text-tad-yellow">#{driver.taxiNumber}</span>
                          </div>
                          <div>
                            <p className="text-base font-bold text-white uppercase tracking-tight group-hover:text-tad-yellow transition-colors leading-none mb-1">{driver.fullName}</p>
                            <div className="flex items-center gap-2">
                               <p className="text-xs text-gray-500 font-bold tracking-widest">{driver.phone}</p>
                               <WhatsAppButton phone={driver.phone} name={driver.fullName} className="scale-75 origin-left ml-[-4px]" />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className={"flex flex-col gap-1.5 animate-in slide-in-from-left-4 duration-500 fill-mode-both " + (idx === 0 ? "delay-0" : idx === 1 ? "delay-50" : idx === 2 ? "delay-100" : idx === 3 ? "delay-150" : "delay-200")}>
                          <span className="text-[10px] font-bold text-gray-300 bg-gray-900/50 px-3 py-1 rounded-lg border border-gray-700/50 w-fit uppercase tracking-widest shadow-inner">PLACA: {driver.taxiPlate}</span>
                          <span className="text-[10px] font-mono font-bold text-gray-500 ml-1">ID: {driver.id.slice(0, 8).toUpperCase()}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        {driver.deviceId ? (
                          <div className={"inline-flex flex-col items-center animate-in slide-in-from-left-4 duration-500 fill-mode-both " + (idx === 0 ? "delay-0" : idx === 1 ? "delay-50" : idx === 2 ? "delay-100" : idx === 3 ? "delay-150" : "delay-200")}>
                             <Link 
                                href={`/fleet?search=${driver.deviceId}`}
                                className="flex items-center gap-2 mb-1 px-3 py-1 bg-emerald-500/10 rounded-md border border-emerald-500/20 hover:bg-emerald-500 hover:text-black transition-all group/link"
                                title="Ver Pantalla en Monitoreo"
                             >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] group-hover/link:bg-black" />
                                <span className="text-[9px] font-bold uppercase">ENLAZADO</span>
                                <ExternalLink className="w-2.5 h-2.5 ml-1" />
                             </Link>
                             <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">{driver.deviceId.slice(0, 10)}...</span>
                          </div>
                        ) : (
                          <div className={"flex flex-col items-center opacity-50 animate-in slide-in-from-left-4 duration-500 fill-mode-both " + (idx === 0 ? "delay-0" : idx === 1 ? "delay-50" : idx === 2 ? "delay-100" : idx === 3 ? "delay-150" : "delay-200")}>
                             <Tablet className="w-4 h-4 text-gray-600 mb-1" />
                             <span className="text-[10px] font-bold text-gray-600 uppercase">SIN_HARDWARE</span>
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        {driver.subscriptionPaid ? (
                          <div className={"space-y-1 animate-in slide-in-from-left-4 duration-500 fill-mode-both " + (idx === 0 ? "delay-0" : idx === 1 ? "delay-50" : idx === 2 ? "delay-100" : idx === 3 ? "delay-150" : "delay-200")}>
                             <div className="flex items-center gap-2 group/tip">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                <span className="text-[10px] font-bold text-white uppercase tracking-widest">Suscripción Activa</span>
                             </div>
                             <p className="text-[10px] text-emerald-500/80 font-bold uppercase ml-6">Pagado (RD$6K)</p>
                          </div>
                        ) : (
                          <div className={"space-y-1 animate-in slide-in-from-left-4 duration-500 fill-mode-both " + (idx === 0 ? "delay-0" : idx === 1 ? "delay-50" : idx === 2 ? "delay-100" : idx === 3 ? "delay-150" : "delay-200")}>
                             <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
                                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Suscripción Vencida</span>
                             </div>
                             <p className="text-[10px] text-gray-500 font-bold uppercase ml-6">Acción Requerida</p>
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className={"flex flex-col items-end animate-in slide-in-from-left-4 duration-500 fill-mode-both " + (idx === 0 ? "delay-0" : idx === 1 ? "delay-50" : idx === 2 ? "delay-100" : idx === 3 ? "delay-150" : "delay-200")}>
                          <div className={clsx(
                            "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-widest transition-all",
                            driver.status === 'ACTIVE' 
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                              : 'bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]'
                          )}>
                            <span className={clsx("w-1.5 h-1.5 rounded-full", driver.status === 'ACTIVE' ? "bg-emerald-500" : "bg-rose-500")} />
                            {driver.status === 'ACTIVE' ? 'Operativo' : 'Inhibido'}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className={"flex items-center gap-3 justify-end animate-in slide-in-from-left-4 duration-500 fill-mode-both " + (idx === 0 ? "delay-0" : idx === 1 ? "delay-50" : idx === 2 ? "delay-100" : idx === 3 ? "delay-150" : "delay-200")}>
                          {driver.deviceId && (
                            <>
                              <a 
                                href={getTelemetryUrl(driver.deviceId)} 
                                target="_blank" 
                                rel="noreferrer" 
                                title="Ver Hub del Conductor (TAD DRIVE)"
                                className="p-2.5 rounded-xl transition-all border border-blue-400/20 bg-blue-400/5 text-blue-400 hover:bg-blue-400 hover:text-white flex items-center justify-center shadow-sm"
                              >
                                <Smartphone className="w-4 h-4" />
                              </a>
                              <Link 
                                href={`/tracking?search=${driver.deviceId}`}
                                title="Rastrear GPS en Tiempo Real"
                                className="p-2.5 rounded-xl transition-all border border-tad-yellow/20 bg-tad-yellow/5 text-tad-yellow hover:bg-tad-yellow hover:text-black flex items-center justify-center shadow-sm"
                              >
                                <Navigation className="w-4 h-4" />
                              </Link>
                            </>
                          )}
                          <button 
                            onClick={() => handleToggleStatus(driver.id, driver.subscriptionPaid)}
                            className={clsx(
                              "p-2.5 rounded-xl transition-all border shadow-sm flex items-center justify-center group-hover:-translate-y-0.5",
                              driver.status === 'ACTIVE' 
                                ? "text-rose-500 border-rose-500/20 bg-rose-500/5 hover:bg-rose-500 hover:text-white" 
                                : "text-emerald-500 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500 hover:text-white"
                            )}
                            title={driver.status === 'ACTIVE' ? 'Bloquear Socio' : 'Habilitar Socio'}
                          >
                            {driver.status === 'ACTIVE' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                          </button>
                          <button 
                            onClick={() => setExpandedId(expandedId === driver.id ? null : driver.id)}
                            title={expandedId === driver.id ? "Contraer" : "Expandir"}
                            className={clsx(
                              "p-2.5 rounded-xl transition-all border shadow-sm flex items-center justify-center group-hover:-translate-y-0.5",
                              expandedId === driver.id ? "bg-tad-yellow text-black border-tad-yellow" : "bg-gray-900 border-gray-700/50 text-gray-400 hover:text-white"
                            )}
                          >
                            <ChevronDown className={clsx("w-4 h-4 transition-transform duration-300", expandedId === driver.id ? "rotate-180" : "")} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Detail Terminal */}
                    {expandedId === driver.id && (
                      <tr className="bg-black/20 backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-500 shadow-inner">
                      <td colSpan={6} className="p-0 border-b border-t border-gray-700/50 border-t-tad-yellow/10">
                        <div className="p-8 border-l-4 border-tad-yellow grid grid-cols-1 md:grid-cols-3 gap-8 relative overflow-hidden">
                           <div className="absolute top-0 right-0 w-64 h-64 bg-tad-yellow/5 blur-[100px] -z-10" />
                          
                          {/* Hardware Panel */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-3 mb-4">
                               <div className="p-2 bg-tad-yellow/10 rounded-lg">
                                  <Tablet className="w-4 h-4 text-tad-yellow" />
                                </div>
                                <h4 className="text-white font-bold uppercase tracking-widest text-xs">Integración de Hardware</h4>
                            </div>
                            <div className="bg-gray-800/50 p-5 rounded-2xl border border-gray-700/50 space-y-4">
                              <div>
                                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1.5">UUID del Dispositivo</p>
                                <p className="text-white font-mono text-xs font-bold bg-gray-900 p-2.5 rounded-lg border border-gray-700/50">{driver.deviceId || 'PENDIENTE_REGISTRO'}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-[10px] text-gray-500 uppercase font-bold mb-1.5 tracking-widest">Estado</p>
                                  <p className="text-emerald-500 font-bold text-xs uppercase flex items-center gap-2">
                                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> ONLINE
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] text-gray-500 uppercase font-bold mb-1.5 tracking-widest">Pérdida Pkt.</p>
                                  <p className="text-white font-mono text-xs font-bold">0.00%</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Business Analytics */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-3 mb-4">
                               <div className="p-2 bg-gray-800 rounded-lg">
                                  <Zap className="w-4 h-4 text-white" />
                                </div>
                                <h4 className="text-white font-bold uppercase tracking-widest text-xs">Rendimiento Operativo</h4>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                               <div className="bg-gray-800/50 p-5 rounded-2xl border border-gray-700/50 flex justify-between items-center group/item hover:border-gray-500 transition-colors">
                                  <div>
                                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-0.5 group-hover/item:text-gray-300 transition-colors">Anuncios Transmitidos</p>
                                    <h5 className="text-xl font-bold text-white tracking-widest">--</h5>
                                  </div>
                                  <ShieldCheck className="w-8 h-8 text-gray-700" />
                               </div>
                               <div className="bg-tad-yellow/5 p-5 rounded-2xl border border-tad-yellow/10 flex justify-between items-center group/item hover:border-tad-yellow/30 transition-colors">
                                  <div>
                                    <p className="text-[10px] text-tad-yellow/60 uppercase font-bold tracking-widest mb-0.5">Dinero Acumulado</p>
                                    <h5 className="text-xl font-bold text-tad-yellow tracking-widest">RD$ 0.00</h5>
                                  </div>
                                  <CreditCard className="w-8 h-8 text-tad-yellow/20" />
                               </div>
                            </div>
                          </div>

                          {/* Compliance Panel */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-3 mb-4">
                               <div className="p-2 bg-emerald-500/10 rounded-lg">
                                  <IdCard className="w-4 h-4 text-emerald-500" />
                                </div>
                                <h4 className="text-white font-bold uppercase tracking-widest text-xs">Cumplimiento / Legal</h4>
                            </div>
                            <div className="bg-gray-800/50 p-5 rounded-2xl border border-gray-700/50 space-y-4">
                               <div>
                                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">Expediente Digital</p>
                                  <div className="flex gap-2">
                                     <button className="flex-1 bg-gray-900 border border-gray-700 p-2 rounded-lg text-[9px] font-bold text-gray-400 uppercase tracking-widest hover:border-tad-yellow hover:text-white transition-all">Contrato</button>
                                     <button className="flex-1 bg-gray-900 border border-gray-700 p-2 rounded-lg text-[9px] font-bold text-gray-400 uppercase tracking-widest hover:border-tad-yellow hover:text-white transition-all">Seguro</button>
                                  </div>
                               </div>
                               <button className="w-full bg-tad-yellow text-black font-black text-[9px] uppercase tracking-[0.2em] py-3 rounded-xl hover:scale-[1.02] transition-transform shadow-md">Auditar Expediente Completo</button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <DriverModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          loadDrivers();
          notifyChange('CONDUCTORES');
        }}
      />

    </div>
  );
}
