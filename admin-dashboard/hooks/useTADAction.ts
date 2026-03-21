import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '../services/supabaseClient';

interface ActionOptions {
  onSuccess?: () => void;
  onError?: (err: any) => void;
  optimisticAction?: () => void;
  critical?: boolean;
  actionName: string;
}

export const useTADAction = () => {
  const [isPending, setIsPending] = useState(false);

  const executeAction = useCallback(async (
    asyncFn: () => Promise<any>,
    options: ActionOptions
  ) => {
    if (isPending) return;

    setIsPending(true);

    // Optimistic UI update
    if (options.optimisticAction) {
      options.optimisticAction();
    }

    try {
      const result = await asyncFn();

      // Telemetry log for critical actions
      if (options.critical) {
        await supabase.from('analytics_events').insert([{
          type: 'CRITICAL_ACTION',
          event_data: { action: options.actionName, status: 'SUCCESS' },
          created_at: new Date().toISOString()
        }]);
      }

      toast.success(`${options.actionName} completado`);
      if (options.onSuccess) options.onSuccess();
      return result;
    } catch (err: any) {
      // Silent handling for manual cancellations
      if (err.message === 'Cancelado por el usuario' || err.message === 'Cancelado') {
        setIsPending(false);
        return;
      }

      console.error(`Error en la acción ${options.actionName}:`, err);
      
      // Telemetry log for failure
      if (options.critical) {
        await supabase.from('analytics_events').insert([{
          type: 'CRITICAL_ACTION',
          event_data: { action: options.actionName, status: 'FAILURE', error: err.message },
          created_at: new Date().toISOString()
        }]);
      }

      toast.error(`Error en ${options.actionName}: ${err.message || 'Error desconocido'}`);
      if (options.onError) options.onError(err);
      throw err;
    } finally {
      setIsPending(false);
    }
  }, [isPending]);

  return { executeAction, isPending };
};
