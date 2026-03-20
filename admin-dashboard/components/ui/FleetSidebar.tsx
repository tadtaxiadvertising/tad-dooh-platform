import React from 'react';
import { 
  X, Search, Filter, AlertTriangle, 
  CheckCircle2, WifiOff, MapPin, 
  ChevronRight, Smartphone
} from 'lucide-react';
import clsx from 'clsx';

interface FleetSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: any[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectVehicle: (v: any) => void;
  filter: 'all' | 'active' | 'offline' | 'unpaid';
  onFilterChange: (f: 'all' | 'active' | 'offline' | 'unpaid') => void;
}

export const FleetSidebar: React.FC<FleetSidebarProps> = ({
  isOpen, onClose, vehicles, searchQuery, onSearchChange, 
  onSelectVehicle, filter, onFilterChange
}) => {
  if (!isOpen) return null;

  const getStatusColor = (v: any) => {
    if (!v.isOnline) return 'bg-zinc-600';
    if (v.subscriptionStatus !== 'ACTIVE') return 'bg-red-500';
    return 'bg-tad-yellow';
  };

  return (
    <div className="absolute top-6 left-6 z-[1000] w-[350px] max-h-[calc(100%-48px)] bg-black/85 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-[0_30px_60px_rgba(0,0,0,0.6)] animate-in slide-in-from-left-8 duration-500">
      {/* Header Overlay Control */}
      <div className="p-6 border-b border-white/5 relative bg-gradient-to-br from-black to-zinc-950/20">
        <div className="flex items-center justify-between mb-6">
           <div>
              <h3 className="text-white font-black text-xs uppercase tracking-[0.2em] mb-1">Master Console</h3>
              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest leading-none">Flota Realtime Puerto Plata / Santiago</p>
           </div>
           <button 
             onClick={onClose} 
             title="Cerrar Consola"
             aria-label="Cerrar Consola de Flota"
             className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-tad-yellow/50"
           >
              <X className="w-4 h-4" />
           </button>
        </div>

        {/* Search Bar */}
        <div className="relative group mb-5">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 group-focus-within:text-tad-yellow transition-colors" />
           <input 
              type="text" 
              placeholder="BUSCAR VEHÍCULO O PLACA..." 
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-[10px] font-bold uppercase tracking-widest text-white outline-none focus:border-tad-yellow/30 placeholder:text-zinc-600 transition-all"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
           />
        </div>

        {/* Filter Toggles */}
        <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
           <FilterButton 
              active={filter === 'all'} 
              onClick={() => onFilterChange('all')} 
              icon={<Smartphone className="w-3 h-3" />}
              label="TODOS" 
              count={vehicles.length}
           />
           <FilterButton 
              active={filter === 'active'} 
              onClick={() => onFilterChange('active')} 
              icon={<CheckCircle2 className="w-3 h-3" />}
              label="ONLINE" 
              count={vehicles.filter(v => v.isOnline).length}
              color="text-tad-yellow"
           />
           <FilterButton 
              active={filter === 'offline'} 
              onClick={() => onFilterChange('offline')} 
              icon={<WifiOff className="w-3 h-3" />}
              label="OFFLINE" 
              count={vehicles.filter(v => !v.isOnline).length}
              color="text-zinc-500"
           />
           <FilterButton 
              active={filter === 'unpaid'} 
              onClick={() => onFilterChange('unpaid')} 
              icon={<AlertTriangle className="w-3 h-3" />}
              label="MORA" 
              count={vehicles.filter(v => v.subscriptionStatus !== 'ACTIVE').length}
              color="text-red-500"
           />
        </div>
      </div>

      {/* Vehicle List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 custom-scrollbar">
        {vehicles.length === 0 ? (
          <div className="py-20 text-center">
             <MapPin className="w-10 h-10 text-zinc-800 mx-auto mb-4" />
             <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest leading-none">Sin unidades detectadas en este filtro</p>
          </div>
        ) : vehicles.map((v, i) => (
          <div 
            key={v.deviceId} 
            onClick={() => onSelectVehicle(v)}
            className="group/item flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-tad-yellow/20 cursor-pointer transition-all duration-300 animate-in fade-in slide-in-from-left-4 [animation-delay:${i * 40}ms]"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                 <div className={clsx(
                   "w-9 h-9 rounded-lg flex items-center justify-center border font-mono text-[10px] font-black transition-all bg-zinc-900 border-zinc-800",
                   v.isOnline ? "text-tad-yellow border-tad-yellow/30" : "text-zinc-600 border-zinc-800"
                 )}>
                    {v.taxiNumber || "—"}
                 </div>
                 <div className={clsx("absolute -right-1 -bottom-1 w-2.5 h-2.5 rounded-full border-2 border-black", getStatusColor(v))} />
              </div>
              <div className="min-w-0">
                 <p className="text-[11px] font-black text-white uppercase truncate group-hover/item:text-tad-yellow transition-colors">{v.driverName || "CONDUC. GENERICO"}</p>
                 <div className="flex items-center gap-2">
                    <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">{v.city || "DOMINICANA"}</span>
                    <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">{v.plate || "PL_REF"}</span>
                 </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-700 group-hover/item:text-tad-yellow transition-all" />
          </div>
        ))}
      </div>

      {/* Footer Intel */}
      <div className="p-4 bg-zinc-950/50 border-t border-white/5 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_5px_#10b981]" />
            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Enlace Supabase Realtime OK</span>
         </div>
         <p className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.2em]">{vehicles.length} ACTIVE PROBES</p>
      </div>
    </div>
  );
};

const FilterButton = ({ active, onClick, label, count, color, icon }: any) => (
  <button 
    onClick={onClick}
    className={clsx(
      "shrink-0 px-3 py-1.5 rounded-lg border transition-all flex items-center gap-2 outline-none",
      active ? "bg-tad-yellow border-tad-yellow text-black" : "bg-black border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-white"
    )}
  >
    <div className={clsx(active ? "opacity-100" : color ? "opacity-100 " + color : "opacity-40")}>{icon}</div>
    <span className="text-[9px] font-black uppercase tracking-tight">{label}</span>
    <span className={clsx("text-[8px] font-black px-1.5 py-0.5 rounded-md leading-none", active ? "bg-black/20" : "bg-white/10")}>{count}</span>
  </button>
);
