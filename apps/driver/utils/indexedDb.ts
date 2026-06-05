/**
 * IndexedDB utility for the TAD Driver PWA.
 * Provides a safe, structured-clone-based storage for telemetry data
 * without JSON serialization/deserialization overhead.
 */

let dbInstance: IDBDatabase | null;

export async function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('TADTelemetryDB', 1);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result as IDBDatabase;
      db.createObjectStore('telemetry', { keyPath: 'ts' });
      resolve(db);
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result as IDBDatabase;
      if (!db.objectStoreNames.contains('telemetry')) {
        const version = db.version + 1;
        db.close();
        const upgradeRequest = indexedDB.open('TADTelemetryDB', version);
        upgradeRequest.onupgradeneeded = (upgradeEvent) => {
          const upgradeDb = (upgradeEvent.target as IDBOpenDBRequest).result as IDBDatabase;
          upgradeDb.createObjectStore('telemetry', { keyPath: 'ts' });
          resolve(upgradeDb);
        };
        upgradeRequest.onsuccess = (upgradeEvent) => resolve((upgradeEvent.target as IDBOpenDBRequest).result as IDBDatabase);
        upgradeRequest.onerror = (error) => reject(error);
      } else {
        resolve(db);
      }
    };

    request.onerror = (error) => reject(error);
  });
}

export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}