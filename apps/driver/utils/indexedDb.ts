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
      if (!db.objectStoreNames.contains('telemetry')) {
        db.createObjectStore('telemetry', { keyPath: 'ts' });
      }
      dbInstance = db;
      
      db.onclose = () => {
        dbInstance = null;
      };
      
      db.onversionchange = () => {
        db.close();
        dbInstance = null;
      };
      
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
          if (!upgradeDb.objectStoreNames.contains('telemetry')) {
            upgradeDb.createObjectStore('telemetry', { keyPath: 'ts' });
          }
          dbInstance = upgradeDb;
          upgradeDb.onclose = () => { dbInstance = null; };
          upgradeDb.onversionchange = () => { upgradeDb.close(); dbInstance = null; };
          resolve(upgradeDb);
        };
        upgradeRequest.onsuccess = (upgradeEvent) => {
          const upgradeDb = (upgradeEvent.target as IDBOpenDBRequest).result as IDBDatabase;
          dbInstance = upgradeDb;
          upgradeDb.onclose = () => { dbInstance = null; };
          upgradeDb.onversionchange = () => { upgradeDb.close(); dbInstance = null; };
          resolve(upgradeDb);
        };
        upgradeRequest.onerror = (error) => reject(error);
      } else {
        dbInstance = db;
        db.onclose = () => { dbInstance = null; };
        db.onversionchange = () => { db.close(); dbInstance = null; };
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