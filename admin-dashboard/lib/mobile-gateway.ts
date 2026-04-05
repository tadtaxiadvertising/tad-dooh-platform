/**
 * TAD MOBILE GATEWAY - TRACKING MODULE (TypeScript)
 * ================================================
 * Responsabilidad: Capturar GPS, hacer batching (10:1), persistir offline y enviar al backend.
 * Regla de Negocio: Detener todo y bloquear UI si el backend devuelve HTTP 402 (Falta de Pago).
 *
 * Métricas de Optimización:
 *   - Sin batching: 60 req/min × 100 taxis × 8h = 2,880,000 req/día
 *   - Con batching (10:1): 1 req/min × 100 taxis × 8h = 48,000 req/día
 *   - Ahorro: 98.3% de requests eliminados.
 *
 * Resiliencia:
 *   - Si el taxi pierde señal (túnel, zona rural), las coordenadas se acumulan en localStorage.
 *   - Cuando recupera 4G/WiFi, dispara todo el bloque retenido en un solo POST.
 *   - Si el POST falla a mitad de ejecución, el batch se restaura (rollback) al localStorage.
 */

import { supabase } from './supabase';

// ============================================
// TYPES
// ============================================
export interface GpsPoint {
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: string;
}

export type GatewayStatus =
  | 'IDLE'
  | 'INITIALIZING'
  | 'TRACKING'
  | 'BUFFERING'
  | 'SYNCING'
  | 'SYNCED'
  | 'OFFLINE'
  | 'GPS_ERROR'
  | 'SUSPENDED'
  | 'DEVICE_NOT_FOUND';

export interface GatewayState {
  status: GatewayStatus;
  batchSize: number;
  totalSynced: number;
  lastSyncAt: string | null;
  deviceId: string | null;
  error: string | null;
}

export type GatewayListener = (state: GatewayState) => void;

// ============================================
// CONSTANTS
// ============================================
const STORAGE_KEY = 'tad_gps_batch';
const BATCH_THRESHOLD = 10;           // Enviar cada 10 puntos
const FALLBACK_INTERVAL_MS = 300_000; // Forzar envío cada 300 seg (5 min)
const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 10_000,   // Reusar posición de hasta 10s
  timeout: 5_000,       // Abortar si GPS tarda +5s
};

// ============================================
// MODULE STATE (Singleton)
// ============================================
let gpsBatch: GpsPoint[] = [];
let watchId: number | null = null;
let fallbackTimer: ReturnType<typeof setInterval> | null = null;
let isSuspended = false;
let totalSynced = 0;
let lastSyncAt: string | null = null;
let currentDeviceId: string | null = null;
let currentDriverId: string | null = null;
let listener: GatewayListener | null = null;
let apiBaseUrl = '';

// ============================================
// PUBLIC API
// ============================================

/**
 * Registra un listener para recibir cambios de estado en tiempo real.
 * El componente React usa esto para actualizar la UI.
 */
export function onGatewayStateChange(fn: GatewayListener): void {
  listener = fn;
}

/**
 * Retorna el estado actual del gateway sin suscribirse a cambios.
 */
export function getGatewayState(): GatewayState {
  return {
    status: isSuspended ? 'SUSPENDED' : 'IDLE',
    batchSize: gpsBatch.length,
    totalSynced,
    lastSyncAt,
    deviceId: currentDeviceId,
    error: null,
  };
}

/**
 * Inicia el Mobile Gateway de tracking GPS.
 * @param deviceId - El ID del dispositivo (TAD-XXXX) escaneado del QR de la tablet.
 * @param baseUrl - URL base del API (ej: http://localhost:3000/api en dev).
 */
export function startTadTracking(deviceId: string, baseUrl: string): void {
  if (isSuspended) {
    emitState('SUSPENDED', 'Servicio suspendido por falta de pago.');
    return;
  }

  if (!navigator.geolocation) {
    emitState('GPS_ERROR', 'Geolocalización no soportada por el navegador.');
    return;
  }

  currentDeviceId = deviceId;
  apiBaseUrl = baseUrl;

  // Restaurar batch pendiente del localStorage (Offline-first)
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        gpsBatch = parsed;
        console.log(`📦 Restaurados ${gpsBatch.length} puntos GPS del almacenamiento local.`);
      }
    }
  } catch {
    // localStorage corrupto, empezar limpio
    localStorage.removeItem(STORAGE_KEY);
    gpsBatch = [];
  }

  emitState('INITIALIZING');
  console.log(`📡 Iniciando Mobile Gateway para el dispositivo: ${deviceId}`);

  // 1. watchPosition: Escucha cambios de posición (más eficiente que polling)
  watchId = navigator.geolocation.watchPosition(
    (position) => {
      if (isSuspended) return;

      const { latitude, longitude, speed } = position.coords;
      const point: GpsPoint = {
        latitude,
        longitude,
        speed: speed ?? 0,
        timestamp: new Date().toISOString(),
      };

      gpsBatch.push(point);
      persistBatch();

      // Feedback inmediato al componente
      if (gpsBatch.length < BATCH_THRESHOLD) {
        emitState('BUFFERING');
      }

      // Intentar subir si llegamos al threshold
      checkAndUpload(deviceId);
    },
    (error) => {
      console.error('Error obteniendo GPS:', error.message);
      emitState('GPS_ERROR', `Error GPS: ${error.message}`);
    },
    GEO_OPTIONS,
  );

  // 2. Fallback timer: Forzar subida cada 60 seg aunque no haya 10 puntos
  //    (ej: taxi en tapón, en estación, etc.)
  fallbackTimer = setInterval(() => {
    if (gpsBatch.length > 0 && !isSuspended) {
      checkAndUpload(deviceId, true);
    }
  }, FALLBACK_INTERVAL_MS);

  emitState('TRACKING');
}

/**
 * Detiene el tracking GPS y limpia los timers.
 * Llamar al desmontar el componente React.
 */
export function stopTadTracking(): void {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  if (fallbackTimer !== null) {
    clearInterval(fallbackTimer);
    fallbackTimer = null;
  }
  console.log('🛑 Mobile Gateway detenido.');
}

// ============================================
// INTERNAL
// ============================================

/**
 * Lógica central de sincronización con el backend.
 * Envía el batch acumulado cuando:
 *   a) Se alcanzan 10 puntos (threshold),  ó
 *   b) Han pasado 60 segundos (force=true).
 * 
 * Si no hay internet, retiene las coordenadas en localStorage.
 * Si el POST falla, restaura el batch al almacenamiento local (rollback).
 */
async function checkAndUpload(deviceId: string, force = false): Promise<void> {
  if (isSuspended) return;
  if (gpsBatch.length < BATCH_THRESHOLD && !force) return;

  // Verificar conectividad antes de intentar
  if (!navigator.onLine) {
    console.warn('📵 Sin conexión. Reteniendo coordenadas localmente...');
    emitState('OFFLINE');
    return;
  }

  // Si no tenemos currentDriverId, debemos hacer un único llamado de inicialización al servidor
  // Esto valida la suscripción (HTTP 402) y resuelve qué conductor está asignado a este device.
  if (!currentDriverId) {
    emitState('SYNCING');
    try {
      const response = await fetch(`${apiBaseUrl}/fleet/track-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, locations: [] }), // Payload vacío solo para Init
      });

      if (response.status === 402 || response.status === 403) {
        handleSuspension();
        return;
      }

      if (response.status === 404) {
        emitState('DEVICE_NOT_FOUND', 'Dispositivo no encontrado. Verifica el QR.');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        currentDriverId = data.driverId;
      } else {
        throw new Error('Error al inicializar sesión GPS con central');
      }
    } catch {
      console.warn('⚠️ No se pudo inicializar driver_id con la central en este ciclo.');
      emitState('OFFLINE', 'Esperando conexión con central...');
      return; // Esperamos al próximo ciclo
    }
  }

  // Clonar el batch y limpiar inmediatamente (evita duplicados)
  const payload = [...gpsBatch];
  gpsBatch = [];
  localStorage.removeItem(STORAGE_KEY);

  emitState('SYNCING');

  try {
    // 🚀 BYPASS VERCEL: Insertamos directo a la base de datos de Supabase
    // Esto cuesta 0 invocaciones de Vercel API.
    const { error } = await supabase
      .from('driver_locations')
      .insert(
        payload.map(point => ({
          driver_id: currentDriverId,
          device_id: deviceId,
          latitude: point.latitude,
          longitude: point.longitude,
          speed: point.speed,
          timestamp: point.timestamp,
        }))
      );

    if (error) {
      throw new Error(`Supabase Error: ${error.message}`);
    }

    // Éxito
    totalSynced += payload.length;
    lastSyncAt = new Date().toISOString();
    console.log(`✅ Batch de ${payload.length} coordenadas insertadas en Supabase (Bypass). Total: ${totalSynced}`);
    emitState('SYNCED');

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`☁️ Error insertando en Supabase: `, errorMessage);

    // Rollback: Restaurar datos al inicio del array para reintentar después
    gpsBatch = [...payload, ...gpsBatch];
    persistBatch();
    emitState('OFFLINE', 'Error al guardar. Reteniendo localmente.');
  }
}

/**
 * Bloqueo total (Kill Switch).
 * Se ejecuta cuando el backend devuelve HTTP 402.
 * Detiene el GPS, limpia el storage, y notifica al componente.
 */
function handleSuspension(): void {
  isSuspended = true;

  // Detener el GPS para no gastar batería
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  if (fallbackTimer !== null) {
    clearInterval(fallbackTimer);
    fallbackTimer = null;
  }

  // Limpiar datos locales
  localStorage.removeItem(STORAGE_KEY);
  gpsBatch = [];

  console.error('🛑 SERVICIO SUSPENDIDO — Suscripción de RD$6,000 vencida.');
  emitState('SUSPENDED', 'Suscripción anual vencida. Contacte a TAD.');
}

/**
 * Persiste el batch actual en localStorage.
 * Defensivo: Si localStorage está lleno, descarta gracefully.
 */
function persistBatch(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gpsBatch));
  } catch {
    // QuotaExceeded: Descartar los puntos más viejos para hacer espacio
    if (gpsBatch.length > BATCH_THRESHOLD * 5) {
      gpsBatch = gpsBatch.slice(-BATCH_THRESHOLD * 2);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(gpsBatch));
      } catch {
        // Si aún falla, continuar solo en memoria
        console.warn('⚠️ localStorage lleno. Operando solo en memoria.');
      }
    }
  }
}

/**
 * Emite el estado actual al listener registrado (componente React).
 */
function emitState(status: GatewayStatus, error: string | null = null): void {
  if (listener) {
    listener({
      status,
      batchSize: gpsBatch.length,
      totalSynced,
      lastSyncAt,
      deviceId: currentDeviceId,
      error,
    });
  }
}
