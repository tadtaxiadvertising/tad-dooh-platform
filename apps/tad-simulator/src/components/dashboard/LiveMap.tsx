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
       setDrivers(generateMockDrivers(driverCount > 50 ? 50 : driverCount)); // Cap visually at 50 to not burn the browser locally
       return;
    }

    setDrivers(generateMockDrivers(driverCount > 50 ? 50 : driverCount));

    // Simple mock animation of driving
    const interval = setInterval(() => {
      setDrivers(prev => prev.map(d => ({
        ...d,
        x: Math.max(2, Math.min(98, d.x + (Math.random() - 0.5) * 2)),
        y: Math.max(2, Math.min(98, d.y + (Math.random() - 0.5) * 2))
      })));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, driverCount]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-grid-pattern">
      {/* City Mock Grid overlay */}
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 opacity-10 pointer-events-none">
        <defs>
          <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#smallGrid)" />
      </svg>

      {/* Render virtual fleet */}
      {drivers.map((driver) => (
         <div 
           key={driver.id} 
           className="absolute w-2 h-2 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ease-linear"
           style={{
             left: `${driver.x}%`,
             top: `${driver.y}%`,
             backgroundColor: isRunning ? '#FFD400' : '#4b5563',
             boxShadow: isRunning ? `0 0 10px 2px rgba(255, 212, 0, 0.4)` : 'none'
           }}
         >
           {isRunning && (
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

      {/* Info overlay */}
      <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 text-xs text-gray-400 font-mono">
         Live rendering: {drivers.length} vectors
      </div>
    </div>
  );
}
