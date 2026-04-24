// apps/driver/public/service-worker.js
// VERSIÓN: v12-shelter — Cache LRU + Tamaño limitado
const CACHE_NAME = 'tad-driver-v12';
const OFFLINE_URL = '/driver/dashboard';

// SHELTER C-D1: Límites de caché para prevenir memory leaks en FullyKiosk
const MAX_CACHE_ITEMS = 50;          // Máximo 50 entradas en caché
const MAX_CACHEABLE_SIZE = 512000;   // 500KB — no cachear archivos mayores

// Archivos pre-cacheados en la instalación
const PRE_CACHE_URLS = [
  '/',
  '/driver/dashboard',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRE_CACHE_URLS))
  );
  // Toma control inmediamente sin esperar que el SW anterior expire
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  // Controla todos los clientes abiertos inmediatamente
  self.clients.claim();
});

/**
 * SHELTER C-D1: Trim LRU — elimina las entradas más antiguas cuando se excede el límite.
 * CacheStorage no tiene orden de inserción, así que eliminamos las primeras keys (FIFO).
 */
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    const excess = keys.length - maxItems;
    for (let i = 0; i < excess; i++) {
      await cache.delete(keys[i]);
    }
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // ── Pasar llamadas API y autenticación directamente a la red ──
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/backend-api/')) {
    return; // Sin cache para el backend
  }

  // ── Estrategia: Network-first, fallback a cache ──
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // SHELTER C-D1: Solo cachear respuestas GET exitosas Y menores a 500KB
        if (
          networkResponse.ok &&
          request.method === 'GET' &&
          networkResponse.headers.has('content-length')
        ) {
          const size = parseInt(networkResponse.headers.get('content-length') || '0', 10);
          if (size <= MAX_CACHEABLE_SIZE) {
            const cloned = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, cloned);
              // Trim después de cada inserción
              trimCache(CACHE_NAME, MAX_CACHE_ITEMS);
            });
          }
        } else if (
          networkResponse.ok &&
          request.method === 'GET' &&
          !networkResponse.headers.has('content-length')
        ) {
          // Si no hay content-length, cachear solo si es HTML/CSS/JS (no media)
          const contentType = networkResponse.headers.get('content-type') || '';
          if (
            contentType.includes('text/html') ||
            contentType.includes('text/css') ||
            contentType.includes('application/javascript') ||
            contentType.includes('application/json')
          ) {
            const cloned = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, cloned);
              trimCache(CACHE_NAME, MAX_CACHE_ITEMS);
            });
          }
        }
        return networkResponse;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          // Fallback para navegación
          if (request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
        })
      )
  );
});

// ── Background Sync: flush de telemetría cuando se recupera la red ──
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-tad-telemetry') {
    event.waitUntil(notifyClientsToFlush());
  }
});

async function notifyClientsToFlush() {
  // Los Service Workers no acceden a localStorage directamente.
  // Le enviamos un mensaje a los tabs activos para que hagan el flush.
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage({ type: 'FLUSH_TELEMETRY' });
  }
}
