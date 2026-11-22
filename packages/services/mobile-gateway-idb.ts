/**
 * Expand-only durable GPS queue for the QR check-in gateway.
 * Deliberately NOT wired into capture: legacy localStorage data must be
 * reconciled under the existing per-device Web Lock before any cutover.
 * ACK deletes only named durable queue IDs after the API's full receipt.
 */
import type { GatewayGpsPoint } from "./mobile-gateway-contract";

export interface DurableGatewayGpsPoint extends GatewayGpsPoint {
  queueId: number;
  deviceId: string;
}

const DB_NAME = "TADGatewayGpsQueue";
const DB_VERSION = 1;
const STORE = "pending_gps";
const DEVICE_INDEX = "by_device";
export const IDB_GPS_BATCH_LIMIT = 500;
let connection: Promise<IDBDatabase> | null = null;

function requireDeviceId(deviceId: string): void {
  if (!deviceId?.trim() || deviceId.length > 128) {
    throw new Error("GPS_DEVICE_ID_REQUIRED");
  }
}

function requireGps(point: GatewayGpsPoint): void {
  if (
    !point ||
    !Number.isFinite(point.latitude) ||
    Math.abs(point.latitude) > 90 ||
    !Number.isFinite(point.longitude) ||
    Math.abs(point.longitude) > 180 ||
    !Number.isFinite(point.speed) ||
    typeof point.timestamp !== "string" ||
    !Number.isFinite(Date.parse(point.timestamp))
  ) {
    throw new Error("GPS_POINT_INVALID");
  }
}

function getDatabase(): Promise<IDBDatabase> {
  if (connection) return connection;
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("GPS_INDEXEDDB_UNAVAILABLE"));
  }

  connection = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    let rejected = false;
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, {
          keyPath: "queueId",
          autoIncrement: true,
        });
        store.createIndex(DEVICE_INDEX, "deviceId", { unique: false });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      if (rejected) {
        db.close();
        return;
      }
      db.onversionchange = () => {
        db.close();
        connection = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      connection = null;
      reject(request.error ?? new Error("GPS_INDEXEDDB_OPEN_FAILED"));
    };
    request.onblocked = () => {
      rejected = true;
      connection = null;
      reject(new Error("GPS_INDEXEDDB_BLOCKED"));
    };
  });
  return connection;
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error("GPS_TRANSACTION_ABORTED"));
    tx.onerror = () => {
      // IndexedDB abort event rejects after the entire transaction rolls back.
    };
  });
}

/** Returns keys only after the full IndexedDB transaction commits. */
export async function enqueueDurableGps(
  deviceId: string,
  points: readonly GatewayGpsPoint[],
): Promise<number[]> {
  requireDeviceId(deviceId);
  if (
    !Array.isArray(points) ||
    points.length < 1 ||
    points.length > IDB_GPS_BATCH_LIMIT
  ) {
    throw new Error("GPS_BATCH_SIZE_INVALID");
  }
  points.forEach(requireGps);
  const db = await getDatabase();
  const tx = db.transaction(STORE, "readwrite");
  const done = transactionDone(tx);
  const store = tx.objectStore(STORE);
  const keys: number[] = new Array(points.length);
  points.forEach((point, i) => {
    const request = store.add({ ...point, deviceId });
    request.onsuccess = () => {
      keys[i] = request.result as number;
    };
  });
  await done;
  return keys;
}

/** FIFO per device. Index order uses the auto-increment primary key. */
export async function readDurableGps(
  deviceId: string,
  limit = IDB_GPS_BATCH_LIMIT,
): Promise<DurableGatewayGpsPoint[]> {
  requireDeviceId(deviceId);
  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > IDB_GPS_BATCH_LIMIT
  ) {
    throw new Error("GPS_BATCH_SIZE_INVALID");
  }
  const db = await getDatabase();
  const tx = db.transaction(STORE, "readonly");
  const done = transactionDone(tx);
  const request = tx
    .objectStore(STORE)
    .index(DEVICE_INDEX)
    .getAll(IDBKeyRange.only(deviceId), limit);
  let points: DurableGatewayGpsPoint[] = [];
  request.onsuccess = () => {
    points = request.result as DurableGatewayGpsPoint[];
  };
  await done;
  return points;
}

/**
 * Idempotent ACK. A queue ID owned by another device aborts the WHOLE
 * transaction, preventing accidental cross-device deletion of GPS.
 */
export async function acknowledgeDurableGps(
  deviceId: string,
  queueIds: readonly number[],
): Promise<number> {
  requireDeviceId(deviceId);
  if (
    !Array.isArray(queueIds) ||
    queueIds.length < 1 ||
    queueIds.length > IDB_GPS_BATCH_LIMIT ||
    queueIds.some((id) => !Number.isSafeInteger(id) || id < 1) ||
    new Set(queueIds).size !== queueIds.length
  ) {
    throw new Error("GPS_ACK_KEYS_INVALID");
  }
  const db = await getDatabase();
  const tx = db.transaction(STORE, "readwrite");
  const done = transactionDone(tx);
  const store = tx.objectStore(STORE);
  let acknowledged = 0;
  for (const id of queueIds) {
    const request = store.get(id);
    request.onsuccess = () => {
      const record = request.result as DurableGatewayGpsPoint | undefined;
      if (!record) return; // Already ACKed: idempotent replay.
      if (record.deviceId !== deviceId) {
        tx.abort();
        return;
      }
      store.delete(id);
      acknowledged++;
    };
  }
  await done;
  return acknowledged;
}

export async function countDurableGps(deviceId: string): Promise<number> {
  requireDeviceId(deviceId);
  const db = await getDatabase();
  const tx = db.transaction(STORE, "readonly");
  const done = transactionDone(tx);
  const request = tx
    .objectStore(STORE)
    .index(DEVICE_INDEX)
    .count(IDBKeyRange.only(deviceId));
  let count = 0;
  request.onsuccess = () => {
    count = request.result;
  };
  await done;
  return count;
}

/** Close after tests or app shutdown; never clears persisted GPS. */
export async function closeDurableGps(): Promise<void> {
  const active = connection;
  connection = null;
  if (active) (await active).close();
}
