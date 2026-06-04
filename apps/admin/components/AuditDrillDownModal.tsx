import React from 'react';
import { X, ShieldCheck, Activity, Terminal, Clock } from 'lucide-react';

interface AuditDrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId: string;
  driverName: string;
}

export default function AuditDrillDownModal({
  isOpen,
  onClose,
  deviceId,
  driverName,
}: AuditDrillDownModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-6 backdrop-blur-xl">
      <div className="w-full max-w-3xl overflow-hidden rounded-[32px] border border-white/10 bg-zinc-950 shadow-2xl">
        <div className="flex items-start justify-between border-b border-white/10 p-8">
          <div>
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-tad-yellow">
              Auditoría de nodo
            </p>
            <h2 className="text-3xl font-black uppercase italic tracking-tight text-white">
              {driverName || 'Socio desconocido'}
            </h2>
            <p className="mt-2 font-mono text-xs font-bold uppercase tracking-widest text-zinc-500">
              Device ID: {deviceId || 'N/A'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/5 p-3 text-zinc-400 transition-colors hover:bg-white hover:text-black"
            aria-label="Cerrar auditoría"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 p-8 md:grid-cols-3">
          {[
            { icon: ShieldCheck, label: 'Integridad', value: 'Pendiente' },
            { icon: Activity, label: 'Telemetría', value: 'En revisión' },
            { icon: Clock, label: 'Ventana', value: 'MTD' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <Icon className="mb-4 h-6 w-6 text-tad-yellow" />
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500">{label}</p>
              <p className="mt-2 text-sm font-black uppercase text-white">{value}</p>
            </div>
          ))}
        </div>

        <div className="mx-8 mb-8 rounded-3xl border border-dashed border-white/10 bg-black/40 p-6">
          <div className="mb-3 flex items-center gap-2 text-zinc-400">
            <Terminal className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.25em]">Bitácora de auditoría</span>
          </div>
          <p className="text-xs font-bold uppercase leading-relaxed tracking-wider text-zinc-500">
            Este panel reserva el punto de entrada para el desglose certificado de impactos,
            discrepancias y eventos de reproducción del dispositivo seleccionado.
          </p>
        </div>
      </div>
    </div>
  );
}
