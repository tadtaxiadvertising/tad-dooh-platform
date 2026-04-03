import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface ActionOptions {
  onSuccess?: () => void;
  onError?: (err: any) => void;
  optimisticAction?: () => void;
  critical?: boolean;
  actionName: string;
}

/**
 * Registra un evento de telemetría de forma silenciosa.
 * Si falla (ej. RLS 403, sin permisos), simplemente lo ignora —
 * la telemetría NUNCA debe bloquear la acción principal del usuario.
 */
async function logTelemetry(
  actionName: string,
  status: 'SUCCESS' | 'FAILURE',
  errorMsg?: string
) {
  try {
    // Lazy import: supabase is only resolved when telemetry is actually needed.
    // This prevents a missing/invalid NEXT_PUBLIC_SUPABASE_URL from crashing
    // the module at eval-time, which would make AntigravityButton become undefined.
    const { supabase } = await import('@/lib/supabase');
    const { error } = await supabase.from('analytics_events').insert([{
      event_type: 'CRITICAL_ACTION',
      device_id: 'ADMIN_CONSOLE',
      event_data: { action: actionName, status, ...(errorMsg ? { error: errorMsg } : {}) },
      occurred_at: new Date().toISOString(),
      received_at: new Date().toISOString(),
    }]);

    // 403 = RLS block (tabla sin política de INSERT para anon)
    // Silenciamos silenciosamente estos errores para no llenar la consola de advertencias
    if (error && error.code !== '42501' && !error.message?.includes('permission denied')) {
      console.warn('[Telemetry] Unexpected error:', error);
    }
  } catch {
    // Absorb completely — telemetry must never throw
  }
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

      // Telemetría no-bloqueante (silenciosa si RLS bloquea)
      if (options.critical) {
        logTelemetry(options.actionName, 'SUCCESS');
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

      // Telemetría de fallo (también silenciosa)
      if (options.critical) {
        logTelemetry(options.actionName, 'FAILURE', err.message);
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
