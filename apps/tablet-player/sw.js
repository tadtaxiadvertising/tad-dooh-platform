// sw.js - TAD Player Service Worker v5.5 (Fully Kiosk + Error Resilient)
const CACHE_NAME = 'tad-terminal-cache-v5.7';
const SUPABASE_STORAGE_DOMAIN = 'ltdcdhqixvbpdcitthqf.supabase.co';

// APP SHELL: Core files for 100% offline boot
const APP_SHELL = [
    '/',
    '/index.html',
    '/player.html',
    '/tad-driver.html',
    'https://unpkg.com/@tailwindcss/browser@4',
    'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
    'https://cdn.jsdelivr.net/npm/lucide-react@0.469.0/dist/umd/lucide-react.min.js'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    console.log('[TAD SW 5.3] Installing App Shell...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(APP_SHELL);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[TAD SW 5.3] Purging old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Helper for Range Requests (Critical for Video Playback)
async function handleRangeRequest(request, cache) {
    // 🛡️ FULLY KIOSK GUARD: Skip chrome-extension:// and any non-http(s) scheme
    // The Cache API throws if you try to store non-http(s) URLs
    const url = new URL(request.url);
    const isCacheableScheme = url.protocol === 'https:' || url.protocol === 'http:';

    const cachedResponse = await cache.match(request);
    if (!cachedResponse) {
        try {
            const networkResponse = await fetch(request);
            if (networkResponse.ok && isCacheableScheme) {
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        } catch (err) {
            // Fetch failed (SRI error, network issue, etc.) — return 503 so SW doesn't crash
            console.warn('[TAD SW] Fetch failed for:', url.pathname, err.message);
            return new Response('Fetch failed', { status: 503, statusText: 'Service Unavailable' });
        }
    }

    const rangeHeader = request.headers.get('Range');
    if (!rangeHeader) return cachedResponse;

    const arrayBuffer = await cachedResponse.arrayBuffer();
    const bytes = rangeHeader.match(/bytes=(\d+)-(\d+)?/);
    if (!bytes) return cachedResponse;

    const start = parseInt(bytes[1], 10);
    const end = bytes[2] ? parseInt(bytes[2], 10) : arrayBuffer.byteLength - 1;
    const chunk = arrayBuffer.slice(start, end + 1);

    return new Response(chunk, {
        status: 206,
        statusText: 'Partial Content',
        headers: {
            ...cachedResponse.headers,
            'Content-Range': `bytes ${start}-${end}/${arrayBuffer.byteLength}`,
            'Content-Length': chunk.byteLength,
        },
    });
}

self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // 🛡️ FULLY KIOSK GUARD: Ignore chrome-extension:// and any non-http(s) scheme
    // Fully Kiosk Browser injects extension URLs that crash the Cache API
    if (requestUrl.protocol !== 'https:' && requestUrl.protocol !== 'http:') {
        return; // Let the browser handle it natively - do NOT intercept
    }

    // 🛡️ SECURITY PATCH: Prevent Mixed Content Errors
    if (self.location.protocol === 'https:' && requestUrl.protocol === 'http:') {
        if (requestUrl.hostname.startsWith('10.') || requestUrl.hostname === 'localhost' || requestUrl.hostname.includes('easypanel.host')) {
            const PROD_API = 'https://proyecto-ia-tad-api.rewvid.easypanel.host';
            const secureUrl = event.request.url.replace(/^http:\/\/[^\/]+/, PROD_API).replace('http:', 'https:');
            event.respondWith(fetch(secureUrl, { method: event.request.method, headers: event.request.headers, mode: 'cors' }));
            return;
        }
    }

    // STRATEGY 1: Cache-First with Range Support for Media (MP4, MP3, Images)
    const isMediaFile = requestUrl.pathname.match(/\.(mp4|webm|png|jpg|jpeg|svg|webp)$/);
    const isSupabase = requestUrl.hostname.includes(SUPABASE_STORAGE_DOMAIN);

    if (isMediaFile || isSupabase) {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache => handleRangeRequest(event.request, cache))
        );
        return;
    }

    // STRATEGY 2: Stale-While-Revalidate for App Shell
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse.ok && event.request.method === 'GET') {
                    const cacheCopy = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, cacheCopy));
                }
                return networkResponse;
            }).catch(() => null);

            return cachedResponse || fetchPromise || new Response('Network Error', { status: 503 });
        })
    );
});
