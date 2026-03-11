// sw.js - TAD Player Service Worker v3.0
// CAMBIAR el nombre del caché fuerza al navegador a descartar todo lo viejo
const CACHE_NAME = 'tad-media-cache-v3';
const SUPABASE_STORAGE_DOMAIN = 'ltdcdhqixvbpdcitthqf.supabase.co';

// Evento de instalación: Ocurre la primera vez que la tablet carga la página
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Activa el SW inmediatamente (no espera al siguiente reload)
    console.log('[TAD SW v3] Service Worker Instalado');
});

// Evento de activación: Limpiamos cachés viejas automáticamente
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[TAD SW v3] Limpiando caché antigua:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim(); // Toma control inmediato de todas las pestañas abiertas
});

// Estrategia Cache-First para videos de Supabase Storage
// Network-First para todo lo demás (asegura que siempre se sirva el HTML más reciente)
self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // SOLO cachear videos/imágenes de Supabase Storage (CDN)
    const isMediaFile = requestUrl.pathname.match(/\.(mp4|webm|png|jpg|jpeg)$/);
    const isSupabaseStorage = requestUrl.hostname.includes(SUPABASE_STORAGE_DOMAIN);

    if (isMediaFile || isSupabaseStorage) {
        // ============================================
        // CACHE-FIRST para media: si ya está cacheado, lo sirve instantáneamente
        // Si no, lo descarga y lo guarda para offline
        // ============================================
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        console.log('[TAD SW v3] Cache HIT:', requestUrl.pathname.split('/').pop());
                        return cachedResponse;
                    }

                    // No está en caché → descargar de la red
                    return fetch(event.request).then((networkResponse) => {
                        // Solo cachear respuestas exitosas (200)
                        if (networkResponse.ok) {
                            cache.put(event.request, networkResponse.clone());
                            console.log('[TAD SW v3] Cached NEW media:', requestUrl.pathname.split('/').pop());
                        }
                        return networkResponse;
                    }).catch((err) => {
                        console.error('[TAD SW v3] Fallo de red y video no cacheado:', requestUrl.pathname);
                        // Retornar un 503 en lugar de undefined
                        return new Response('Contenido no disponible offline', { status: 503 });
                    });
                });
            })
        );
    }
    // Para TODO lo demás (HTML, JS, CSS, API calls): NO interceptar → Network-First natural
    // Esto garantiza que el index.html siempre sea el más reciente del servidor
});
