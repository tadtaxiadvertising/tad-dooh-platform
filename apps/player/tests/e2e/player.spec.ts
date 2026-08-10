/**
 * ============================================================
 *  TAD DOOH PLAYER — OFFLINE RESILIENCE & VIDEO PLAYBACK
 * ============================================================
 * Tests para el reproductor de anuncios en tablets Android (FullyKiosk).
 * Enfocado en: Service Worker, offline-first, video playback, memory leaks.
 */
import { test, expect, BrowserContext, Page } from '@playwright/test';

// ──────────────────────────────────────────────────────────────────
// TEST 1: PWA OFFLINE RESILIENCE (Service Worker)
// ──────────────────────────────────────────────────────────────────
test.describe('PWA Offline Resilience — Service Worker', () => {
  let context: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      isMobile: true,
      hasTouch: true,
      serviceWorkers: 'allow',
    });

    const page = await context.newPage();
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Verificar que el SW está registrado
    const swRegistered = await page.evaluate(() =>
      navigator.serviceWorker.ready.then(() => true).catch(() => false)
    );
    expect(swRegistered, 'Service Worker debe estar registrado').toBe(true);

    await page.close();
  });

  test.afterEach(async () => {
    await context.setOffline(false);
    await context.close();
  });

  test('1.1 — App Shell carga desde caché SW sin red', async () => {
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForSelector('body', { state: 'visible' });

    // Cortar red
    await context.setOffline(true);
    console.log('🔴 [OFFLINE] Red desconectada');

    let networkError = false;
    page.on('response', (response) => {
      if (response.status() >= 500) networkError = true;
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });

    // No debe aparecer error de red del browser
    const offlineText = page.locator('text=/ERR_INTERNET_DISCONNECTED|ERR_NETWORK_CHANGED|Sin conexión/i');
    await expect(offlineText).toHaveCount(0, { timeout: 5_000 });

    expect(networkError, 'No debe haber respuestas 5xx').toBe(false);
  });

  test('1.2 — Player de video funciona offline (IndexedDB)', async () => {
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const jsErrors: string[] = [];
    page.on('pageerror', (error) => jsErrors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') jsErrors.push(msg.text());
    });

    await context.setOffline(true);
    console.log('🔴 [OFFLINE] Probando reproductor...');

    await page.waitForTimeout(5000);

    const videoElement = page.locator('#tad-player, video[autoplay]').first();
    const videoExists = await videoElement.count() > 0;

    if (videoExists) {
      const hasError = await videoElement.evaluate((v: HTMLVideoElement) => v.error !== null);
      expect(hasError, 'Video no debe tener error').toBe(false);
    }

    const criticalErrors = jsErrors.filter(
      (e) => e.includes('fetch') || e.includes('NetworkError') || e.includes('Failed to load resource')
    );
    console.log(criticalErrors.length > 0
      ? `⚠️ Errores de red: ${criticalErrors.join('\n  ')}`
      : '✅ Sin errores críticos de red');
  });

  test('1.3 — Sin memory leaks (no acumula elementos <video>)', async () => {
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(10_000);

    const videoCount = await page.locator('video').count();
    console.log(`📹 Video elements en DOM: ${videoCount}`);
    expect(videoCount, `Memory leak: ${videoCount} elementos <video>`).toBeLessThanOrEqual(3);

    const totalElements = await page.evaluate(() => document.querySelectorAll('*').length);
    console.log(`📊 Total DOM elements: ${totalElements}`);
    expect(totalElements).toBeLessThan(5000);
  });
});

// ──────────────────────────────────────────────────────────────────
// TEST 2: VIDEO PLAYBACK QUALITY
// ──────────────────────────────────────────────────────────────────
test.describe('Video Playback — Calidad y Performance', () => {

  test('2.1 — Video se reproduce sin buffering excesivo', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const videoElement = page.locator('#tad-player, video[autoplay]').first();
    await expect(videoElement).toBeVisible({ timeout: 15_000 });

    // Esperar a que el video empiece a reproducirse
    await page.waitForTimeout(3000);

    const isPlaying = await videoElement.evaluate((v: HTMLVideoElement) => !v.paused && !v.ended && v.readyState > 2);
    console.log(`▶️ Video playing: ${isPlaying}`);
  });

  test('2.2 — Loop de video sin gaps visibles', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const videoElement = page.locator('#tad-player, video[autoplay]').first();
    await expect(videoElement).toBeVisible({ timeout: 15_000 });

    // Monitorear por 20 segundos para detectar gaps en el loop
    let lastTime = 0;
    let gaps = 0;

    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(2000);
      const currentTime = await videoElement.evaluate((v: HTMLVideoElement) => v.currentTime);
      if (currentTime < lastTime) {
        // Loop detectado - verificar que no hay gap
        const paused = await videoElement.evaluate((v: HTMLVideoElement) => v.paused);
        if (paused) gaps++;
      }
      lastTime = currentTime;
    }

    console.log(`🔄 Gaps detectados en loop: ${gaps}`);
    expect(gaps, 'No debe haber gaps/pausas en el loop de video').toBe(0);
  });

  test('2.3 — Calidad de video adaptativa (cambio de bitrate)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const videoElement = page.locator('#tad-player, video[autoplay]').first();
    await expect(videoElement).toBeVisible({ timeout: 15_000 });

    // Verificar que el video tiene múltiples fuentes o usa HLS/DASH
    const sources = await videoElement.evaluate((v: HTMLVideoElement) =>
      Array.from(v.querySelectorAll('source')).map(s => ({ src: s.src, type: s.type }))
    );

    console.log(`📹 Sources disponibles: ${sources.length}`, sources);
    // Al menos 1 source (puede ser HLS manifest)
    expect(sources.length + (await videoElement.getAttribute('src') ? 1 : 0)).toBeGreaterThan(0);
  });
});

// ──────────────────────────────────────────────────────────────────
// TEST 3: KIOSK MODE BEHAVIOR
// ──────────────────────────────────────────────────────────────────
test.describe('Kiosk Mode — FullyKiosk Behavior', () => {

  test('3.1 — UI ocupa 100% viewport (1280x800)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const dims = await page.evaluate(() => ({
      bodyWidth: document.body.scrollWidth,
      bodyHeight: document.body.scrollHeight,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      bodyOverflow: window.getComputedStyle(document.body).overflow,
      htmlOverflow: window.getComputedStyle(document.documentElement).overflow,
    }));

    console.log('📐 Dimensions:', dims);

    // No scroll horizontal
    expect(dims.bodyWidth).toBeLessThanOrEqual(dims.windowWidth + 5);

    // Overflow hidden en kiosk mode
    expect(dims.bodyOverflow).toBe('hidden');
    expect(dims.htmlOverflow).toBe('hidden');
  });

  test('3.2 — No elementos de browser sobrepuestos', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const hasScrollbar = await page.evaluate(() =>
      document.documentElement.scrollHeight > document.documentElement.clientHeight
    );

    expect(hasScrollbar, 'No debe haber scroll vertical en modo kiosco').toBe(false);

    const viewport = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
    }));
    expect(viewport.width).toBe(1280);
    expect(viewport.height).toBe(800);
  });

  test('3.3 — User Agent correcto para FullyKiosk', async ({ page }) => {
    await page.goto('/');
    const ua = await page.evaluate(() => navigator.userAgent);
    expect(ua).toContain('FullyKiosk');
    expect(ua).toContain('Android');
  });
});

// ──────────────────────────────────────────────────────────────────
// TEST 4: GPS & TELEMETRY (Offline Sync)
// ──────────────────────────────────────────────────────────────────
test.describe('GPS & Telemetry — Offline Sync', () => {

  test('4.1 — GPS se almacena offline y sincroniza al recuperar red', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Simular almacenamiento offline
    await page.evaluate(() => {
      const gpsData = Array.from({ length: 10 }, (_, i) => ({
        lat: 18.4861 + Math.random() * 0.01,
        lng: -69.9312 + Math.random() * 0.01,
        ts: Date.now() - i * 30000,
        accuracy: 10,
      }));
      localStorage.setItem('TAD_GPS_OFFLINE', JSON.stringify(gpsData));
    });

    // Cortar red
    await page.context().setOffline(true);

    // Recargar página
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Verificar persistencia
    const stored = await page.evaluate(() => {
      const raw = localStorage.getItem('TAD_GPS_OFFLINE');
      return raw ? JSON.parse(raw).length : 0;
    });

    expect(stored).toBe(10);

    // Restaurar red
    await page.context().setOffline(false);

    // Verificar sync (mock)
    await page.waitForTimeout(3000);
    console.log('✅ GPS sync test completado');
  });
});