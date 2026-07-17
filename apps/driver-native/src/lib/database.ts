/**
 * database.ts — expo-sqlite Offline-First Persistence Layer
 *
 * Replaces 3 separate IndexedDB databases with a single SQLite database:
 *   - TADTelemetryDB.telemetry → tad_telemetry (coords buffer)
 *   - TadDriverDB.offline_queue → tad_offline_queue (action queue)
 *   - TADDriverNotifications.notifications → tad_notifications (notification history)
 *
 * expo-sqlite v15 uses the synchronous SQLite API with WAL mode for
 * concurrent reads during background GPS tasks.
 */

import * as SQLite from 'expo-sqlite';

const DB_NAME = 'tad_driver_native.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync(DB_NAME);
  }
  return dbInstance;
}

export function initDatabase(): void {
  const db = getDatabase();

  db.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA cache_size = -2000;

    CREATE TABLE IF NOT EXISTS tad_telemetry (
      ts INTEGER PRIMARY KEY,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      accuracy REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('batch', 'offline')),
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS tad_offline_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL DEFAULT 'POST',
      payload TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS tad_notifications (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'INFO' CHECK (priority IN ('CRITICAL', 'OPERATIONAL', 'INFO')),
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      payload TEXT DEFAULT '{}',
      received_at INTEGER NOT NULL,
      dismissed_at INTEGER DEFAULT 0,
      acknowledged INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tad_hub_cache (
      key TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tad_auth (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_telemetry_status ON tad_telemetry(status);
    CREATE INDEX IF NOT EXISTS idx_offline_queue_timestamp ON tad_offline_queue(timestamp);
    CREATE INDEX IF NOT EXISTS idx_notifications_received ON tad_notifications(received_at);
  `);
}

// ─── Telemetry Operations ────────────────────────────────────────────────────

export type TelemetryStatus = 'batch' | 'offline';

export interface TelemetryCoord {
  lat: number;
  lng: number;
  ts: number;
  accuracy?: number;
  status: TelemetryStatus;
}

export function readCoordsByStatus(status: TelemetryStatus): TelemetryCoord[] {
  const db = getDatabase();
  return db.getAllSync<TelemetryCoord>(
    'SELECT ts, lat, lng, accuracy, status FROM tad_telemetry WHERE status = ? ORDER BY ts ASC',
    [status]
  );
}

export function writeBatchCoords(coords: TelemetryCoord[]): void {
  const db = getDatabase();
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM tad_telemetry WHERE status = ?', ['batch']);
    for (const coord of coords) {
      db.runSync(
        'INSERT OR REPLACE INTO tad_telemetry (ts, lat, lng, accuracy, status) VALUES (?, ?, ?, ?, ?)',
        [coord.ts, coord.lat, coord.lng, coord.accuracy ?? 0, 'batch']
      );
    }
  });
}

export function appendOfflineCoords(coords: TelemetryCoord[]): void {
  const db = getDatabase();
  const MAX_OFFLINE = 500;

  db.withTransactionSync(() => {
    for (const coord of coords) {
      db.runSync(
        'INSERT OR REPLACE INTO tad_telemetry (ts, lat, lng, accuracy, status) VALUES (?, ?, ?, ?, ?)',
        [coord.ts, coord.lat, coord.lng, coord.accuracy ?? 0, 'offline']
      );
    }

    // Evict oldest offline records beyond MAX_OFFLINE
    const count = db.getFirstSync<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM tad_telemetry WHERE status = ?',
      ['offline']
    );
    if (count && count.cnt > MAX_OFFLINE) {
      db.runSync(
        `DELETE FROM tad_telemetry WHERE status = ? AND ts IN (
          SELECT ts FROM tad_telemetry WHERE status = ? ORDER BY ts ASC LIMIT ?
        )`,
        ['offline', 'offline', count.cnt - MAX_OFFLINE]
      );
    }
  });
}

export function writeOfflineCoords(coords: TelemetryCoord[]): void {
  const db = getDatabase();
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM tad_telemetry WHERE status = ?', ['offline']);
    const trimmed = coords.slice(-500);
    for (const coord of trimmed) {
      db.runSync(
        'INSERT OR REPLACE INTO tad_telemetry (ts, lat, lng, accuracy, status) VALUES (?, ?, ?, ?, ?)',
        [coord.ts, coord.lat, coord.lng, coord.accuracy ?? 0, 'offline']
      );
    }
  });
}

export function clearOfflineCoords(): void {
  const db = getDatabase();
  db.runSync('DELETE FROM tad_telemetry WHERE status = ?', ['offline']);
}

export function getTelemetryCounts(): { batch: number; offline: number } {
  const db = getDatabase();
  const batch = db.getFirstSync<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM tad_telemetry WHERE status = ?', ['batch']
  );
  const offline = db.getFirstSync<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM tad_telemetry WHERE status = ?', ['offline']
  );
  return { batch: batch?.cnt ?? 0, offline: offline?.cnt ?? 0 };
}

// ─── Offline Queue Operations ────────────────────────────────────────────────

export interface OfflineQueueItem {
  id: number;
  endpoint: string;
  method: string;
  payload: string;
  idempotency_key: string;
  timestamp: number;
}

export function enqueueOfflineAction(
  endpoint: string,
  payload: Record<string, unknown>,
  method: string = 'POST'
): void {
  const db = getDatabase();
  const idempotencyKey = generateIdempotencyKey();
  db.runSync(
    'INSERT INTO tad_offline_queue (endpoint, method, payload, idempotency_key, timestamp) VALUES (?, ?, ?, ?, ?)',
    [endpoint, method, JSON.stringify(payload), idempotencyKey, Date.now()]
  );
}

export function getAllOfflineQueueItems(): OfflineQueueItem[] {
  const db = getDatabase();
  return db.getAllSync<OfflineQueueItem>(
    'SELECT * FROM tad_offline_queue ORDER BY timestamp ASC'
  );
}

export function deleteOfflineQueueItem(id: number): void {
  const db = getDatabase();
  db.runSync('DELETE FROM tad_offline_queue WHERE id = ?', [id]);
}

// ─── Notification Operations ──────────────────────────────────────────────────

export interface NotificationRecord {
  id: string;
  type: string;
  priority: string;
  title: string;
  description: string;
  payload: string;
  received_at: number;
  dismissed_at: number;
  acknowledged: number;
}

export function persistNotification(item: NotificationRecord): void {
  const db = getDatabase();
  db.runSync(
    `INSERT OR REPLACE INTO tad_notifications
     (id, type, priority, title, description, payload, received_at, dismissed_at, acknowledged)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [item.id, item.type, item.priority, item.title, item.description, item.payload, item.received_at, item.dismissed_at, item.acknowledged]
  );
}

export function loadNotificationHistory(limit = 100): NotificationRecord[] {
  const db = getDatabase();
  return db.getAllSync<NotificationRecord>(
    'SELECT * FROM tad_notifications ORDER BY received_at DESC LIMIT ?',
    [limit]
  );
}

export function pruneNotificationHistory(maxKeep = 100): void {
  const db = getDatabase();
  db.runSync(
    `DELETE FROM tad_notifications WHERE received_at NOT IN (
      SELECT received_at FROM tad_notifications ORDER BY received_at DESC LIMIT ?
    )`,
    [maxKeep]
  );
}

// ─── Hub Cache ────────────────────────────────────────────────────────────────

export function saveHubCache(data: Record<string, unknown>): void {
  const db = getDatabase();
  db.runSync(
    'INSERT OR REPLACE INTO tad_hub_cache (key, data, updated_at) VALUES (?, ?, ?)',
    ['TAD_DRIVER_HUB_CACHE', JSON.stringify(data), Date.now()]
  );
}

export function readHubCache(): Record<string, unknown> | null {
  const db = getDatabase();
  const row = db.getFirstSync<{ data: string }>(
    'SELECT data FROM tad_hub_cache WHERE key = ?',
    ['TAD_DRIVER_HUB_CACHE']
  );
  if (!row) return null;
  try {
    return JSON.parse(row.data);
  } catch {
    db.runSync('DELETE FROM tad_hub_cache WHERE key = ?', ['TAD_DRIVER_HUB_CACHE']);
    return null;
  }
}

// ─── Auth Storage ─────────────────────────────────────────────────────────────

export function saveAuthValue(key: string, value: string): void {
  const db = getDatabase();
  db.runSync(
    'INSERT OR REPLACE INTO tad_auth (key, value) VALUES (?, ?)',
    [key, value]
  );
}

export function readAuthValue(key: string): string | null {
  const db = getDatabase();
  const row = db.getFirstSync<{ value: string }>(
    'SELECT value FROM tad_auth WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

export function deleteAuthValue(key: string): void {
  const db = getDatabase();
  db.runSync('DELETE FROM tad_auth WHERE key = ?', [key]);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateIdempotencyKey(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}
