// apps/driver/public/service-worker.js
// VERSIÓN: v11 — Actualizar este string para forzar la re-instalación del SW
const CACHE_NAME = 'tad-driver-v11';
const OFFLINE_URL = '/driver/dashboard';

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
        // Guardar respuesta exitosa en cache
        if (networkResponse.ok && request.method === 'GET') {
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
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
