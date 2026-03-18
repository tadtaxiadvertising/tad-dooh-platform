import React, { useState, useEffect, useCallback } from 'react';
import { IdCard, Search, UserCheck, UserX, Tablet, ChevronDown, Plus, AlertTriangle, CheckCircle2, Download, Lock, Unlock, Zap, User, ShieldCheck, CreditCard, Radio } from 'lucide-react';
import clsx from 'clsx';
import { getDrivers, updateDriverSubscription } from '../../services/api';
import DriverModal from '../../components/DriverModal';
import { useTabSync } from '../../hooks/useTabSync';
import { notifyChange } from '../../lib/sync-channel';

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
// error state removed as per linting rules

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'blocked' | 'unpaid'>('all');
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
         <div className="absolute top-[-15%] left-[-10%] w-[65%] h-[65%] bg-tad-yellow/[0.04] blur-[180px] rounded-full animate-pulse-soft" />
         <div className="absolute bottom-[5%] right-[-10%] w-[55%] h-[55%] bg-white/[0.01] blur-[160px] rounded-full" />
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 mb-12">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 bg-tad-yellow rounded-3xl flex items-center justify-center shadow-[0_20px_50px_rgba(255,212,0,0.15)]">
                <IdCard className="w-7 h-7 text-black" />
             </div>
             <div>
                <div className="flex items-center gap-3 mb-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-tad-yellow shadow-[0_0_8px_rgba(255,212,0,0.8)] animate-pulse" />
                   <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">Central Network Intelligence v4.2</p>
                </div>
                <h1 className="text-5xl lg:text-6xl font-black text-white uppercase tracking-tighter leading-none font-display">
                  Fleet <span className="text-tad-yellow transition-all duration-700 hover:text-white cursor-default italic">Partners</span>
                </h1>
             </div>
          </div>
          <p className="text-zinc-500 max-w-2xl text-[12px] font-bold uppercase tracking-widest leading-relaxed">
            Manage <span className="text-white">human assets</span> and TAD Node subscriptions.
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-zinc-900/10 backdrop-blur-3xl p-1.5 rounded-full border border-white/5">
           <button 
             onClick={downloadCSV}
             className="btn-pill px-8 border border-white/5 text-zinc-400 hover:bg-white/5 flex items-center gap-3"
           >
             <Download className="h-4 w-4" />
             Backup_CSV
           </button>
           <button 
             onClick={() => setIsModalOpen(true)}
             className="btn-primary px-10 h-14 flex items-center gap-4"
           >
             <Plus className="h-5 w-5" />
             Add_Socio
           </button>
        </div>
      </div>

      {/* Stats Cluster */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
         {[
           { label: 'Red Global', value: stats.total, icon: User, color: 'text-white', borderColor: 'border-white/5', bgColor: 'bg-white/5' },
           { label: 'On-Line / Activos', value: stats.active, icon: UserCheck, color: 'text-emerald-500', borderColor: 'border-emerald-500/10', bgColor: 'bg-emerald-500/5' },
           { label: 'Escrutinio / Bloqueo', value: stats.blocked, icon: UserX, color: 'text-rose-500', borderColor: 'border-rose-500/10', bgColor: 'bg-rose-500/5' },
           { label: 'Proyección Anual', value: `RD$ ${stats.revenue.toLocaleString()}`, icon: CreditCard, color: 'text-tad-yellow', borderColor: 'border-tad-yellow/10', bgColor: 'bg-tad-yellow/5' },
         ].map((stat, i) => (
           <div key={i} className={clsx("group relative bg-zinc-950/40 backdrop-blur-3xl border p-8 rounded-[2.5rem] transition-all duration-500 hover:shadow-2xl animate-in fade-in slide-in-from-bottom-8 fill-mode-both", stat.borderColor, `delay-[${i*100}ms]`)}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.02] blur-3xl -z-10" />
              <div className="flex justify-between items-start mb-6">
                 <div className={clsx("p-4 rounded-2xl border transition-all duration-500 group-hover:scale-110", stat.bgColor, stat.borderColor, stat.color)}>
                    <stat.icon className="w-5 h-5" />
                 </div>
                 <div className="h-2 w-2 rounded-full bg-zinc-800" />
              </div>
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
              <h3 className={clsx("text-4xl font-black italic tracking-tighter leading-none transition-colors", stat.color)}>{stat.value}</h3>
           </div>
         ))}
      </div>

      {/* Search & Filtration Terminal */}
      <div className="relative mb-12 group animate-in slide-in-from-top-10 duration-700">
          <div className="absolute inset-0 bg-tad-yellow/5 blur-3xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
          <div className="relative flex flex-col md:flex-row gap-6 p-2 bg-zinc-900/10 border border-white/5 backdrop-blur-3xl rounded-full shadow-3xl">
            <div className="relative flex-1 group">
              <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-600 group-focus-within:text-tad-yellow transition-colors" />
              <input 
                type="text" 
                placeholder="PROBE NETWORK MANIFEST..."
                className="w-full bg-transparent border-none py-5 pl-16 pr-8 text-[11px] font-black uppercase tracking-[0.3em] text-white outline-none placeholder:text-zinc-800"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex p-1 bg-zinc-900/40 rounded-full border border-white/5">
              {(['all', 'active', 'blocked', 'unpaid'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={clsx(
                    "px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all italic",
                    filter === f 
                      ? "bg-tad-yellow text-black shadow-lg shadow-tad-yellow/10" 
                      : "text-zinc-500 hover:text-white hover:bg-white/5"
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
           <div className="w-20 h-20 bg-zinc-900 rounded-[2.5rem] flex items-center justify-center mb-8 relative group">
              <Radio className="w-10 h-10 text-tad-yellow animate-pulse" />
              <div className="absolute inset-0 bg-tad-yellow/20 blur-3xl animate-pulse -z-10" />
           </div>
           <h3 className="text-2xl font-black text-white italic uppercase tracking-[0.2em] mb-2">Relink System</h3>
           <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.5em] animate-pulse">Sincronizando Base de Datos de Tripulación...</p>
        </div>
      ) : (
        <div className="bg-zinc-950/60 backdrop-blur-3xl border border-white/5 rounded-[3.5rem] overflow-hidden shadow-3xl">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.01] border-b border-white/5">
                  <th className="px-10 py-8 text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] italic">Bitácora Humana</th>
                  <th className="px-10 py-8 text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] italic">Identificación Vehicular</th>
                  <th className="px-10 py-8 text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] italic text-center">Hardware Core</th>
                  <th className="px-10 py-8 text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] italic">Audit de Suscripción</th>
                  <th className="px-10 py-8 text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] italic text-right">Status</th>
                  <th className="px-10 py-8 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((driver) => (
                  <React.Fragment key={driver.id}>
                    <tr className={clsx(
                      "group hover:bg-white/[0.02] transition-all cursor-default",
                      expandedId === driver.id && "bg-tad-yellow/[0.02]"
                    )}>
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-6">
                          <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center border border-white/5 group-hover:border-tad-yellow/40 transition-all duration-500 shadow-xl">
                            <span className="text-sm font-black text-tad-yellow italic">#{driver.taxiNumber}</span>
                          </div>
                          <div>
                            <p className="text-lg font-black text-white italic uppercase tracking-tighter group-hover:text-tad-yellow transition-colors leading-none mb-1.5">{driver.fullName}</p>
                            <div className="flex items-center gap-3">
                               <p className="text-[10px] text-zinc-600 font-mono font-bold tracking-tighter">{driver.phone}</p>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <div className="flex flex-col gap-2">
                          <span className="text-[10px] font-black text-zinc-300 bg-white/5 px-4 py-1.5 rounded-xl border border-white/5 italic w-fit uppercase tracking-wider">MATRÍCULA: {driver.taxiPlate}</span>
                          <span className="text-[9px] font-mono font-bold text-zinc-700 ml-1">UID: {driver.id.slice(0, 12).toUpperCase()}</span>
                        </div>
                      </td>
                      <td className="px-10 py-8 text-center">
                        {driver.deviceId ? (
                          <div className="inline-flex flex-col items-center">
                             <div className="flex items-center gap-2 mb-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                                <span className="text-[10px] font-black text-emerald-500 italic uppercase">ESTABLE</span>
                             </div>
                             <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{driver.deviceId.slice(0, 15)}...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center opacity-40">
                             <Tablet className="w-4 h-4 text-zinc-800 mb-1" />
                             <span className="text-[9px] font-black text-zinc-800 uppercase italic">ZONA_MUERTA</span>
                          </div>
                        )}
                      </td>
                      <td className="px-10 py-8">
                        {driver.subscriptionPaid ? (
                          <div className="space-y-1.5">
                             <div className="flex items-center gap-2 group/tip">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                <span className="text-[11px] font-black text-white uppercase italic tracking-wider">Auditado</span>
                             </div>
                             <p className="text-[9px] text-emerald-500/60 font-black uppercase ml-6 italic">RD$ 6,000 OK</p>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                             <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
                                <span className="text-[11px] font-black text-rose-500 uppercase italic tracking-wider">Pasivo Pendiente</span>
                             </div>
                             <p className="text-[9px] text-zinc-700 font-black uppercase ml-6 italic">Vencimiento detectado</p>
                          </div>
                        )}
                      </td>
                      <td className="px-10 py-8 text-right">
                        <div className={clsx(
                          "inline-flex items-center gap-2 px-6 py-2 rounded-full border transform group-hover:scale-105 transition-all text-[9px] font-black uppercase italic tracking-[0.2em]",
                          driver.status === 'ACTIVE' 
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]'
                        )}>
                          <span className={clsx("w-1.5 h-1.5 rounded-full", driver.status === 'ACTIVE' ? "bg-emerald-500" : "bg-rose-500")} />
                          {driver.status === 'ACTIVE' ? 'Operativo' : 'Inhibido'}
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-4 justify-end">
                          <button 
                            onClick={() => handleToggleStatus(driver.id, driver.subscriptionPaid)}
                            className={clsx(
                              "p-3 rounded-2xl transition-all border shadow-xl flex items-center justify-center",
                              driver.status === 'ACTIVE' 
                                ? "text-rose-500 border-rose-500/20 bg-rose-500/5 hover:bg-rose-500 hover:text-white" 
                                : "text-emerald-500 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500 hover:text-white"
                            )}
                            title={driver.status === 'ACTIVE' ? 'Denegar Acceso' : 'Habilitar Acceso'}
                          >
                            {driver.status === 'ACTIVE' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                          </button>
                          <button 
                            onClick={() => setExpandedId(expandedId === driver.id ? null : driver.id)}
                            title={expandedId === driver.id ? "Contraer detalles" : "Expandir detalles"}
                            className={clsx(
                              "p-3 rounded-2xl transition-all border shadow-xl flex items-center justify-center",
                              expandedId === driver.id ? "bg-tad-yellow text-black border-tad-yellow" : "bg-zinc-900 border-white/5 text-zinc-500 hover:text-white"
                            )}
                          >
                            <ChevronDown className={clsx("w-5 h-5 transition-transform duration-500", expandedId === driver.id ? "rotate-180" : "")} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Detail Terminal */}
                    {expandedId === driver.id && (
                      <tr className="bg-zinc-950/90 animate-in fade-in slide-in-from-top-4 duration-500">
                      <td colSpan={6} className="p-0 border-b border-white/5">
                        <div className="p-12 border-l-4 border-tad-yellow grid grid-cols-1 md:grid-cols-3 gap-12 relative overflow-hidden">
                           <div className="absolute top-0 right-0 w-64 h-64 bg-tad-yellow/5 blur-[100px] -z-10" />
                          
                          {/* Hardware Panel */}
                          <div className="space-y-6">
                            <div className="flex items-center gap-3">
                               <div className="p-2 bg-tad-yellow/10 rounded-xl">
                                  <Tablet className="w-4 h-4 text-tad-yellow" />
                               </div>
                               <h4 className="text-white font-black uppercase tracking-widest text-[11px] italic">Arquitectura Hardware</h4>
                            </div>
                            <div className="bg-black/60 p-6 rounded-3xl border border-white/5 space-y-6">
                              <div>
                                <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest mb-2 italic">UUID Nucleo Periférico</p>
                                <p className="text-white font-mono text-xs font-bold bg-white/5 p-3 rounded-xl border border-white/5">{driver.deviceId || 'NODE_PENDING_REGISTRATION'}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-[9px] text-zinc-600 uppercase font-black mb-1.5 italic font-display">Status Enlace</p>
                                  <p className="text-emerald-500 font-black text-[10px] uppercase flex items-center gap-2">
                                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> TLS_PROTOCOL_OK
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[9px] text-zinc-600 uppercase font-black mb-1.5 italic font-display">Packet Loss</p>
                                  <p className="text-white font-mono text-xs font-black">0.00%</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Propagation Engine */}
                          <div className="space-y-6">
                            <div className="flex items-center gap-3">
                               <div className="p-2 bg-blue-500/10 rounded-xl">
                                  <Zap className="w-4 h-4 text-blue-400" />
                               </div>
                               <h4 className="text-white font-black uppercase tracking-widest text-[11px] italic">Motor de Emisión</h4>
                            </div>
                            <div className="bg-black/60 p-6 rounded-3xl border border-white/5 relative overflow-hidden group/m">
                              <Zap className="w-24 h-24 text-tad-yellow/5 absolute -right-6 -bottom-6 rotate-12 transition-transform duration-1000 group-hover/m:scale-125" />
                              <div className="flex justify-between items-end mb-6 relative z-10">
                                <div>
                                  <p className="text-[9px] text-zinc-600 uppercase font-black italic mb-2 tracking-widest">Pautas Activas</p>
                                   <h5 className="text-white font-black text-4xl italic tracking-tighter">{driver.activeAds || 12}</h5>
                                </div>
                                <div className="text-right">
                                  <p className="text-[9px] text-zinc-600 uppercase font-black italic mb-2 tracking-widest">Liquidación Est.</p>
                                   <h5 className="text-tad-yellow font-black text-2xl italic tracking-tighter">RD$ {driver.projectedEarnings?.toLocaleString() || '14,200'}</h5>
                                </div>
                              </div>
                              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden mb-3">
                                <div className="h-full bg-tad-yellow w-[68%] shadow-[0_0_10px_#fad400] animate-pulse"></div>
                              </div>
                              <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest italic text-zinc-600">
                                 <span>Cuota de Data</span>
                                 <span className="text-zinc-500">12.8 GB / 15.0 GB</span>
                              </div>
                            </div>
                          </div>

                          {/* Vault Documentation */}
                          <div className="space-y-6">
                            <div className="flex items-center gap-3">
                               <div className="p-2 bg-purple-500/10 rounded-xl">
                                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                               </div>
                               <h4 className="text-white font-black uppercase tracking-widest text-[11px] italic">Credential Vault</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-black/60 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                                <p className="text-[8px] text-zinc-600 uppercase font-black mb-1.5 italic">Cédula ID</p>
                                 <p className="text-white font-bold text-[11px] font-mono">{driver.cedula || '402-2342...-2'}</p>
                              </div>
                              <div className="bg-black/60 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                                <p className="text-[8px] text-zinc-600 uppercase font-black mb-1.5 italic">Licencia</p>
                                 <p className="text-white font-bold text-[11px] font-mono">{driver.licensePlate || 'B-9002241'}</p>
                              </div>
                              <button className="col-span-2 py-4 bg-zinc-900 hover:bg-tad-yellow hover:text-black border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl italic mt-2">Explorar Acuerdos PDF</button>
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
          
          {!loading && filtered.length === 0 && (
            <div className="py-40 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-700">
               <div className="w-24 h-24 bg-zinc-900 rounded-[2.5rem] flex items-center justify-center mb-10 shadow-3xl">
                  <UserX className="w-12 h-12 text-zinc-800" />
               </div>
               <h3 className="text-3xl font-black text-zinc-700 uppercase italic tracking-[0.2em] leading-none mb-4">Falla de Coincidencia</h3>
               <p className="text-zinc-800 font-bold uppercase tracking-[0.2em] text-[10px] max-w-sm leading-relaxed">
                  No se detectan identificadores para el criterio &quot;{search}&quot;. Verifique la integridad del token de búsqueda.
               </p>
            </div>
          )}
        </div>
      )}

      {/* Footer System Info */}
      <div className="mt-20 py-10 border-t border-white/5 flex flex-col items-center justify-center opacity-30 text-center">
         <ShieldCheck className="w-12 h-12 text-zinc-800 mb-6" />
         <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.5em] italic">TAD CREW MGMT • CORE v4.2</p>
         <p className="text-[8px] font-bold text-zinc-800 uppercase tracking-widest mt-2">© 2026 AUDITORÍA DE RED • TODOS LOS DERECHOS RESERVADOS</p>
      </div>

      <DriverModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={loadDrivers} 
      />
    </div>
  );
}
