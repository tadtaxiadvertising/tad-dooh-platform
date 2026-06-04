import React from 'react';
import clsx from 'clsx';
import { X, Search } from 'lucide-react';

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

export function FleetSidebar({
  isOpen,
  onClose,
  vehicles,
  searchQuery,
  onSearchChange,
  onSelectVehicle,
  filter,
  onFilterChange,
}: FleetSidebarProps) {
  if (!isOpen) return null;

  return (
    <div className="h-full bg-zinc-950/95 backdrop-blur-3xl border-l border-white/5 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-widest text-white">Fleet Sidebar</h3>
        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
          <X className="w-4 h-4 text-zinc-500" />
        </button>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-[#fad400]/50"
          />
        </div>
      </div>

      {/* Filter buttons */}
      <div className="px-4 pb-4 flex gap-2">
        {(['all', 'active', 'offline', 'unpaid'] as const).map((f) => (
          <button
            key={f}
            onClick={() => onFilterChange(f)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all",
              filter === f ? "bg-[#fad400] text-black border-[#fad400]" : "bg-white/5 text-zinc-500 border-white/5 hover:border-white/10"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Vehicle list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-4">
        {vehicles.length === 0 ? (
          <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest text-center py-8">
            No vehicles found
          </p>
        ) : (
          <div className="space-y-2">
            {vehicles.map((v: any, i: number) => (
              <button
                key={v.deviceId || i}
                onClick={() => onSelectVehicle(v)}
                className="w-full p-3 bg-white/5 hover:bg-white/10 rounded-xl text-left transition-all border border-white/[0.02]"
              >
                <p className="text-[10px] font-black text-white uppercase tracking-tight">
                  {v.taxiNumber || v.deviceId || `Unit ${i + 1}`}
                </p>
                <p className="text-[8px] text-zinc-500 uppercase tracking-widest">
                  {v.isOnline ? 'Online' : 'Offline'}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}