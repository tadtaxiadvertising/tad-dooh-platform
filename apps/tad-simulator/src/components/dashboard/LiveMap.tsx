'use client';

import { useEffect, useState } from 'react';

// Generates chaotic random movement inside a grid for the mock
const generateMockDrivers = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 90 + 5, // Keep away from strict edges
    y: Math.random() * 90 + 5,
    pulseOffset: Math.random() * 2 
  }));
};

export default function LiveMap({ isRunning, driverCount }: { isRunning: boolean, driverCount: number }) {
  const [drivers, setDrivers] = useState<{id: number, x: number, y: number, pulseOffset: number}[]>([]);

  useEffect(() => {
    // Basic setup for visuals
    if (!isRunning) {
       setDrivers(generateMockDrivers(driverCount > 100 ? 100 : driverCount));
       return;
    }

    setDrivers(generateMockDrivers(driverCount > 100 ? 100 : driverCount));

    const interval = setInterval(() => {
      setDrivers(prev => prev.map(d => ({
        ...d,
        x: Math.max(2, Math.min(98, d.x + (Math.random() - 0.5) * 1.2)),
        y: Math.max(2, Math.min(98, d.y + (Math.random() - 0.5) * 1.2))
      })));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, driverCount]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#0a0a0a]">
       {/* Radar Sweep Effect */}
       {isRunning && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
             <div className="absolute top-1/2 left-1/2 w-[200%] h-[200%] -translate-x-1/2 -translate-y-1/2 origin-center animate-spin-slow opacity-20">
                <div className="w-full h-full bg-gradient-to-tr from-tad-accent/40 via-transparent to-transparent"></div>
             </div>
          </div>
       )}

      {/* Grid Overlay */}
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#ffffff11_1px,transparent_1px)] [background-size:20px_20px]"></div>

      {drivers.map((driver, i) => (
         <div 
           key={driver.id} 
           className="absolute w-1.5 h-1.5 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ease-linear"
           style={{
             left: `${driver.x}%`,
             top: `${driver.y}%`,
             backgroundColor: isRunning ? '#FFD400' : '#333',
             boxShadow: isRunning ? `0 0 12px 2px rgba(255, 212, 0, 0.6)` : 'none',
             opacity: isRunning ? 1 : 0.4
           }}
         >
           {isRunning && i < 20 && ( // Only animate ping for a few top drivers to save CPU
             <span 
               className="absolute inset-0 rounded-full animate-ping opacity-75"
               style={{ 
                 backgroundColor: '#FFD400',
                 animationDelay: `${driver.pulseOffset}s`
               }}
             />
           )}
         </div>
      ))}

      {/* Dynamic Scan Line */}
      {isRunning && (
         <div className="absolute w-full h-[2px] bg-tad-accent/10 top-0 left-0 animate-scan pointer-events-none"></div>
      )}

      <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-md border border-white/10 text-[10px] text-tad-accent font-mono tracking-widest uppercase">
         Active Nodes: {isRunning ? driverCount : 0} / Vis: {drivers.length}
      </div>
    </div>
  );
}
