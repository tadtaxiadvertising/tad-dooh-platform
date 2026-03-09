import { useEffect, useState } from 'react';
import { getDeviceSlots } from '../services/api';
import { Zap, AlertCircle, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

interface SlotData {
  device_id: string;
  max_slots: number;
  assigned_slots: number;
  available_slots: number;
  usage_percentage: number;
}

export default function DeviceSlotsInfo({ deviceId }: { deviceId: string }) {
  const [slots, setSlots] = useState<SlotData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!deviceId) return;
    setLoading(true);
    getDeviceSlots(deviceId)
      .then(setSlots)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [deviceId]);

  if (loading) return (
    <div className="w-full h-8 bg-zinc-900/50 animate-pulse rounded-full border border-white/5" />
  );

  if (!slots) return null;

  const isFull = slots.available_slots === 0;
  const isWarning = slots.usage_percentage >= 80;

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
        <span className="flex items-center gap-1.5 text-zinc-500">
          <Zap className={clsx("w-3 h-3", isFull ? "text-red-500" : isWarning ? "text-tad-yellow" : "text-green-500")} />
          Capacidad de Inventario
        </span>
        <span className={clsx(
          "font-mono",
          isFull ? "text-red-500" : isWarning ? "text-tad-yellow" : "text-zinc-400"
        )}>
          {slots.assigned_slots} / {slots.max_slots}
        </span>
      </div>

      <div className="relative h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5 shadow-inner">
        {/* Progress Bar with Gradient */}
        <div 
          className={clsx(
            "absolute top-0 left-0 h-full transition-all duration-1000 ease-out rounded-full",
            isFull ? "bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_10px_rgba(239,68,68,0.4)]" :
            isWarning ? "bg-gradient-to-r from-yellow-600 to-tad-yellow shadow-[0_0_10px_rgba(250,212,0,0.3)]" :
            "bg-gradient-to-r from-green-600 to-green-400 shadow-[0_0_10px_rgba(34,197,94,0.3)]"
          )}
          style={{ width: `${slots.usage_percentage}%` }}
        />
      </div>

      {isFull ? (
        <div className="flex items-center gap-1 text-[9px] text-red-500 font-bold animate-pulse">
          <AlertCircle className="w-2.5 h-2.5" />
          MÁXIMO ALCANZADO (CAPACIDAD CRÍTICA)
        </div>
      ) : isWarning ? (
        <div className="flex items-center gap-1 text-[9px] text-tad-yellow font-bold uppercase italic">
          <AlertCircle className="w-2.5 h-2.5" />
          Pocos espacios disponibles
        </div>
      ) : (
        <div className="flex items-center gap-1 text-[9px] text-green-500/70 font-bold uppercase italic">
          <CheckCircle2 className="w-2.5 h-2.5" />
          Inventario Saludable
        </div>
      )}
    </div>
  );
}
