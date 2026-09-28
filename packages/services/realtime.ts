import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export const FLEET_LIVE_CHANNEL = 'fleet_tracking_live';
export const FLEET_LIVE_EVENT = 'telemetry_ping';

export interface TelemetryPing {
  driverId: string;
  deviceId: string;
  lat: number;
  lng: number;
  speed: number;
  bearing: number;
  timestamp: string;
}

export const normalizeTelemetryPing = (payload: any): TelemetryPing | null => {
  if (!payload) return null;
  const driverId = typeof payload.driverId === 'string' ? payload.driverId : '';
  const deviceId = typeof payload.deviceId === 'string' ? payload.deviceId : '';
  const lat = Number(payload.lat);
  const lng = Number(payload.lng);
  const speed = Number(payload.speed ?? 0);
  const bearing = Number(payload.bearing ?? 0);
  const timestamp = typeof payload.timestamp === 'string' ? payload.timestamp : '';

  if (!driverId || !deviceId || !Number.isFinite(lat) || !Number.isFinite(lng) || !timestamp) {
    return null;
  }

  return { driverId, deviceId, lat, lng, speed, bearing, timestamp };
};

const BASE_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

/**
 * Suscripción canónica al canal de Broadcast `fleet_tracking_live`.
 *
 * 1) Espera la hidratación de la sesión y reinyecta el JWT actual vía
 *    `supabase.realtime.setAuth()`, para que el handshake de Realtime viaje
 *    firmado con la sesión del navegador (nunca sin token ni con uno vencido).
 * 2) Usa un canal público de broadcast (`private: false`) con `ack: true`.
 * 3) Ante `CHANNEL_ERROR`/`TIMED_OUT`/`CLOSED` reintenta con backoff
 *    exponencial (1s → 30s) y reconecta cuando la sesión se refresca.
 * 4) Retorna una función de limpieza que remueve canal y listeners.
 */
export async function subscribeFleetTrackingLive(
  onPing: (ping: TelemetryPing) => void,
): Promise<() => void> {
  // 1. Sesión hidratada + JWT inyectado en el transporte Realtime.
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      supabase.realtime.setAuth(token);
    }
  } catch {
    // Sin sesión recuperable → Realtime usa el token embebido (anon). No fatal:
    // el canal público se autoriza igual con el anon key.
  }

  const channelName = FLEET_LIVE_CHANNEL;

  let activeChannel: RealtimeChannel | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let attempts = 0;
  let disposed = false;

  const removeActiveChannel = () => {
    if (activeChannel) {
      const channel = activeChannel;
      activeChannel = null;
      void supabase.removeChannel(channel).catch(() => void 0);
    }
  };

  const scheduleRetry = () => {
    if (disposed || retryTimer) return;
    const delay = Math.min(
      BASE_BACKOFF_MS * 2 ** Math.min(attempts, 5),
      MAX_BACKOFF_MS,
    );
    retryTimer = setTimeout(() => {
      retryTimer = null;
      start();
    }, delay);
  };

  const start = () => {
    if (disposed) return;

    removeActiveChannel();

    try {
      const channel = supabase
        .channel(channelName, {
          config: {
            broadcast: { ack: true, self: false },
            private: false,
          },
        })
        .on('broadcast', { event: FLEET_LIVE_EVENT }, ({ payload }) => {
          const ping = normalizeTelemetryPing(payload);
          if (!ping) {
            console.warn(
              `[TAD_REALTIME][ADMIN] ${FLEET_LIVE_EVENT} descartado por payload inválido`,
              payload,
            );
            return;
          }
          onPing(ping);
        })
        .subscribe((status, error) => {
          if (disposed) return;

          if (status === 'SUBSCRIBED') {
            attempts = 0;
            return;
          }

          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            attempts += 1;
            // Aviso no bloqueante: el mapa sigue refrescando por polling 30s.
            console.warn(
              `[TAD_REALTIME][ADMIN] Suscripción Broadcast ${status} — reintento ${attempts}`,
              { status, error, channel: channelName },
            );
            scheduleRetry();
          }
        });

      activeChannel = channel;
    } catch (err) {
      attempts += 1;
      console.warn(
        `[TAD_REALTIME][ADMIN] No se pudo crear el canal de Broadcast`,
        { err, channel: channelName },
      );
      scheduleRetry();
    }
  };

  // 2. Resubscripción al refrescarse la sesión (nuevo JWT) o al re-login.
  const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
    if (disposed || event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') return;

    const token = session?.access_token;
    if (token) {
      try {
        supabase.realtime.setAuth(token);
      } catch {
        // noop
      }
    }

    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
      attempts = 0;
      start();
    }
  });
  const authSubscription = authListener?.subscription;

  // 3. Primer intento (tras haber inyectado el JWT de la sesión).
  start();

  // 4. Limpieza.
  return () => {
    disposed = true;
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    removeActiveChannel();
    authSubscription?.unsubscribe();
  };
}