import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export const useAntigravity = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Escuchar cambios en TODA la base de datos (o tablas críticas)
    const channel = supabase
      .channel('antigravity_global_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload) => {
          console.log('🚀 Antigravity Sync:', payload);
          
          // Invalida las queries de React Query automáticamente según la tabla que cambió
          if (payload.table === 'units' || payload.table === 'devices') {
            queryClient.invalidateQueries({ queryKey: ['fleet'] });
          }
          if (payload.table === 'campaigns') {
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
          }
          if (payload.table === 'drivers') {
            queryClient.invalidateQueries({ queryKey: ['drivers'] });
          }
          if (payload.table === 'analytics_events') {
            queryClient.invalidateQueries({ queryKey: ['analytics'] });
          }
          
          // Sincronización entre pestañas para asegurar consistencia total
          const broadcast = new BroadcastChannel('tad_sync');
          broadcast.postMessage({ 
            type: 'REFRESH_UI', 
            table: payload.table,
            event: payload.eventType 
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
