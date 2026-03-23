// admin-dashboard/components/ui/FleetSidebar.tsx
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
    if (!v.isOnline) return 'bg-zinc-800';
    if (v.subscriptionStatus !== 'ACTIVE') return 'bg-rose-500';
    return 'bg-tad-yellow';
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden animate-in slide-in-from-right-8 duration-700 bg-[#0a0a0a]/95 backdrop-blur-2xl border-l border-white/[0.05]">
      <div className="p-8 border-b border-white/[0.05] relative bg-gradient-to-br from-[#0c0c0c] to-black">
        <div className="flex items-start justify-between mb-8">
           <div className="flex flex-col">
              <span className="text-[10px] font-black text-tad-yellow uppercase tracking-[0.5em] mb-2 leading-none">Telemetry Monitor</span>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                <div className="w-1.5 h-6 bg-tad-yellow rounded-full shadow-[0_0_15px_rgba(250,212,0,0.4)]" />
                Control <span className="text-zinc-600 font-bold">de Flota</span>
              </h3>
           </div>
           <button 
             onClick={onClose} 
             title="Cerrar Panel"
             className="w-12 h-12 rounded-2xl bg-zinc-900/40 border border-white/10 text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all active:scale-95 group flex items-center justify-center shadow-xl"
           >
              <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
           </button>
        </div>

        <div className="relative group mb-6">
           <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-tad-yellow transition-all duration-300" />
           <input 
              type="search" 
              placeholder="IDENTIFICADOR O UNIDAD..." 
              className="w-full bg-black/60 border border-white/10 focus:border-tad-yellow/40 focus:ring-0 rounded-2xl py-5 pl-14 pr-6 text-[10px] font-black uppercase tracking-widest text-white outline-none placeholder:text-zinc-700 transition-all backdrop-blur-md shadow-2xl"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
           />
        </div>

        {/* Filter Selection with High Contrast */}
        <div className="flex gap-2 cursor-default overflow-x-auto pb-1 no-scrollbar selection:bg-transparent">
           <FilterBtn active={filter === 'all'} onClick={() => onFilterChange('all')} icon={<Smartphone className="w-3.5 h-3.5" />} label="LISTA" count={vehicles.length} />
           <FilterBtn active={filter === 'active'} onClick={() => onFilterChange('active')} icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="ONLINE" count={vehicles.filter(v => v.isOnline).length} color="text-emerald-500" />
           <FilterBtn active={filter === 'offline'} onClick={() => onFilterChange('offline')} icon={<WifiOff className="w-3.5 h-3.5" />} label="OFFLINE" count={vehicles.filter(v => !v.isOnline).length} color="text-zinc-700" />
           <FilterBtn active={filter === 'unpaid'} onClick={() => onFilterChange('unpaid')} icon={<AlertTriangle className="w-3.5 h-3.5" />} label="MORA" count={vehicles.filter(v => v.subscriptionStatus !== 'ACTIVE').length} color="text-rose-500" />
        </div>
      </div>

      {/* Vehicle List - Premium Hover and Hierarchy */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-3 custom-scrollbar bg-black/10">
        {vehicles.length === 0 ? (
          <div className="py-24 text-center opacity-10">
             <MapPin className="ml-auto mr-auto mb-4 w-12 h-12" />
             <p className="text-[10px] font-black uppercase tracking-widest">Sin unidades activas en zona</p>
          </div>
        ) : vehicles.map((v, i) => (
          <div 
            key={v.deviceId} 
            onClick={() => onSelectVehicle(v)}
            className="group/item flex items-center justify-between p-5 rounded-3xl border border-white/[0.03] bg-white/[0.01] hover:bg-white/[0.03] hover:border-tad-yellow/30 cursor-pointer transition-all duration-500 animate-in fade-in slide-in-from-right-4 relative overflow-hidden"
          >
            {/* Online Aura Overlay */}
            {v.isOnline && <div className="absolute inset-0 bg-tad-yellow/[0.01] pointer-events-none" />}
            
            <div className="flex items-center gap-5 relative z-10">
              <div className="relative">
                 <div className={clsx(
                   "w-12 h-12 rounded-2xl flex items-center justify-center border font-mono text-[11px] font-black transition-all bg-black shadow-inner",
                   v.isOnline ? "text-tad-yellow border-tad-yellow/40 group-hover/item:border-tad-yellow" : "text-zinc-800 border-white/5"
                 )}>
                    {v.taxiNumber || "—"}
                 </div>
                 <div className={clsx("absolute -right-1.5 -bottom-1.5 w-4 h-4 rounded-full border-4 border-black shadow-lg", getStatusColor(v))} />
                 {v.isOnline && <div className="absolute inset-0 rounded-2xl bg-tad-yellow/10 animate-pulse pointer-events-none" />}
              </div>
              <div className="min-w-0">
                 <p className="text-[13px] font-black text-gray-100 uppercase truncate group-hover/item:text-tad-yellow transition-colors tracking-tight leading-none mb-1.5">
                    {v.driverName || "CHOFER GENERICO"}
                 </p>
                 <div className="flex items-center gap-3">
                    <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest leading-none">{v.city || "DOMINICANA"}</span>
                    <div className="w-1 h-1 rounded-full bg-zinc-800" />
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">{v.plate || "PL_REF"}</span>
                 </div>
              </div>
            </div>
            
            <div className="relative z-10">
               <div className="p-2 rounded-xl bg-white/[0.02] border border-transparent group-hover/item:border-tad-yellow/20 group-hover/item:text-tad-yellow transition-all text-zinc-800">
                  <ChevronRight className="w-5 h-5" />
               </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-8 bg-black/60 border-t border-white/10 flex items-center justify-between backdrop-blur-3xl shadow-[0_-20px_40px_rgba(0,0,0,0.4)]">
         <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_15px_#10b981]" />
            <div className="flex flex-col">
               <span className="text-[10px] font-black text-white uppercase tracking-[0.3em] leading-none mb-1">Telemetry Active</span>
               <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest leading-none">Global Link OK</span>
            </div>
         </div>
         <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5">
            <p className="text-[11px] font-black text-white uppercase tracking-tighter">
               {vehicles.length} <span className="text-tad-yellow ml-1 tracking-widest">UNIDADES</span>
            </p>
         </div>
      </div>
    </div>
  );
};

const FilterBtn = ({ active, onClick, label, count, color, icon }: any) => (
  <button 
    onClick={onClick}
    className={clsx(
      "shrink-0 px-5 py-3 rounded-2xl border transition-all flex items-center gap-3 outline-none active:scale-95 shadow-lg relative group",
      active 
        ? "bg-tad-yellow border-tad-yellow text-black shadow-[0_8px_20px_rgba(250,212,0,0.15)] z-10" 
        : "bg-[#111111] border-white/5 text-zinc-600 hover:border-white/20 hover:text-white"
    )}
  >
    <div className={clsx("transition-colors", active ? "opacity-100" : color ? "opacity-100 " + color : "opacity-30")}>{icon}</div>
    <span className="text-[10px] font-black uppercase tracking-tight">{label}</span>
    <span className={clsx("text-[9px] font-black px-2 py-0.5 rounded-lg leading-none shadow-inner", active ? "bg-black/20" : "bg-white/5")}>{count}</span>
  </button>
);
