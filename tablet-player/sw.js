// sw.js - TAD Player Service Worker
const CACHE_NAME = 'tad-media-cache-v1';

// Evento de instalación: Ocurre la primera vez que la tablet carga la página
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Activa el SW inmediatamente
    console.log('[TAD CTO] Service Worker Instalado');
});

// Evento de activación: Limpiamos cachés viejas si actualizamos la versión
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[TAD CTO] Limpiando caché antigua:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Estrategia Cache-First para los videos (Ahorra datos 4G y funciona offline)
self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // Solo interceptamos archivos de media (mp4, webm, jpg, png)
    if (requestUrl.pathname.match(/\.(mp4|webm|png|jpg|jpeg)$/)) {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(event.request).then((cachedResponse) => {
                    // Si el video está en caché (offline), lo devolvemos al instante
                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    // Si no está, lo descargamos (online) y lo guardamos en caché para la próxima
                    return fetch(event.request).then((networkResponse) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    }).catch(() => {
                        console.error('[TAD CTO] Fallo de red y video no cacheado:', event.request.url);
                        // Aquí podrías retornar un video "fallback" de error si lo tuvieras
                    });
                });
            })
        );
    }
});
