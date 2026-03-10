import React, { useState, useEffect } from 'react';
import { IdCard, Search, Filter, UserCheck, UserX, CreditCard, Tablet, Calendar, ChevronRight, ChevronDown, Plus, AlertTriangle, CheckCircle2, Clock, Download, Lock, Unlock, Zap, Activity } from 'lucide-react';
import clsx from 'clsx';
import { getDrivers, updateDriverSubscription } from '../../services/api';

export default function DriversPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'blocked' | 'unpaid'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadDrivers();
  }, []);

  const loadDrivers = async () => {
    setLoading(true);
    try {
      const data = await getDrivers();
      setDrivers(data || []);
    } catch (err) {
      console.error('Error loading drivers:', err);
      setError('Fallo al conectar con el servidor de flota.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (driverId: string, currentPaidStatus: boolean) => {
    try {
      // Toggle the paid status which determines ACTIVE or SUSPENDED/BLOCKED in the backend
      const newStatus = !currentPaidStatus;
      await updateDriverSubscription(driverId, { paid: newStatus });
      
      // Update local state
      setDrivers(prev => prev.map(d => {
        if (d.id === driverId) {
          return { ...d, subscriptionPaid: newStatus, status: newStatus ? 'ACTIVE' : 'BLOCKED' };
        }
        return d;
      }));
    } catch (err) {
      alert('Error al actualizar el estado del chofer');
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
    link.setAttribute("download", `reporte_choferes_${new Date().toISOString().split('T')[0]}.csv`);
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
    unpaid: drivers.filter(d => !d.subscriptionPaid).length,
  };

  return (
    <div className="animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
            Choferes y <span className="text-tad-yellow text-shadow-glow">Suscripciones</span>
          </h1>
          <p className="text-gray-400 max-w-2xl">
            Gestión integral de la red de conductores asociados. Monitorea suscripciones anuales (RD$6,000), tablets asignadas y estado operativo.
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={downloadCSV}
            className="flex items-center gap-2 bg-zinc-900 border border-white/10 hover:border-tad-yellow hover:text-tad-yellow text-white font-bold py-3 px-5 rounded-xl transition-all"
          >
            <Download className="w-5 h-5" />
            Reporte CSV
          </button>
          <button className="group flex gap-2 items-center bg-tad-yellow hover:bg-yellow-400 text-black font-extrabold py-3 px-6 rounded-xl transition-all active:scale-95 shadow-[0_0_15px_rgba(250,212,0,0.3)]">
            <Plus className="h-5 w-5" />
            Registrar Chofer
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Choferes', value: stats.total, icon: IdCard, color: 'text-white' },
          { label: 'Activos', value: stats.active, icon: UserCheck, color: 'text-emerald-400' },
          { label: 'Suspendidos', value: stats.blocked, icon: UserX, color: 'text-red-400' },
          { label: 'Pendientes Pago', value: stats.unpaid, icon: AlertTriangle, color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="bg-zinc-900/60 border border-white/5 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <s.icon className={clsx('w-5 h-5', s.color)} />
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{s.label}</span>
            </div>
            <p className={clsx('text-3xl font-black', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por nombre o placa..."
            className="w-full bg-zinc-900 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white outline-none focus:border-tad-yellow transition-colors"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'blocked', 'unpaid'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                'px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border',
                filter === f
                  ? 'bg-tad-yellow text-black border-transparent'
                  : 'bg-zinc-900 text-zinc-400 border-white/5 hover:border-white/20'
              )}
            >
              {f === 'all' ? 'Todos' : f === 'active' ? 'Activos' : f === 'blocked' ? 'Bloqueados' : 'Sin Pagar'}
            </button>
          ))}
        </div>
      </div>

      {/* Drivers Table */}
      <div className="bg-zinc-900/40 border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Chofer</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Placa</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Tablet</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Suscripción</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Estado</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(driver => (
                <React.Fragment key={driver.id}>
                  <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center border border-white/5">
                          <span className="text-[10px] font-black text-tad-yellow">{driver.taxiNumber}</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{driver.fullName}</p>
                          <p className="text-xs text-zinc-500">{driver.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono font-bold text-zinc-300 bg-zinc-800 px-2.5 py-1 rounded-lg">{driver.taxiPlate}</span>
                    </td>
                    <td className="px-6 py-4">
                      {driver.deviceId ? (
                        <span className="text-xs font-mono text-tad-yellow">{driver.deviceId}</span>
                      ) : (
                        <span className="text-xs text-zinc-600 italic">Sin asignar</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {driver.subscriptionPaid ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs text-emerald-400 font-bold">Pagado</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                          <span className="text-xs text-red-400 font-bold">Pendiente</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        'text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg',
                        driver.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      )}>
                        {driver.status === 'ACTIVE' ? 'Activo' : driver.status === 'SUSPENDED' ? 'Suspendido' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        <button 
                          onClick={() => handleToggleStatus(driver.id, driver.subscriptionPaid)}
                          className={clsx(
                            "p-2 rounded-lg hover:bg-white/5 transition-colors border",
                            driver.status === 'ACTIVE' ? "text-red-400 border-red-500/20 bg-red-500/5 hover:bg-red-500/10" : "text-emerald-400 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10"
                          )}
                          title={driver.status === 'ACTIVE' ? 'Bloquear Chofer' : 'Desbloquear Chofer'}
                        >
                          {driver.status === 'ACTIVE' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={() => setExpandedId(expandedId === driver.id ? null : driver.id)}
                          className="p-2 rounded-lg bg-zinc-900 border border-white/5 text-zinc-500 hover:text-white transition-colors"
                        >
                          {expandedId === driver.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === driver.id && (
                    <tr className="bg-zinc-950 border-b border-white/5">
                    <td colSpan={6} className="p-0">
                      <div className="p-6 border-l-2 border-tad-yellow flex gap-8 animate-in slide-in-from-top-2 duration-300">
                        
                        <div className="flex-1 space-y-4">
                          <h4 className="text-tad-yellow font-black uppercase tracking-widest text-xs flex items-center gap-2">
                            <Tablet className="w-4 h-4" /> Hardware y Conectividad
                          </h4>
                          {driver.device ? (
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-zinc-900 p-4 rounded-xl border border-white/5">
                                <p className="text-[10px] text-zinc-500 uppercase font-black">ID del Dispositivo</p>
                                <p className="text-white font-mono text-sm mt-1">{driver.device.deviceId || driver.deviceId}</p>
                              </div>
                              <div className="bg-zinc-900 p-4 rounded-xl border border-white/5">
                                <p className="text-[10px] text-zinc-500 uppercase font-black">Estado Hardware</p>
                                <p className="text-emerald-400 font-bold text-sm mt-1">Online</p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-zinc-500 italic px-4 py-3 bg-zinc-900 rounded-xl">Ninguna tablet enlazada a este perfil.</p>
                          )}
                        </div>

                        <div className="flex-1 space-y-4">
                          <h4 className="text-emerald-400 font-black uppercase tracking-widest text-xs flex items-center gap-2">
                            <Activity className="w-4 h-4" /> Anuncios y Perfil de Ganancias
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-zinc-900 p-4 rounded-xl border border-white/5 relative overflow-hidden">
                              <Zap className="w-10 h-10 text-emerald-500/10 absolute -right-2 -bottom-2" />
                              <p className="text-[10px] text-zinc-500 uppercase font-black">Ingreso Proyectado</p>
                              <p className="text-emerald-400 font-black text-xl mt-1">RD${driver.status === 'ACTIVE' ? '7,500' : '0'}</p>
                            </div>
                            <div className="bg-zinc-900 p-4 rounded-xl border border-white/5">
                              <p className="text-[10px] text-zinc-500 uppercase font-black">Slots Asignados</p>
                              <p className="text-white font-black text-xl mt-1">{driver.status === 'ACTIVE' ? '15' : '0'}/15</p>
                            </div>
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
    </div>
  );
}
