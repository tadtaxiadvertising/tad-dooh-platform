// apps/driver/public/service-worker.js
const CACHE_NAME = 'tad-driver-v10';
const OFFLINE_URL = '/check-in';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Pre-cache main files
      return cache.addAll([
        '/',
        '/check-in',
        '/favicon.ico',
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Pass through auth and api calls
  if (event.request.url.includes('/api/')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
      });
    })
  );
});

// Background Sync capability
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-tad-telemetry') {
    event.waitUntil(syncTelemetry());
  }
});

async function syncTelemetry() {
  console.log('[Service Worker] Ejecutando sincronización de telemetría en background...');
  // As service workers can't access localStorage directly, 
  // they can trigger a postMessage to clients to flush data.
  const clients = await self.clients.matchAll({ type: 'window' });
  for (const client of clients) {
    client.postMessage({ type: 'FLUSH_TELEMETRY' });
  }
}
