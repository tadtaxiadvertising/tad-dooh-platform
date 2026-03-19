import { useState, useEffect } from 'react';
import useSWR from 'swr';
import api, { assignCampaignToDevices } from '../services/api';
import { X, CheckCircle, AlertTriangle, Monitor, Search, ChevronRight, Loader2, Info } from 'lucide-react';
import clsx from 'clsx';

const fetcher = (url: string) => api.get(url).then(res => res.data);

interface Device {
  device_id: string;
  name?: string;
  taxi_number?: string;
  taxiNumber?: string;
  status: string;
  occupied_slots: number;
  max_slots: number;
}

interface DeviceSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  campaignName: string;
  initialSelected?: string[];
  onSuccess?: () => void;
}

export default function DeviceSelectorModal({ 
  isOpen, 
  onClose, 
  campaignId, 
  campaignName,
  initialSelected = [],
  onSuccess
}: DeviceSelectorModalProps) {
  const { data: fleetSummary, isLoading: swrLoading, error: swrError } = useSWR(
    isOpen ? '/fleet/summary' : null, 
    fetcher, 
    { dedupingInterval: 60000, revalidateOnFocus: false }
  );

  const devices: Device[] = Array.isArray(fleetSummary) ? fleetSummary : [];
  const loading = swrLoading;

  useEffect(() => {
    if (isOpen) {
      setSelectedDevices(initialSelected);
    }
  }, [isOpen, initialSelected]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await assignCampaignToDevices(campaignId, selectedDevices);
      if (onSuccess) onSuccess();
      onClose();
    } catch (e) {
      console.error('Error assigning campaign:', e);
      alert('Error al asignar la campaña. Intente nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  const toggleDevice = (device: Device) => {
    const isFull = (device.max_slots || 15) - (device.occupied_slots || 0) <= 0;
    const isSelected = selectedDevices.includes(device.device_id);

    if (isFull && !isSelected) return; // Prevent selection if full (unless already selected to allow deselect)

    setSelectedDevices(prev => 
      prev.includes(device.device_id) 
        ? prev.filter(id => id !== device.device_id) 
        : [...prev, device.device_id]
    );
  };

  const filteredDevices = devices.filter(d => 
    d.name?.toLowerCase().includes(search.toLowerCase()) || 
    d.device_id?.toLowerCase().includes(search.toLowerCase()) ||
    d.taxi_number?.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 pointer-events-auto">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[30px] overflow-hidden shadow-[0_0_100px_rgba(250,212,0,0.1)] flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-8 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">
              Distribuir <span className="text-tad-yellow">Campaña</span>
            </h2>
            <button 
              onClick={onClose}
              className="p-2 bg-zinc-900 rounded-full text-zinc-500 hover:text-white transition-colors"
              title="Cerrar modal"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">{campaignName}</p>
        </div>

        {/* Search */}
        <div className="px-8 py-4 bg-zinc-950/50 border-b border-white/5">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-tad-yellow transition-colors" />
            <input 
              type="text" 
              placeholder="BUSCAR TAXI, ID O NOMBRE..."
              className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-[11px] font-black uppercase tracking-widest text-white focus:outline-none focus:border-tad-yellow/50 transition-all placeholder:text-zinc-700"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Device List */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 translate-y-[-10px]">
              <Loader2 className="w-12 h-12 text-tad-yellow animate-spin mb-4" />
              <p className="text-zinc-600 font-black text-[10px] tracking-widest uppercase italic">Sincronizando inventario en tiempo real...</p>
            </div>
          ) : swrError ? (
            <div className="flex flex-col items-center justify-center py-20 translate-y-[-10px]">
              <AlertTriangle className="w-12 h-12 text-rose-500 mb-4" />
              <p className="text-rose-500 font-black text-[10px] tracking-widest uppercase italic">Error al cargar el inventario</p>
            </div>
          ) : filteredDevices.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredDevices.map(device => {
                const count = device.occupied_slots || 0;
                const limit = device.max_slots || 15;
                const freeSlots = limit - count;
                const isSelected = selectedDevices.includes(device.device_id);
                const isFull = freeSlots <= 0;

                return (
                  <div 
                    key={device.device_id}
                    onClick={() => toggleDevice(device)}
                    className={clsx(
                      "group relative flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer overflow-hidden",
                      isSelected 
                        ? 'bg-tad-yellow/10 border-tad-yellow/40 shadow-[0_0_20px_rgba(250,212,0,0.05)]' 
                        : 'bg-zinc-900/40 border-white/5 hover:border-white/20',
                      isFull && !isSelected && 'opacity-40 cursor-not-allowed'
                    )}
                  >
                    {/* Background accent */}
                    <div className={clsx(
                      "absolute inset-0 bg-gradient-to-tr from-tad-yellow/5 to-transparent transition-opacity",
                      isSelected ? 'opacity-100' : 'opacity-0'
                    )} />

                    <div className="flex items-center gap-4 min-w-0 relative z-10">
                      <div className={clsx(
                        "p-2.5 rounded-xl border transition-colors",
                        isSelected 
                          ? 'bg-tad-yellow text-black border-tad-yellow' 
                          : 'bg-zinc-950/80 border-white/5 text-zinc-600'
                      )}>
                        {isSelected ? <CheckCircle className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className={clsx(
                          "text-[12px] font-black tracking-tight uppercase truncate transition-colors",
                          isSelected ? 'text-white' : 'text-zinc-400'
                        )}>
                          {device.taxi_number || device.name || device.device_id}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                           <div className={clsx(
                             "w-1 h-1 rounded-full",
                             device.status === 'online' ? 'bg-green-500' : 'bg-red-500'
                           )} />
                           <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest underline decoration-zinc-800">
                             {freeSlots} Slots libres
                           </p>
                        </div>
                      </div>
                    </div>

                    {isFull && !isSelected && (
                      <div className="bg-red-500/10 text-red-500 p-2 rounded-lg relative z-10">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    )}
                    
                    {isSelected && (
                      <div className="bg-tad-yellow text-black px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter relative z-10">
                        Marcado
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 opacity-40">
              <Search className="w-10 h-10 mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">No se encontraron pantallas</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-white/5 bg-zinc-950/80 backdrop-blur-xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-zinc-900 border border-white/5 rounded-2xl flex items-center gap-3">
              <Monitor className="w-4 h-4 text-tad-yellow" />
              <div>
                <p className="text-[14px] font-black text-white leading-none">{selectedDevices.length}</p>
                <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mt-1">Seleccionados</p>
              </div>
            </div>
            
            <div className="hidden sm:flex items-center gap-2 p-3 text-zinc-600">
               <Info className="w-4 h-4" />
               <p className="text-[9px] font-bold uppercase tracking-widest leading-tight max-w-[150px]">
                 Distribución a voluntad: Solo los taxis marcados recibirán esta campaña.
               </p>
            </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={saving || loading}
            className={clsx(
              "relative flex items-center justify-center gap-3 px-8 py-3.5 rounded-2xl font-black text-[12px] uppercase tracking-widest transition-all",
              saving || loading
                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                : 'bg-tad-yellow text-black hover:bg-yellow-400 hover:scale-105 active:scale-95 shadow-[0_10px_30px_rgba(250,212,0,0.2)]'
            )}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                Confirmar Emisión
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
