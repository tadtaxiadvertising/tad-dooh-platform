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
  '/favicon.svg',
  '/icons/icon.svg',
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

  if (request.method !== 'GET') {
    return;
  }

  // ── Pasar llamadas API y autenticación directamente a la red ──
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/backend-api/')) {
    return;
  }

  const isDashboardAsset =
    request.mode === 'navigate' ||
    url.pathname.startsWith('/driver/dashboard') ||
    url.pathname.startsWith('/_next/static/') ||
    ['script', 'style', 'image', 'font'].includes(request.destination);

  // ── Estrategia SWR para assets del dashboard ──
  if (isDashboardAsset) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);

      const networkPromise = fetch(request)
        .then(async (networkResponse) => {
          if (networkResponse.ok) {
            const size = parseInt(networkResponse.headers.get('content-length') || '0', 10);
            const canCacheBySize = !size || size <= MAX_CACHEABLE_SIZE;
            if (canCacheBySize) {
              await cache.put(request, networkResponse.clone());
              await trimCache(CACHE_NAME, MAX_CACHE_ITEMS);
            }
          }
          return networkResponse;
        })
        .catch(() => null);

      if (cached) {
        event.waitUntil(networkPromise);
        return cached;
      }

      const network = await networkPromise;
      if (network) return network;

      if (request.mode === 'navigate') {
        const offlineFallback = await cache.match(OFFLINE_URL);
        if (offlineFallback) return offlineFallback;
      }

      return new Response('Offline', { status: 503, statusText: 'Offline' });
    })());
    return;
  }

  // ── Fallback por defecto: network-first ──
  event.respondWith(
    fetch(request).catch(async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === 'navigate') {
        return caches.match(OFFLINE_URL);
      }
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    })
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
