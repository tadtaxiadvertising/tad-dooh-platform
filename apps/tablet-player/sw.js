// sw.js - TAD Player Service Worker v6.0 (Offline-First + Cache Cleanup + Network-First API)
const CACHE_NAME = 'tad-player-v6';
const MEDIA_CACHE_NAME = 'tad-player-media-v6';
const API_CACHE_NAME = 'tad-player-api-v6';
const SUPABASE_STORAGE_DOMAIN = 'ltdcdhqixvbpdcitthqf.supabase.co';

// ── SHELTER C-T1: Cache limits to prevent memory leaks in Fully Kiosk ──
const MAX_APP_SHELL_ITEMS = 30;
const MAX_MEDIA_ITEMS = 200;
const MAX_CACHEABLE_MEDIA_SIZE = 50 * 1024 * 1024; // 50MB — video files allowed up to this
const MAX_CACHEABLE_APP_SIZE = 512000;              // 500KB — app shell files only
const NETWORK_FIRST_TIMEOUT_MS = 5000;              // 5s timeout before falling to cache

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
                cacheNames
                    .filter((name) => name !== CACHE_NAME && name !== MEDIA_CACHE_NAME && name !== API_CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// ── SHELTER C-T2: Trim Cache — FIFO eviction when exceeding max items ──
async function trimCache(cacheName, maxItems) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
        const excess = keys.length - maxItems;
        for (let i = 0; i < excess; i++) {
            await cache.delete(keys[i]);
        }
        console.log(`[TAD SW] Trimmed ${excess} entries from ${cacheName}`);
    }
}

// ── SHELTER C-T3: Periodic cache cleanup (runs on fetch events, throttled) ──
let lastCleanupTime = 0;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

async function periodicCleanup() {
    const now = Date.now();
    if (now - lastCleanupTime < CLEANUP_INTERVAL_MS) return;
    lastCleanupTime = now;
    await trimCache(CACHE_NAME, MAX_APP_SHELL_ITEMS);
    await trimCache(MEDIA_CACHE_NAME, MAX_MEDIA_ITEMS);
    // API cache: keep max 50 entries (short-lived data)
    await trimCache(API_CACHE_NAME, 50);
    console.log('[TAD SW] Periodic cleanup completed');
}

// Helper for Range Requests (Critical for Video Playback)
async function handleRangeRequest(request, cache) {
    const url = new URL(request.url);
    const isCacheableScheme = url.protocol === 'https:' || url.protocol === 'http:';

    const cachedResponse = await cache.match(request);
    if (!cachedResponse) {
        try {
            const networkResponse = await fetch(request);
            if (networkResponse.ok && isCacheableScheme) {
                const contentLength = parseInt(networkResponse.headers.get('content-length') || '0', 10);
                if (!contentLength || contentLength <= MAX_CACHEABLE_MEDIA_SIZE) {
                    cache.put(request, networkResponse.clone());
                } else {
                    console.warn(`[TAD SW] Skipping cache for large file: ${url.pathname} (${contentLength} bytes)`);
                }
            }
            return networkResponse;
        } catch (err) {
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

// ── Network-First with timeout fallback for API calls ──
async function networkFirstWithFallback(request, cacheName) {
    const cache = await caches.open(cacheName);
    try {
        // Try network with timeout
        const networkPromise = fetch(request);
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Network timeout')), NETWORK_FIRST_TIMEOUT_MS)
        );
        const networkResponse = await Promise.race([networkPromise, timeoutPromise]);

        if (networkResponse.ok && request.method === 'GET') {
            const contentLength = parseInt(networkResponse.headers.get('content-length') || '0', 10);
            if (!contentLength || contentLength <= MAX_CACHEABLE_APP_SIZE) {
                await cache.put(request, networkResponse.clone());
            }
        }
        return networkResponse;
    } catch (err) {
        // Network failed or timed out → fall back to cache
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            console.log(`[TAD SW] API cache fallback for: ${request.url}`);
            return cachedResponse;
        }
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    }
}

self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // 🛡️ FULLY KIOSK GUARD: Ignore chrome-extension:// and non-http(s) schemes
    if (requestUrl.protocol !== 'https:' && requestUrl.protocol !== 'http:') {
        return;
    }

    // 🛡️ SECURITY: Prevent Mixed Content Errors
    if (self.location.protocol === 'https:' && requestUrl.protocol === 'http:') {
        if (requestUrl.hostname.startsWith('10.') || requestUrl.hostname === 'localhost' || requestUrl.hostname.includes('easypanel.host')) {
            const PROD_API = 'https://tad-api.rewvid.easypanel.host';
            const secureUrl = event.request.url.replace(/^http:\/\/[^\/]+/, PROD_API).replace('http:', 'https:');
            event.respondWith(fetch(secureUrl, { method: event.request.method, headers: event.request.headers, mode: 'cors' }));
            return;
        }
    }

    // Non-GET requests (POST, PUT, etc.) — pass through to network only
    if (event.request.method !== 'GET') {
        return;
    }

    // ── STRATEGY 1: Network-First for API + telemetry + sync calls ──
    const isApiCall = requestUrl.pathname.startsWith('/api/') ||
        requestUrl.pathname.startsWith('/backend-api/') ||
        requestUrl.pathname.includes('/sync/') ||
        requestUrl.pathname.includes('/telemetry') ||
        requestUrl.pathname.includes('/heartbeat') ||
        requestUrl.pathname.includes('/playback');

    if (isApiCall) {
        event.respondWith(networkFirstWithFallback(event.request, API_CACHE_NAME));
        event.waitUntil(periodicCleanup());
        return;
    }

    // ── STRATEGY 2: Cache-First with Range Support for Media ──
    const isMediaFile = requestUrl.pathname.match(/\.(mp4|webm|png|jpg|jpeg|svg|webp)$/);
    const isSupabase = requestUrl.hostname.includes(SUPABASE_STORAGE_DOMAIN);

    if (isMediaFile || isSupabase) {
        event.respondWith(
            caches.open(MEDIA_CACHE_NAME).then(cache => handleRangeRequest(event.request, cache))
        );
        event.waitUntil(periodicCleanup());
        return;
    }

    // ── STRATEGY 3: Stale-While-Revalidate for App Shell ──
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse.ok && event.request.method === 'GET') {
                    const contentLength = parseInt(networkResponse.headers.get('content-length') || '0', 10);
                    if (!contentLength || contentLength <= MAX_CACHEABLE_APP_SIZE) {
                        const cacheCopy = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, cacheCopy));
                    }
                }
                return networkResponse;
            }).catch(() => null);

            return cachedResponse || fetchPromise || new Response('Network Error', { status: 503 });
        })
    );
    event.waitUntil(periodicCleanup());
});

// ── Background Sync: flush telemetry when network recovers ──
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-tad-telemetry') {
        event.waitUntil(notifyClientsToFlush());
    }
});

async function notifyClientsToFlush() {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
        client.postMessage({ type: 'FLUSH_TELEMETRY' });
    }
}