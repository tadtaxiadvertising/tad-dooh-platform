export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('TadDriverDB', 1);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offline_queue')) {
        db.createObjectStore('offline_queue', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (event: any) => resolve(event.target.result);
    request.onerror = (event: any) => reject(event.target.error);
  });
};

export const enqueueOfflineAction = async (endpoint: string, payload: any) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('offline_queue', 'readwrite');
    const store = transaction.objectStore('offline_queue');
    const request = store.add({
      endpoint,
      payload,
      timestamp: Date.now(),
      idempotencyKey: crypto.randomUUID()
    });

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
};

export const syncOfflineQueue = async () => {
  if (!navigator.onLine) return;
  
  const db = await initDB();
  const transaction = db.transaction('offline_queue', 'readwrite');
  const store = transaction.objectStore('offline_queue');
  const request = store.getAll();

  request.onsuccess = async () => {
    const items = request.result;
    if (!items || items.length === 0) return;

    console.log(`Syncing ${items.length} offline actions...`);
    
    for (const item of items) {
      try {
        const response = await fetch(item.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': item.idempotencyKey
          },
          body: JSON.stringify(item.payload)
        });

        if (response.ok || response.status >= 400) { // If processed or failed validation, remove it
          const delTransaction = db.transaction('offline_queue', 'readwrite');
          delTransaction.objectStore('offline_queue').delete(item.id);
        }
      } catch (error) {
        console.error('Failed to sync item:', item, error);
        // Stop syncing on network error
        break;
      }
    }
  };
};

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('Network connected, syncing offline queue...');
    syncOfflineQueue();
  });
}
