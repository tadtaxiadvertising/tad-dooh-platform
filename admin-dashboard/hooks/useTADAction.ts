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
    if (isPending) {
      console.warn(`[TADAction] ⏳ Ignorando acción "${options.actionName}" porque hay otra en curso.`);
      return;
    }

    console.log(`[TADAction] 🚀 Ejecutando: ${options.actionName}`);
    setIsPending(true);

    // Optimistic UI update
    if (options.optimisticAction) {
      options.optimisticAction();
    }

    try {
      const result = await asyncFn();

      // Telemetry log for critical actions (NON-BLOCKING)
      if (options.critical) {
        supabase.from('analytics_events').insert([{
          event_type: 'CRITICAL_ACTION',
          device_id: 'ADMIN_CONSOLE',
          event_data: { action: options.actionName, status: 'SUCCESS' },
          occurred_at: new Date().toISOString(),
          received_at: new Date().toISOString()
        }]).then(({ error }) => {
          if (error) console.warn('Telemetry error (success log):', error);
        });
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
      
      // Telemetry log for failure (NON-BLOCKING)
      if (options.critical) {
        supabase.from('analytics_events').insert([{
          event_type: 'CRITICAL_ACTION',
          device_id: 'ADMIN_CONSOLE',
          event_data: { action: options.actionName, status: 'FAILURE', error: err.message },
          occurred_at: new Date().toISOString(),
          received_at: new Date().toISOString()
        }]).then(({ error }) => {
          if (error) console.warn('Telemetry error (failure log):', error);
        });
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
