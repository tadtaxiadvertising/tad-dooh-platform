import React from 'react';
import { Headphones, AlertTriangle, UserPlus, Send } from 'lucide-react';

const actions = [
  { id: 'support', label: 'Soporte', icon: Headphones, color: '#FFD400' },
  { id: 'report', label: 'Reportar Falla', icon: AlertTriangle, color: '#EF4444' },
  { id: 'sync', label: 'Sincronizar', icon: Send, color: '#22C55E' },
  { id: 'refer', label: 'Referidos', icon: UserPlus, color: '#3B82F6' },
];

export const QuickActions: React.FC = () => {
  return (
    <div className="grid grid-cols-2 gap-2">
      {actions.map((action) => (
        <button
          key={action.id}
          className="flex flex-col items-center justify-center min-h-[100px] bg-neutral-900 border-b-4 border-neutral-800 active:bg-neutral-800 active:border-b-0 active:translate-y-1 transition-all p-4"
        >
          <action.icon size={28} style={{ color: action.color }} className="mb-2" />
          <span className="text-white text-xs font-black uppercase tracking-tighter">
            {action.label}
          </span>
        </button>
      ))}
    </div>
  );
};
