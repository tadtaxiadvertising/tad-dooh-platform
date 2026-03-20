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
    <div className="w-full h-full flex flex-col overflow-hidden animate-in slide-in-from-right-8 duration-700">
      {/* Header Overlay Control */}
      <div className="p-8 border-b border-white/10 relative bg-gradient-to-br from-black to-zinc-950/20">
        <div className="flex items-center justify-between mb-8">
           <div>
              <h3 className="text-white font-black text-sm uppercase tracking-[0.2em] mb-1">Master Console <span className="text-tad-yellow">v4.5</span></h3>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-none">Flota Realtime Puerto Plata / Santiago</p>
           </div>
           <button 
             onClick={onClose} 
             title="Colapsar Panel"
             aria-label="Colapsar Panel de Flota"
             className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-rose-500/20 hover:border-rose-500/30 transition-all outline-none focus:ring-2 focus:ring-tad-yellow/50"
           >
              <X className="w-5 h-5" />
           </button>
        </div>

        {/* Search Bar */}
        <div className="relative group mb-6">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-tad-yellow transition-colors" />
           <input 
              type="search" 
              placeholder="BUSCAR VEHÍCULO O PLACA..." 
              className="w-full bg-zinc-900/40 border border-zinc-800 focus:border-tad-yellow/40 rounded-xl py-3.5 pl-11 pr-4 text-[11px] font-black uppercase tracking-widest text-white outline-none placeholder:text-zinc-600 transition-all backdrop-blur-md"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
           />
        </div>

        {/* Filter Toggles */}
        <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
           <FilterButton 
              active={filter === 'all'} 
              onClick={() => onFilterChange('all')} 
              icon={<Smartphone className="w-3.5 h-3.5" />}
              label="TODOS" 
              count={vehicles.length}
           />
           <FilterButton 
              active={filter === 'active'} 
              onClick={() => onFilterChange('active')} 
              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
              label="ONLINE" 
              count={vehicles.filter(v => v.isOnline).length}
              color="text-tad-yellow"
           />
           <FilterButton 
              active={filter === 'offline'} 
              onClick={() => onFilterChange('offline')} 
              icon={<WifiOff className="w-3.5 h-3.5" />}
              label="OFFLINE" 
              count={vehicles.filter(v => !v.isOnline).length}
              color="text-zinc-500"
           />
           <FilterButton 
              active={filter === 'unpaid'} 
              onClick={() => onFilterChange('unpaid')} 
              icon={<AlertTriangle className="w-3.5 h-3.5" />}
              label="MORA" 
              count={vehicles.filter(v => v.subscriptionStatus !== 'ACTIVE').length}
              color="text-red-500"
           />
        </div>
      </div>

      {/* Vehicle List */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4 custom-scrollbar bg-black/20">
        {vehicles.length === 0 ? (
          <div className="py-24 text-center opacity-40">
             <MapPin className="w-12 h-12 text-zinc-800 mx-auto mb-6" />
             <p className="text-[11px] font-black text-zinc-600 uppercase tracking-[0.3em] leading-none">Sin unidades detectadas</p>
          </div>
        ) : vehicles.map((v, i) => (
          <div 
            key={v.deviceId} 
            onClick={() => onSelectVehicle(v)}
            className="group/item flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-tad-yellow/30 cursor-pointer transition-all duration-500 animate-in fade-in slide-in-from-right-4 [animation-delay:100ms]"
          >
            <div className="flex items-center gap-5">
              <div className="relative">
                 <div className={clsx(
                   "w-11 h-11 rounded-xl flex items-center justify-center border font-mono text-[11px] font-black transition-all bg-zinc-950 border-zinc-900 shadow-inner",
                   v.isOnline ? "text-tad-yellow border-tad-yellow/40 bg-tad-yellow/5" : "text-zinc-700 border-zinc-900"
                 )}>
                    {v.taxiNumber || "—"}
                 </div>
                 <div className={clsx("absolute -right-1 -bottom-1 w-3 h-3 rounded-full border-2 border-black shadow-lg", getStatusColor(v))} />
                 {v.isOnline && <div className="absolute inset-0 rounded-xl bg-tad-yellow/10 animate-pulse pointer-events-none" />}
              </div>
              <div className="min-w-0">
                 <p className="text-xs font-black text-white uppercase truncate group-hover/item:text-tad-yellow transition-colors tracking-tight">{v.driverName || "CONDUC. GENERICO"}</p>
                 <div className="flex items-center gap-3 mt-1">
                    <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{v.city || "DOMINICANA"}</span>
                    <div className="w-1 h-1 rounded-full bg-zinc-800" />
                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-md">{v.plate || "PL_REF"}</span>
                 </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
               <div className="opacity-0 group-hover/item:opacity-100 transition-opacity">
                  <ChevronRight className="w-5 h-5 text-tad-yellow" />
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Intel */}
      <div className="p-6 bg-zinc-950 border-t border-white/10 flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]" />
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Enlace Satelital OK</span>
         </div>
         <p className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.3em]">{vehicles.length} NODE MAP</p>
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
