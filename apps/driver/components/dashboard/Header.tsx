import React from "react";
import { Signal, SignalLow, Wifi, WifiOff, Database } from "lucide-react";

interface HeaderProps {
  connectionStatus: "online" | "offline" | "syncing";
  batchCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  connectionStatus,
  batchCount,
}) => {
  const isOffline = connectionStatus === "offline";

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-black border-b border-neutral-800 flex items-center justify-between px-4">
      {/* Indicador de Señal/GPS */}
      <div className="flex items-center gap-2">
        <Signal size={18} className="text-[#FFD400]" />
        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">
          GPS OK
        </span>
      </div>

      {/* Monitor de Telemetría (Centro) */}
      <div
        className={`flex items-center gap-2 px-3 py-1 rounded-sm border ${
          isOffline
            ? "bg-neutral-900 border-neutral-700 text-neutral-400"
            : "bg-black border-[#FFD400]/30 text-[#FFD400]"
        }`}
      >
        <Database size={14} />
        <span className="text-xs font-black">
          {isOffline
            ? `OFFLINE (${batchCount}/500)`
            : `SYNCING (${batchCount}/10)`}
        </span>
      </div>

      {/* Estado de Red */}
      <div className="flex items-center gap-2">
        {isOffline ? (
          <WifiOff size={18} className="text-neutral-600" />
        ) : (
          <Wifi size={18} className="text-green-500" />
        )}
      </div>
    </header>
  );
};
