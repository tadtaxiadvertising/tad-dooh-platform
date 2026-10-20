import React from "react";
import { MapPin } from "lucide-react";

export function BiHeatmap() {
  return (
    <div className="w-full h-full bg-zinc-900/50 rounded-2xl flex flex-col items-center justify-center text-zinc-600 gap-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(250,212,0,0.03),transparent)]" />
      <MapPin className="w-8 h-8 text-zinc-700" />
      <div className="text-center z-10">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
          BI Heatmap
        </p>
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-2">
          Leaflet heatmap integration pending implementation
        </p>
      </div>
    </div>
  );
}
