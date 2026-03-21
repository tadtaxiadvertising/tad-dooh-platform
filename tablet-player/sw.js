// sw.js - TAD Player Service Worker v3.3 (Mixed Content Firewall)
// CAMBIAR el nombre del caché fuerza al navegador a descartar todo lo viejo
const CACHE_NAME = 'tad-terminal-cache-v3.3';
const SUPABASE_STORAGE_DOMAIN = 'ltdcdhqixvbpdcitthqf.supabase.co';

// APP SHELL: Archivos críticos para que la app cargue 100% offline
const APP_SHELL = [
    '/',
    '/index.html',
    '/tad-driver.html',
    'https://unpkg.com/@tailwindcss/browser@4',
    'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
    'https://cdn.jsdelivr.net/npm/lucide-react@0.469.0/dist/umd/lucide-react.min.js'
    // Los scripts locales se cachearán automáticamente en el primer fetch
];

// Evento de instalación: Pre-cachear el App Shell
self.addEventListener('install', (event) => {
    self.skipWaiting();
    console.log('[TAD SW 3.1] Instalando App Shell...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(APP_SHELL);
        })
    );
});

// Evento de activación: Limpieza de cachés antiguas
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[TAD SW 3.1] Limpiando caché obsoleta:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Gestionar todas las peticiones (Fetch)
self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // 🛡️ SECURITY PATCH: Prevent Mixed Content Errors
    // If we are on a secure origin (production), intercept and block/upgrade insecure backend calls
    if (self.location.protocol === 'https:' && requestUrl.protocol === 'http:') {
        // Specifically block/redirect local dev IP calls to production
        if (requestUrl.hostname.startsWith('10.') || requestUrl.hostname === 'localhost') {
            console.warn('[SW] Blocking insecure local-IP fetch on HTTPS origin:', requestUrl.href);
            
            // Rewrite the URL to use the production API counterpart if it's an API call
            if (requestUrl.pathname.startsWith('/api')) {
                const PROD_API = 'https://proyecto-ia-tad-api.rewvid.easypanel.host';
                const secureUrl = PROD_API + requestUrl.pathname + requestUrl.search;
                console.log('[SW] Upgrading to secure API:', secureUrl);
                event.respondWith(fetch(secureUrl, {
                    method: event.request.method,
                    headers: event.request.headers,
                    body: event.request.method !== 'GET' ? event.request.body : undefined,
                    mode: 'cors'
                }));
                return;
            }
        }
        
        // Generic upgrade attempt for other backend calls
        if (requestUrl.hostname.includes('easypanel.host')) {
             const secureUrl = event.request.url.replace('http:', 'https:');
             event.respondWith(fetch(secureUrl));
             return;
        }
    }

    // ESTRATEGIA 1: Cache-First para Media (Videos/Imágenes de Supabase)
    const isMediaFile = requestUrl.pathname.match(/\.(mp4|webm|png|jpg|jpeg|svg|webp)$/);
    const isSupabaseStorage = requestUrl.hostname.includes(SUPABASE_STORAGE_DOMAIN);

    if (isMediaFile || isSupabaseStorage) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) return cachedResponse;
                
                return fetch(event.request).then((networkResponse) => {
                    if (networkResponse.ok) {
                        const cacheCopy = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, cacheCopy));
                    }
                    return networkResponse;
                }).catch(() => new Response('Offline - Media not cached', { status: 503 }));
            })
        );
        return;
    }

    // ESTRATEGIA 2: Network-First para App Shell (HTML, JS principal)
    // Siempre intentamos bajar lo más nuevo, pero mostramos el cache si no hay red.
    event.respondWith(
        fetch(event.request).then((networkResponse) => {
            if (networkResponse.ok && event.request.method === 'GET') {
                const cacheCopy = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, cacheCopy));
            }
            return networkResponse;
        }).catch(() => {
            return caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) return cachedResponse;
                // Si ni red ni cache tienen el archivo (ej: API call específica)
                if (event.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
                return new Response('Red no disponible', { status: 504 });
            });
        })
    );
});
