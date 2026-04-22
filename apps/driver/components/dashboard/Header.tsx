import React from 'react';
import { Wifi, WifiOff, RefreshCw, User } from 'lucide-react';
import { motion } from 'framer-motion';

interface HeaderProps {
  connectionStatus: 'online' | 'offline' | 'syncing';
}

export const Header: React.FC<HeaderProps> = ({ connectionStatus }) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-[#FFD400] rounded-lg flex items-center justify-center font-black text-black">
          TAD
        </div>
      </div>

      <div className="flex items-center gap-3">
        <motion.div 
          initial={false}
          animate={{
            backgroundColor: connectionStatus === 'online' ? 'rgba(34, 197, 94, 0.1)' : 
                             connectionStatus === 'offline' ? 'rgba(163, 163, 163, 0.1)' : 
                             'rgba(255, 212, 0, 0.1)',
            color: connectionStatus === 'online' ? '#22c55e' : 
                   connectionStatus === 'offline' ? '#a3a3a3' : 
                   '#FFD400'
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border border-white/5"
        >
          {connectionStatus === 'online' && <Wifi size={14} />}
          {connectionStatus === 'offline' && <WifiOff size={14} />}
          {connectionStatus === 'syncing' && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            >
              <RefreshCw size={14} />
            </motion.div>
          )}
          <span className="capitalize">{connectionStatus}</span>
        </motion.div>

        <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60">
          <User size={20} />
        </div>
      </div>
    </header>
  );
};
