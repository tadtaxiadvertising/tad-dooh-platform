// ─── TAD DOOH Player — Service Worker ───
// Offline resilience: caches video assets, API responses, and the player shell.
// Enables playback even when the tablet loses connectivity for extended periods.

/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'tad-player-v1';
const VIDEO_CACHE = 'tad-player-videos-v1';
const SHELL_CACHE = 'tad-player-shell-v1';

// Shell assets — only cache the app shell (HTML references hashed CSS/JS).
// Vite emits hashed filenames (e.g. main-6jpdjePn.css) that change per build,
// so we must NOT hardcode /assets/player.css here — it doesn't exist and
// causes cache.addAll() to reject, breaking the SW install.
// The fetch handler below caches hashed assets on-demand via SWR.
const SHELL_ASSETS = [
  '/',
  '/index.html',
];

// Install: cache the shell assets. Use individual puts (not addAll) so that
// a single 404 doesn't abort the entire install.
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache =>
      Promise.allSettled(
        SHELL_ASSETS.map(asset =>
          fetch(asset, { cache: 'no-cache' })
            .then(resp => resp.ok ? cache.put(asset, resp.clone()) : null)
            .catch(() => null) // tolerate transient failures
        )
      )
    )
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME && key !== VIDEO_CACHE && key !== SHELL_CACHE)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: stale-while-revalidate for shell, cache-first for videos
self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);

  // Video assets — cache-first (long-term cache, immutable)
  if (url.pathname.includes('/campaign-videos/') || url.pathname.endsWith('.mp4') || url.pathname.endsWith('.webm')) {
    event.respondWith(
      caches.open(VIDEO_CACHE).then(async cache => {
        const cached = await cache.match(event.request);
        if (cached) return cached;

        const response = await fetch(event.request);
        if (response.ok) {
          cache.put(event.request, response.clone());
        }
        return response;
      })
    );
    return;
  }

  // Supabase Storage — cache-first
  if (url.hostname.includes('supabase') && url.pathname.includes('/storage/')) {
    event.respondWith(
      caches.open(VIDEO_CACHE).then(async cache => {
        const cached = await cache.match(event.request);
        if (cached) return cached;

        const response = await fetch(event.request);
        if (response.ok) {
          cache.put(event.request, response.clone());
        }
        return response;
      })
    );
    return;
  }

  // API calls — network-first with cache fallback
  if (url.pathname.startsWith('/device/') || url.pathname.startsWith('/sync/') || url.pathname.startsWith('/telemetry/') || url.pathname.startsWith('/fleet/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request) as Promise<Response>)
    );
    return;
  }

  // Shell assets — stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        if (response.ok) {
          caches.open(SHELL_CACHE).then(cache => cache.put(event.request, response.clone()));
        }
        return response;
      });
      return cached || fetchPromise;
    })
  );
});
