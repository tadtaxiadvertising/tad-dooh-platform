import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// We use Supabase Realtime to track playback_events for live verification
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ltdcdhqixvbpdcitthqf.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy_key'
);

export function LiveStatusBadge() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    // Escucha eventos insertados recientemente (SSE/WebSockets de Supabase)
    const channel = supabase.channel('dashboard-status')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'playback_events' }, () => {
        setActive(true);
        setTimeout(() => setActive(false), 2000);
      })
      .on('broadcast', { event: 'WAKE_UP_CALL' }, () => {
        setActive(true);
        setTimeout(() => setActive(false), 2000);
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="flex flex-col items-end">
      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Portal Status</span>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full transition-all duration-300 ${active ? 'bg-emerald-500 animate-pulse shadow-[0_0_12px_#10b981]' : 'bg-emerald-500/40 shadow-[0_0_4px_#10b981]'}`} />
        <span className="text-sm font-bold text-white">Live Data Link</span>
      </div>
    </div>
  );
}
