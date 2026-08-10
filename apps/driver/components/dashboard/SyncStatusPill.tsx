import React, { useEffect, useState } from 'react';

interface SyncStatusPillProps {
 lastSyncedAt: number | null;
}

export function SyncStatusPill({ lastSyncedAt }: SyncStatusPillProps) {
 const [, tick] = useState(0);

 // Force re-render every 30s so "Hace X min" stays fresh
 useEffect(() => {
   const interval = setInterval(() => tick((t) => t + 1), 30_000);
   return () => clearInterval(interval);
 }, []);

 if (lastSyncedAt === null) {
   return (
     <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700/50 bg-zinc-800/50 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.15em] text-zinc-400">
       <span className="h-1 w-1 rounded-full bg-zinc-500" />
       Sin datos
     </span>
   );
 }

 const diffMs = Date.now() - lastSyncedAt;
 const diffSec = Math.floor(diffMs / 1_000);
 const diffMin = Math.floor(diffSec / 60);

 if (diffSec < 30) {
   return (
     <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.15em] text-emerald-400">
       <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
       Actualizado
     </span>
   );
 }

 if (diffMin < 60) {
   return (
     <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-600/50 bg-zinc-800/50 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.15em] text-zinc-400">
       <span className="h-1 w-1 rounded-full bg-zinc-500" />
       Hace {diffMin} min
     </span>
   );
 }

 const diffHr = Math.floor(diffMin / 60);
 return (
   <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.15em] text-amber-400">
     <span className="h-1 w-1 rounded-full bg-amber-400" />
     Hace {diffHr}h
   </span>
 );
}