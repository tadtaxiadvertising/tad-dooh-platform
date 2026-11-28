import { classifyOfflineQueueStatus } from "./offlineQueuePolicy";

interface OfflineQueueItem {
  endpoint: string;
  id?: number;
  idempotencyKey: string;
  method: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

const DB_NAME = "TadDriverDB";
const STORE_NAME = "offline_queue";

const normalizeBankAccountType = (value: unknown): string => {
  if (value === "SAVINGS") return "AHORRO";
  if (value === "CHECKING") return "CORRIENTE";
  return typeof value === "string" ? value : "";
};

const normalizeEndpoint = (endpoint: string): string => {
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  if (endpoint.startsWith("/api/proxy")) return endpoint;
  return `/api/proxy${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
};

const normalizePayload = (
  endpoint: string,
  payload: Record<string, unknown>,
): Record<string, unknown> => {
  if (!endpoint.includes("/wallet/bank")) {
    return payload;
  }

  const rest = { ...payload };
  delete rest.driverId;
  return {
    ...rest,
    tipo: normalizeBankAccountType(rest.tipo),
  };
};

const getStoredAccessToken = (): string | null => {
  if (typeof window === "undefined") return null;

  const localToken = localStorage.getItem("tad_driver_token");
  if (localToken) return localToken;

  const cookieToken = document.cookie
    .split("; ")
    .find((row) => row.startsWith("sb-access-token="))
    ?.split("=")[1];

  return cookieToken || null;
};

const getAllQueueItems = (db: IDBDatabase): Promise<OfflineQueueItem[]> => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () =>
      resolve((request.result || []) as OfflineQueueItem[]);
    request.onerror = () => reject(request.error);
  });
};

const deleteQueueItem = (db: IDBDatabase, id: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const enqueueOfflineAction = async (
  endpoint: string,
  payload: Record<string, unknown>,
  method: string = "POST",
) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add({
      endpoint,
      method,
      payload,
      timestamp: Date.now(),
      idempotencyKey: crypto.randomUUID(),
    });

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
};

export const syncOfflineQueue = async () => {
  if (typeof navigator === "undefined" || !navigator.onLine) {
    return { processed: 0, remaining: 0, success: false };
  }

  const db = await initDB();
  const items = await getAllQueueItems(db);

  if (items.length === 0) {
    db.close();
    return { processed: 0, remaining: 0, success: true };
  }

  const authToken = getStoredAccessToken();
  let processed = 0;
  let remaining = items.length;

  try {
    for (const item of items) {
      const targetEndpoint = normalizeEndpoint(item.endpoint);
      const normalizedPayload = normalizePayload(
        targetEndpoint,
        item.payload || {},
      );

      try {
        const response = await fetch(targetEndpoint, {
          method: item.method || "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": item.idempotencyKey,
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify(normalizedPayload),
        });

        const disposition = classifyOfflineQueueStatus(response.status);
        if (disposition === "ack" && typeof item.id === "number") {
          await deleteQueueItem(db, item.id);
          processed += 1;
          remaining -= 1;
          continue;
        }

        if (disposition === "pause") {
          if (response.status === 409) {
            // Preserve strict FIFO order: a later bank update may depend on
            // the operation that is still awaiting reconciliation.
            console.warn(
              "[OfflineQueue] HTTP 409: action retained; FIFO sync paused.",
            );
          }
          break;
        }
      } catch {
        // Never log offline payloads: they can include financial or bank data.
        console.error(
          "[OfflineQueue] Transport failed; queued action retained.",
        );
        break;
      }
    }
  } finally {
    db.close();
  }

  return {
    processed,
    remaining,
    success: remaining === 0,
  };
};

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    console.log("Network connected, syncing offline queue...");
    void (async () => {
      const result = await syncOfflineQueue();
      // Reload solo si había acciones pendientes: refresca el hub con el
      // estado del backend sin abortar el sync en vuelo (el PUT ya terminó).
      if (result.processed > 0) {
        window.location.reload();
      }
    })();
  });
}
