import React from 'react';

interface AdvertiserMapProps {
  points?: [number, number, number][];
}

export default function AdvertiserMap({ points }: AdvertiserMapProps) {
  return (
    <div className="h-full w-full bg-[#070707] flex flex-col items-center justify-center text-zinc-600 gap-4 relative overflow-hidden rounded-3xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(250,212,0,0.03),transparent)]" />
      <div className="text-center z-10">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
          Geographic Density Map
        </p>
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-2">
          Leaflet heatmap integration pending implementation
        </p>
        <p className="text-[8px] text-zinc-700 mt-1">
          {points?.length || 0} heatmap points loaded
        </p>
      </div>
    </div>
  );
}