/**
 * QR check-in mobile GPS gateway.
 *
 * Offline-first: a point is never removed until the Fleet API acknowledges
 * the exact batch. QR hardware IDs do not authorize GPS uploads (#233).
 */
import {
  buildGatewayGpsBatch,
  GATEWAY_GPS_BATCH_LIMIT,
  isCompleteGatewayGpsReceipt,
  unacknowledgedGatewayGpsPoints,
  type GatewayDeviceCredential,
  type GatewayGpsPoint,
} from "./mobile-gateway-contract";

export type GpsPoint = GatewayGpsPoint;

export type GatewayStatus =
  | "IDLE"
  | "INITIALIZING"
  | "TRACKING"
  | "BUFFERING"
  | "SYNCING"
  | "SYNCED"
  | "OFFLINE"
  | "GPS_ERROR"
  | "SUSPENDED"
  | "DEVICE_NOT_FOUND";

export interface GatewayState {
  status: GatewayStatus;
  batchSize: number;
  totalSynced: number;
  lastSyncAt: string | null;
  deviceId: string | null;
  error: string | null;
}

export type GatewayListener = (state: GatewayState) => void;

const LEGACY_STORAGE_KEY = "tad_gps_batch";
const STORAGE_PREFIX = "tad_gps_batch_device:";
const BATCH_THRESHOLD = 10;
const FALLBACK_INTERVAL_MS = 60_000;
const HTTP_TIMEOUT_MS = 15_000;
const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 10_000,
  timeout: 5_000,
};

let gpsBatch: GpsPoint[] = [];
let watchId: number | null = null;
let fallbackTimer: ReturnType<typeof setInterval> | null = null;
let nextUploadTimer: ReturnType<typeof setTimeout> | null = null;
let isSuspended = false;
let syncing = false;
let totalSynced = 0;
let lastSyncAt: string | null = null;
let currentDeviceId: string | null = null;
let currentCredential: GatewayDeviceCredential | null = null;
let currentStatus: GatewayStatus = "IDLE";
let currentError: string | null = null;
let listener: GatewayListener | null = null;
let apiBaseUrl = "";
let sessionVersion = 0;
let swMessageListener: ((event: MessageEvent) => void) | null = null;
let onlineListener: (() => void) | null = null;
let storageFailed = false;
let inFlightController: AbortController | null = null;

function storageKey(deviceId: string): string {
  return `${STORAGE_PREFIX}${encodeURIComponent(deviceId)}`;
}

function emitState(status: GatewayStatus, error: string | null = null): void {
  currentStatus = status;
  currentError = error;
  listener?.(getGatewayState());
}

export function onGatewayStateChange(fn: GatewayListener): void {
  listener = fn;
}

export function getGatewayState(): GatewayState {
  return {
    status: currentStatus,
    batchSize: gpsBatch.length,
    totalSynced,
    lastSyncAt,
    deviceId: currentDeviceId,
    error: currentError,
  };
}

/**
 * A verified pairing flow may supply a purpose-bound DEVICE_AUTH token in
 * memory. Neither a QR value nor OFFLINE_LICENSE is accepted as credentials.
 * Until #233 supplies credentials, capture and persist GPS without uploading.
 */
export function authorizeTadTracking(
  credential: GatewayDeviceCredential,
): boolean {
  if (
    !currentDeviceId ||
    credential.deviceId !== currentDeviceId ||
    !credential.driverId?.trim() ||
    !credential.deviceToken?.trim() ||
    isSuspended
  ) {
    return false;
  }

  currentCredential = { ...credential };
  if (navigator.onLine) {
    void checkAndUpload(true);
  }
  return true;
}

/** Store the entire next state before replacing the in-memory queue. */
function persistQueue(next: GpsPoint[]): boolean {
  if (!currentDeviceId) return false;
  try {
    localStorage.setItem(storageKey(currentDeviceId), JSON.stringify(next));
    gpsBatch = next;
    storageFailed = false;
    return true;
  } catch {
    storageFailed = true;
    return false;
  }
}

function loadQueue(deviceId: string): GpsPoint[] | null {
  try {
    const raw = localStorage.getItem(storageKey(deviceId));
    if (!raw) return [];
    const data: unknown = JSON.parse(raw);
    if (
      !Array.isArray(data) ||
      !data.every(
        (point) =>
          point &&
          typeof point === "object" &&
          typeof point.latitude === "number" &&
          typeof point.longitude === "number" &&
          typeof point.speed === "number" &&
          typeof point.timestamp === "string",
      )
    ) {
      return null;
    }
    return data as GpsPoint[];
  } catch {
    // Never overwrite or delete an unreadable queue.
    return null;
  }
}

/**
 * Starts GPS collection. Missing device credentials are expected until
 * pairing; they keep every point queued and do not trigger an insecure upload.
 */
export function startTadTracking(
  deviceId: string,
  baseUrl: string,
  credential?: GatewayDeviceCredential,
): void {
  if (!deviceId?.trim() || deviceId.length > 128 || !baseUrl?.trim()) {
    emitState("GPS_ERROR", "Identidad o dirección de API inválida.");
    return;
  }
  if (isSuspended) {
    emitState("SUSPENDED", "Suscripción pendiente; GPS retenido localmente.");
    return;
  }
  if (storageFailed && gpsBatch.length > 0) {
    if (currentDeviceId !== deviceId || !persistQueue(gpsBatch)) {
      emitState("GPS_ERROR", "Hay GPS sin guardar; no se puede reiniciar.");
      return;
    }
  }

  stopTadTracking();
  currentDeviceId = deviceId;
  apiBaseUrl = baseUrl;
  currentCredential = null;

  const saved = loadQueue(deviceId);
  if (saved === null) {
    emitState("GPS_ERROR", "Cola GPS local ilegible; no se sobrescribirán datos.");
    return;
  }
  gpsBatch = saved;

  // Old unscoped data has no trustworthy device ownership. Preserve it for
  // audited migration rather than silently reassigning it to a scanned QR.
  try {
    if (localStorage.getItem(LEGACY_STORAGE_KEY)) {
      console.warn("Legacy GPS queue retained for explicit device reconciliation.");
    }
  } catch {
    // The per-device queue is already loaded; retain it in memory.
  }

  if (!navigator.geolocation) {
    emitState("GPS_ERROR", "Geolocalización no disponible.");
    return;
  }

  emitState("INITIALIZING");

  onlineListener = () => {
    void checkAndUpload(true);
  };
  window.addEventListener("online", onlineListener);

  if ("serviceWorker" in navigator) {
    void navigator.serviceWorker.register("/service-worker.js").catch(() => {
      // Foreground capture does not require service-worker registration.
    });
    swMessageListener = (event: MessageEvent) => {
      if (event.data?.type === "FLUSH_TELEMETRY") {
        void checkAndUpload(true);
      }
    };
    navigator.serviceWorker.addEventListener("message", swMessageListener);
  }

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      if (isSuspended) return;
      const capturedAt = new Date(position.timestamp);
      if (!Number.isFinite(capturedAt.getTime())) {
        emitState("GPS_ERROR", "Marca temporal de GPS inválida.");
        return;
      }
      const point: GpsPoint = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        speed: position.coords.speed ?? 0,
        timestamp: capturedAt.toISOString(),
      };

      const next = [...gpsBatch, point];
      if (!persistQueue(next)) {
        // Stop recording new, non-durable coordinates; never truncate old GPS.
        gpsBatch = next;
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
        }
        emitState("GPS_ERROR", "Almacenamiento GPS lleno o no disponible.");
        return;
      }
      emitState("BUFFERING");
      if (gpsBatch.length >= BATCH_THRESHOLD) {
        void checkAndUpload();
      }
    },
    (error) => {
      emitState("GPS_ERROR", `Fallo de geolocalización: ${error.message}`);
    },
    GEO_OPTIONS,
  );

  fallbackTimer = setInterval(() => {
    if (gpsBatch.length > 0) {
      void checkAndUpload(true);
    }
  }, FALLBACK_INTERVAL_MS);

  emitState("TRACKING");
  if (credential) {
    authorizeTadTracking(credential);
  } else if (gpsBatch.length > 0) {
    void checkAndUpload(true);
  }
}

async function checkAndUpload(force = false): Promise<void> {
  if (
    syncing ||
    isSuspended ||
    !currentDeviceId ||
    gpsBatch.length === 0 ||
    (!force && gpsBatch.length < BATCH_THRESHOLD)
  ) {
    return;
  }
  if (!navigator.onLine) {
    emitState("OFFLINE", "Sin conexión; coordenadas GPS conservadas.");
    return;
  }
  if (!currentCredential) {
    emitState("OFFLINE", "Esperando emparejamiento seguro del dispositivo.");
    return;
  }

  const deviceId = currentDeviceId;
  const version = sessionVersion;
  const credential = currentCredential;
  const snapshot = gpsBatch.slice(0, GATEWAY_GPS_BATCH_LIMIT);
  let payload: ReturnType<typeof buildGatewayGpsBatch>;
  try {
    payload = buildGatewayGpsBatch(deviceId, credential, snapshot);
  } catch {
    emitState("GPS_ERROR", "Lote GPS inválido; se conserva para revisión.");
    return;
  }

  syncing = true;
  emitState("SYNCING");
  const controller = new AbortController();
  inFlightController = controller;
  const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  let acknowledged = false;
  try {
    const response = await fetch(`${apiBaseUrl}/fleet/track-batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Device-Id": deviceId,
        "X-Device-Token": credential.deviceToken,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    // A stop/restart or device switch must not ACK a different queue.
    if (version !== sessionVersion || currentDeviceId !== deviceId) return;

    if (response.status === 402) {
      handleSuspension();
      return;
    }
    if (response.status === 401 || response.status === 403) {
      currentCredential = null;
      emitState("OFFLINE", "Credencial no autorizada; GPS pendiente sin borrar.");
      return;
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const receipt: unknown = await response.json();
    if (version !== sessionVersion || currentDeviceId !== deviceId) return;
    if (!isCompleteGatewayGpsReceipt(receipt, snapshot.length)) {
      emitState("OFFLINE", "ACK GPS incompleto; lote retenido.");
      return;
    }

    const remaining = unacknowledgedGatewayGpsPoints(gpsBatch, snapshot);
    if (!persistQueue(remaining)) {
      emitState("GPS_ERROR", "No se pudo confirmar el borrado local; se reintentará.");
      return;
    }

    totalSynced += snapshot.length;
    lastSyncAt = new Date().toISOString();
    acknowledged = true;
    emitState("SYNCED");
  } catch {
    if (version === sessionVersion) {
      emitState("OFFLINE", "No se confirmó GPS en la API; reintento pendiente.");
    }
  } finally {
    clearTimeout(timeout);
    if (inFlightController === controller) {
      inFlightController = null;
    }
    syncing = false;
    if (
      acknowledged &&
      gpsBatch.length > 0 &&
      currentCredential &&
      version === sessionVersion
    ) {
      nextUploadTimer = setTimeout(() => {
        nextUploadTimer = null;
        void checkAndUpload(true);
      }, 200);
    }
  }
}

function handleSuspension(): void {
  isSuspended = true;
  currentCredential = null;
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  if (fallbackTimer !== null) {
    clearInterval(fallbackTimer);
    fallbackTimer = null;
  }
  // HTTP 402 suspends uploads; it never authorizes deletion of queued GPS.
  emitState("SUSPENDED", "Suscripción suspendida; GPS conservado.");
}

/** Stops capture but never deletes queued GPS or legacy offline data. */
export function stopTadTracking(): void {
  sessionVersion++;
  inFlightController?.abort();
  currentCredential = null;
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  if (fallbackTimer !== null) {
    clearInterval(fallbackTimer);
    fallbackTimer = null;
  }
  if (nextUploadTimer !== null) {
    clearTimeout(nextUploadTimer);
    nextUploadTimer = null;
  }
  if (onlineListener) {
    window.removeEventListener("online", onlineListener);
    onlineListener = null;
  }
  if (swMessageListener && "serviceWorker" in navigator) {
    navigator.serviceWorker.removeEventListener("message", swMessageListener);
    swMessageListener = null;
  }
}
