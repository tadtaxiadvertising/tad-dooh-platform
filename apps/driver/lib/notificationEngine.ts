/**
 * NotificationEngine — Motor de Notificaciones No-Bloqueante para la Driver App PWA
 *
 * Arquitectura:
 *   - Prioridades: CRITICAL (sonido + vibración + push), OPERATIONAL (toast visible), INFO (badge silencioso)
 *   - Cola FIFO con auto-dismiss por prioridad
 *   - Persistencia en IndexedDB (resiliencia offline)
 *   - Integración con NotificationContext y sonner para UI no-bloqueante
 *   - PWA Push Notification para CRITICAL cuando la app no está visible
 *
 * Reglas de negocio:
 *   - CRITICAL: no auto-dismiss, requiere ack manual, vibra + sonido
 *   - OPERATIONAL: auto-dismiss 5s, toast con color de prioridad
 *   - INFO: auto-dismiss 3s, badge-only (no toast unless center abierto)
 */

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type NotificationPriority = 'CRITICAL' | 'OPERATIONAL' | 'INFO';

export type NotificationType =
  | 'PAYMENT_LIQUIDATED'
  | 'CAMPAIGN_ASSIGNED'
  | 'SUBS_WARNING'
  | 'SUBS_CRITICAL'
  | 'DRIVER_STATUS'
  | 'GPS_TRACKING_STARTED'
  | 'GPS_TRACKING_STOPPED'
  | 'OFFLINE_MODE'
  | 'SYNC_COMPLETED'
  | 'SYNC_FAILED';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  description?: string;
  payload: Record<string, unknown>;
  receivedAt: number;
  dismissedAt?: number;
  acknowledged?: boolean;
}

export interface NotificationEngineState {
  unreadCount: number;
  items: NotificationItem[];
}

type NotificationListener = (state: NotificationEngineState) => void;

// ─── Constantes ───────────────────────────────────────────────────────────────

const DB_NAME = 'TADDriverNotifications';
const STORE_NAME = 'notifications';
const MAX_HISTORY = 100;
const AUTO_DISMISS_MS: Record<NotificationPriority, number> = {
  CRITICAL: 0,      // No auto-dismiss — requiere ack manual
  OPERATIONAL: 5000,
  INFO: 3000,
};

const TYPE_PRIORITY: Record<NotificationType, NotificationPriority> = {
  PAYMENT_LIQUIDATED: 'OPERATIONAL',
  CAMPAIGN_ASSIGNED: 'INFO',
  SUBS_WARNING: 'OPERATIONAL',
  SUBS_CRITICAL: 'CRITICAL',
  DRIVER_STATUS: 'OPERATIONAL',
  GPS_TRACKING_STARTED: 'INFO',
  GPS_TRACKING_STOPPED: 'INFO',
  OFFLINE_MODE: 'OPERATIONAL',
  SYNC_COMPLETED: 'INFO',
  SYNC_FAILED: 'OPERATIONAL',
};

const TYPE_TITLE: Record<NotificationType, string> = {
  PAYMENT_LIQUIDATED: 'Pago liquidado',
  CAMPAIGN_ASSIGNED: 'Nueva campaña asignada',
  SUBS_WARNING: 'Suscripción próxima a vencer',
  SUBS_CRITICAL: 'Suscripción vencida',
  DRIVER_STATUS: 'Estado del conductor',
  GPS_TRACKING_STARTED: 'Tracking GPS activado',
  GPS_TRACKING_STOPPED: 'Tracking GPS detenido',
  OFFLINE_MODE: 'Sin conexión',
  SYNC_COMPLETED: 'Sincronización completada',
  SYNC_FAILED: 'Error de sincronización',
};

// ─── IndexedDB Persistence ────────────────────────────────────────────────────

let dbInstance: IDBDatabase | null = null;

async function openNotificationDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result as IDBDatabase;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result as IDBDatabase;
      if (dbInstance) {
        dbInstance.onclose = () => { dbInstance = null; };
        dbInstance.onversionchange = () => {
          if (dbInstance) { dbInstance.close(); }
          dbInstance = null;
        };
      }
      resolve(dbInstance!);
    };

    request.onerror = (event) => reject((event.target as IDBOpenDBRequest).error);
  });
}

async function persistItem(item: NotificationItem): Promise<void> {
  try {
    const db = await openNotificationDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(item);
  } catch {
    // IndexedDB quota exceeded — graceful degradation
  }
}

async function updateItemInDB(item: NotificationItem): Promise<void> {
  try {
    const db = await openNotificationDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(item);
  } catch {
    // Graceful degradation
  }
}

async function loadHistoryFromDB(): Promise<NotificationItem[]> {
  try {
    const db = await openNotificationDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    return new Promise<NotificationItem[]>((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const all = (request.result || []) as NotificationItem[];
        // Ordenar por receivedAt desc, limitar a MAX_HISTORY
        all.sort((a, b) => b.receivedAt - a.receivedAt);
        resolve(all.slice(0, MAX_HISTORY));
      };
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

async function pruneHistory(): Promise<void> {
  try {
    const db = await openNotificationDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const allRequest = store.getAll();

    return new Promise<void>((resolve) => {
      allRequest.onsuccess = () => {
        const all = (allRequest.result || []) as NotificationItem[];
        all.sort((a, b) => b.receivedAt - a.receivedAt);
        const toKeep = all.slice(0, MAX_HISTORY);
        const keepIds = new Set(toKeep.map((i) => i.id));

        const deleteTx = db.transaction(STORE_NAME, 'readwrite');
        const deleteStore = deleteTx.objectStore(STORE_NAME);
        all.forEach((item) => {
          if (!keepIds.has(item.id)) deleteStore.delete(item.id);
        });
        resolve();
      };
      allRequest.onerror = () => resolve();
    });
  } catch {
    // Graceful degradation
  }
}

// ─── Engine (Singleton) ───────────────────────────────────────────────────────

let listeners: Set<NotificationListener> = new Set();
let engineItems: NotificationItem[] = [];
let autoDismissTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
let initialized = false;

function emitState(): void {
  const unreadCount = engineItems.filter((i) => !i.dismissedAt && !i.acknowledged).length;
  const state: NotificationEngineState = { unreadCount, items: [...engineItems] };
  listeners.forEach((fn) => fn(state));
}

async function hydrateFromDB(): Promise<void> {
  if (initialized) return;
  engineItems = await loadHistoryFromDB();
  initialized = true;
  emitState();
}

/**
 * Registra un listener para recibir cambios de estado.
 */
export function onNotificationEngineStateChange(fn: NotificationListener): () => void {
  listeners.add(fn);
  // Emitir estado actual inmediatamente si ya está inicializado
  if (initialized) {
    const unreadCount = engineItems.filter((i) => !i.dismissedAt && !i.acknowledged).length;
    fn({ unreadCount, items: [...engineItems] });
  } else {
    void hydrateFromDB().then(() => fn({
      unreadCount: engineItems.filter((i) => !i.dismissedAt && !i.acknowledged).length,
      items: [...engineItems],
    }));
  }
  return () => { listeners.delete(fn); };
}

/**
 * Retorna el estado actual del engine.
 */
export function getNotificationEngineState(): NotificationEngineState {
  const unreadCount = engineItems.filter((i) => !i.dismissedAt && !i.acknowledged).length;
  return { unreadCount, items: [...engineItems] };
}

/**
 * Resuelve la prioridad para un tipo de notificación.
 */
export function resolvePriority(type: NotificationType): NotificationPriority {
  return TYPE_PRIORITY[type] ?? 'INFO';
}

/**
 * Resuelve el título para un tipo de notificación.
 */
export function resolveTitle(type: NotificationType): string {
  return TYPE_TITLE[type] ?? type;
}

/**
 * Retorna la configuración de auto-dismiss para una prioridad.
 */
export function getAutoDismissMs(priority: NotificationPriority): number {
  return AUTO_DISMISS_MS[priority];
}

/**
 * Emite una notificación al engine. Non-blocking: no interrumpe la UI principal.
 *
 * Flujo:
 *   1. Crea NotificationItem con prioridad y ID único
 *   2. Persiste en IndexedDB (resiliencia offline)
 *   3. Emite estado a listeners (React actualiza UI)
 *   4. Auto-dismiss timer (0 = manual ack para CRITICAL)
 *   5. CRITICAL: vibra + sonido si el dispositivo lo soporta
 *   6. CRITICAL: Push Notification si la app no está visible
 */
export async function emitNotification(
  type: NotificationType,
  payload: Record<string, unknown> = {},
  overrides?: { priority?: NotificationPriority; title?: string; description?: string }
): Promise<NotificationItem> {
  await hydrateFromDB();

  const priority = overrides?.priority ?? resolvePriority(type);
  const title = overrides?.title ?? resolveTitle(type);
  const description = overrides?.description;

  const item: NotificationItem = {
    id: crypto.randomUUID(),
    type,
    priority,
    title,
    description,
    payload,
    receivedAt: Date.now(),
  };

  engineItems.unshift(item);
  if (engineItems.length > MAX_HISTORY) {
    engineItems = engineItems.slice(0, MAX_HISTORY);
  }

  await persistItem(item);
  await pruneHistory();
  emitState();

  // ─── Auto-dismiss timer ─────────────────────────────────────────────────
  const dismissMs = AUTO_DISMISS_MS[priority];
  if (dismissMs > 0) {
    const timer = setTimeout(() => {
      dismissNotification(item.id);
    }, dismissMs);
    autoDismissTimers.set(item.id, timer);
  }

  // ─── CRITICAL: sonido + vibración ────────────────────────────────────────
  if (priority === 'CRITICAL') {
    try {
      if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
    } catch {/* no-op — vibración no soportada */ }
  }

  // ─── CRITICAL: Push Notification si app no visible ───────────────────────
  if (priority === 'CRITICAL' && document.visibilityState !== 'visible') {
    tryPushNotification(item);
  }

  return item;
}

/**
 * Descarta (dismiss) una notificación. Marca dismissedAt en IndexedDB.
 */
export async function dismissNotification(id: string): Promise<void> {
  const item = engineItems.find((i) => i.id === id);
  if (!item) return;

  item.dismissedAt = Date.now();
  autoDismissTimers.delete(id);
  const timer = autoDismissTimers.get(id);
  if (timer) clearTimeout(timer);

  await updateItemInDB(item);
  emitState();
}

/**
 * Confirma (ack) una notificación CRITICAL. Requerido para dismiss manual.
 */
export async function acknowledgeNotification(id: string): Promise<void> {
  const item = engineItems.find((i) => i.id === id);
  if (!item) return;

  item.acknowledged = true;
  item.dismissedAt = Date.now();
  autoDismissTimers.delete(id);
  const timer = autoDismissTimers.get(id);
  if (timer) clearTimeout(timer);

  await updateItemInDB(item);
  emitState();
}

/**
 * Descarta todas las notificaciones.
 */
export async function dismissAllNotifications(): Promise<void> {
  const now = Date.now();
  engineItems.forEach((item) => {
    item.dismissedAt = now;
    item.acknowledged = true;
  });
  autoDismissTimers.forEach((timer) => clearTimeout(timer));
  autoDismissTimers.clear();

  // Actualizar IndexedDB
  try {
    const db = await openNotificationDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    engineItems.forEach((item) => store.put(item));
  } catch {/* graceful */ }

  emitState();
}

// ─── PWA Push Notification ────────────────────────────────────────────────────

async function tryPushNotification(item: NotificationItem): Promise<void> {
  try {
    if (!('Notification' in window)) return;
    const permission = Notification.permission;
    if (permission === 'granted') {
      new Notification(item.title, {
        body: item.description ?? '',
        tag: item.id,
        icon: '/icons/icon.svg',
        requireInteraction: item.priority === 'CRITICAL',
        silent: item.priority !== 'CRITICAL',
      });
    } else if (permission === 'default') {
      // No solicitar permiso automáticamente — el user debe pedirlo
      // desde la UI (NotificationCenter) para no interrumpir
    }
  } catch {
    // Push no disponible — graceful degradation
  }
}

/**
 * Solicita permiso de Push Notifications. Llamar desde UI explícita.
 */
export async function requestPushPermission(): Promise<boolean> {
  try {
    if (!('Notification' in window)) return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  } catch {
    return false;
  }
}

/**
 * Inicializa el engine (hidrata desde IndexedDB).
 */
export async function initNotificationEngine(): Promise<void> {
  await hydrateFromDB();
}
