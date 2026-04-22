import React from 'react';
import { Headphones, AlertTriangle, UserPlus, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

const actions = [
  { id: 'support', label: 'Soporte Técnico', icon: Headphones, color: '#FFD400' },
  { id: 'report', label: 'Reportar Problema', icon: AlertTriangle, color: '#ef4444' },
  { id: 'refer', label: 'Invitar Conductor', icon: UserPlus, color: '#3b82f6' },
  { id: 'history', label: 'Historial', icon: FileText, color: '#a3a3a3' },
];

export const QuickActions: React.FC = () => {
  return (
    <div className="grid grid-cols-2 gap-4">
      {actions.map((action, index) => (
        <motion.button
          key={action.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
          whileTap={{ scale: 0.95 }}
          className="flex flex-col items-center justify-center p-4 bg-white/5 border border-white/10 rounded-2xl gap-3 hover:bg-white/10 transition-colors"
        >
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${action.color}20`, color: action.color }}
          >
            <action.icon size={24} />
          </div>
          <span className="text-white/80 text-xs font-semibold text-center leading-tight">
            {action.label}
          </span>
        </motion.button>
      ))}
    </div>
  );
};
