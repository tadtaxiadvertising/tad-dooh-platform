/**
 * notificationEngine.ts — Native Notification Engine
 *
 * Replaces PWA NotificationEngine with React Native equivalent:
 *   - Same priority system: CRITICAL (vibrate + push), OPERATIONAL (toast), INFO (badge)
 *   - expo-sqlite persistence instead of IndexedDB
 *   - expo-notifications for push instead of Web Notification API
 *   - Vibration via React Native Vibration module
 */

import { Vibration } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  initDatabase,
  persistNotification,
  loadNotificationHistory,
  pruneNotificationHistory,
  type NotificationRecord,
} from './database';

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_HISTORY = 100;

const AUTO_DISMISS_MS: Record<NotificationPriority, number> = {
  CRITICAL: 0,
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

function hydrateFromDB(): void {
  if (initialized) return;
  initDatabase();
  const records = loadNotificationHistory(MAX_HISTORY);
  engineItems = records.map(recordToItem);
  initialized = true;
  emitState();
}

function recordToItem(record: NotificationRecord): NotificationItem {
  return {
    id: record.id,
    type: record.type as NotificationType,
    priority: record.priority as NotificationPriority,
    title: record.title,
    description: record.description,
    payload: JSON.parse(record.payload || '{}'),
    receivedAt: record.received_at,
    dismissedAt: record.dismissed_at || undefined,
    acknowledged: Boolean(record.acknowledged),
  };
}

function itemToRecord(item: NotificationItem): NotificationRecord {
  return {
    id: item.id,
    type: item.type,
    priority: item.priority,
    title: item.title,
    description: item.description || '',
    payload: JSON.stringify(item.payload),
    received_at: item.receivedAt,
    dismissed_at: item.dismissedAt || 0,
    acknowledged: item.acknowledged ? 1 : 0,
  };
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function onNotificationEngineStateChange(fn: NotificationListener): () => void {
  listeners.add(fn);
  if (initialized) {
    fn({
      unreadCount: engineItems.filter((i) => !i.dismissedAt && !i.acknowledged).length,
      items: [...engineItems],
    });
  } else {
    hydrateFromDB();
  }
  return () => { listeners.delete(fn); };
}

export function getNotificationEngineState(): NotificationEngineState {
  return {
    unreadCount: engineItems.filter((i) => !i.dismissedAt && !i.acknowledged).length,
    items: [...engineItems],
  };
}

export async function emitNotification(
  type: NotificationType,
  payload: Record<string, unknown> = {},
  overrides?: { priority?: NotificationPriority; title?: string; description?: string }
): Promise<NotificationItem> {
  hydrateFromDB();

  const priority = overrides?.priority ?? TYPE_PRIORITY[type] ?? 'INFO';
  const title = overrides?.title ?? TYPE_TITLE[type] ?? type;
  const description = overrides?.description;

  const item: NotificationItem = {
    id: generateId(),
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

  initDatabase();
  persistNotification(itemToRecord(item));
  pruneNotificationHistory(MAX_HISTORY);
  emitState();

  // Auto-dismiss timer
  const dismissMs = AUTO_DISMISS_MS[priority];
  if (dismissMs > 0) {
    const timer = setTimeout(() => dismissNotification(item.id), dismissMs);
    autoDismissTimers.set(item.id, timer);
  }

  // CRITICAL: vibration (200ms, pause 100ms, 200ms — same as PWA)
  if (priority === 'CRITICAL') {
    Vibration.vibrate([200, 100, 200]);
  }

  // CRITICAL: push notification via expo-notifications
  if (priority === 'CRITICAL') {
    tryPushNotification(item);
  }

  return item;
}

export async function dismissNotification(id: string): Promise<void> {
  const item = engineItems.find((i) => i.id === id);
  if (!item) return;
  item.dismissedAt = Date.now();

  const timer = autoDismissTimers.get(id);
  if (timer) clearTimeout(timer);
  autoDismissTimers.delete(id);

  initDatabase();
  persistNotification(itemToRecord(item));
  emitState();
}

export async function acknowledgeNotification(id: string): Promise<void> {
  const item = engineItems.find((i) => i.id === id);
  if (!item) return;
  item.acknowledged = true;
  item.dismissedAt = Date.now();

  const timer = autoDismissTimers.get(id);
  if (timer) clearTimeout(timer);
  autoDismissTimers.delete(id);

  initDatabase();
  persistNotification(itemToRecord(item));
  emitState();
}

export async function dismissAllNotifications(): Promise<void> {
  const now = Date.now();
  engineItems.forEach((item) => {
    item.dismissedAt = now;
    item.acknowledged = true;
  });
  autoDismissTimers.forEach((timer) => clearTimeout(timer));
  autoDismissTimers.clear();

  initDatabase();
  engineItems.forEach((item) => persistNotification(itemToRecord(item)));
  emitState();
}

// ─── Push Notification ────────────────────────────────────────────────────────

async function tryPushNotification(item: NotificationItem): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: item.title,
        body: item.description || '',
        data: item.payload,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Immediate
    });
  } catch {
    // expo-notifications not available — graceful degradation
  }
}

export async function requestPushPermission(): Promise<boolean> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function initNotificationEngine(): Promise<void> {
  hydrateFromDB();
}
