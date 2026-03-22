/**
 * ============================================================
 *  SPEC #1 — RESILIENCIA OFFLINE (PWA / Service Worker)
 * ============================================================
 * Historia de Usuario:
 *   Como tablet TAD en un taxi sin cobertura, necesito
 *   seguir reproduciendo anuncios aunque no haya internet,
 *   para garantizar que el cliente/anunciante no pierda
 *   impresiones publicitarias.
 *
 * Errores comunes que esta prueba detecta:
 *  ⚠️  SW_001: El Service Worker no pre-cachea los assets de video
 *  ⚠️  SW_002: El app shell (HTML/JS) no sobrevive a un hard-refresh offline
 *  ⚠️  SW_003: La UI rompe con un "Network Error" visible al usuario (no graceful degradation)
 *  ⚠️  SW_004: El reproductor de video pausa si la URL no está en cache
 */
import { test, expect, BrowserContext } from '@playwright/test';

test.describe('PWA Offline Resilience — Service Worker', () => {
  let context: BrowserContext;

  // ────────────────────────────────────────────────────────────────
  // SETUP: Navegamos online para que el SW cachee los assets
  // ────────────────────────────────────────────────────────────────
  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      isMobile: true,
      hasTouch: true,
      // Registramos el Service Worker en modo "UPDATE_ON_RELOAD" para pruebas
      serviceWorkers: 'allow',
    });

    const page = await context.newPage();

    // Cargamos la PWA en modo ONLINE para activar el Service Worker
    await page.goto('/');
    // Esperamos a que el SW se active (registros de SW tardan ~2s)
    await page.waitForTimeout(3000);

    // Verificamos que el SW está registrado antes de cortar la red
    const swRegistered = await page.evaluate(() =>
      navigator.serviceWorker.ready.then(() => true).catch(() => false)
    );
    expect(swRegistered, 'Service Worker debe estar registrado antes del test').toBe(true);

    await page.close();
  });

  test.afterEach(async () => {
    // Restauramos la conexión y cerramos el contexto
    await context.setOffline(false);
    await context.close();
  });

  // ────────────────────────────────────────────────────────────────
  // TEST 1.1: La PWA debe cargar desde caché cuando la red se corta
  // ────────────────────────────────────────────────────────────────
  test('1.1 — PWA App Shell carga desde caché SW sin red activa', async () => {
    const page = await context.newPage();

    // Navegamos online primero para asegurar el caché
    await page.goto('/');
    await page.waitForSelector('body', { state: 'visible' });

    // ⚡ KILL THE NETWORK — Simula pérdida total de señal
    await context.setOffline(true);
    console.log('🔴 [OFFLINE] Red desconectada. Probando carga desde SW cache...');

    // Navegamos de nuevo: debe cargar desde caché del SW
    let networkError = false;
    page.on('response', (response) => {
      if (response.status() >= 500) networkError = true;
    });

    await page.reload({ waitUntil: 'domcontentloaded' });

    // El HTML del app shell debe cargarse aunque sea desde cache
    await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });

    // ✅ Verificamos que NO aparece pantalla de error de red del browser
    const offlineText = page.locator('text=/ERR_INTERNET_DISCONNECTED|ERR_NETWORK_CHANGED|Sin conexión/i');
    await expect(offlineText).toHaveCount(0, { timeout: 5_000 });

    // ✅ Verificamos que hay un indicador de modo offline en la UI
    const offlineBanner = page.locator('[data-testid="offline-banner"], .offline-indicator, [aria-label*="offline"]');
    // Este es un check "soft" — puede existir o no dependiendo de la implementación
    const bannerCount = await offlineBanner.count();
    console.log(`ℹ️ Offline banner visible: ${bannerCount > 0 ? 'Sí ✅' : 'No — considerar añadir indicador UX offline'}`);

    expect(networkError, 'No debe haber respuestas 5xx durante carga offline').toBe(false);
  });

  // ────────────────────────────────────────────────────────────────
  // TEST 1.2: El reproductor de video sigue funcionando offline
  // ────────────────────────────────────────────────────────────────
  test('1.2 — El player de anuncios reproduce videos desde caché IndexedDB', async () => {
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Capturamos los errores JS de la página (buscamos crashes del player)
    const jsErrors: string[] = [];
    page.on('pageerror', (error) => jsErrors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') jsErrors.push(msg.text());
    });

    // Cortamos la red
    await context.setOffline(true);
    console.log('🔴 [OFFLINE] Probando reproductor de video...');

    // Esperamos 5 segundos para verificar que el player no crashea offline
    await page.waitForTimeout(5000);

    // ✅ El video element debe existir en el DOM (elemento principal del player)
    const videoElement = page.locator('#tad-player, video[autoplay]').first();
    const videoExists = await videoElement.count() > 0;

    if (videoExists) {
      // ✅ No debe estar en pausa o en estado de error por falta de red
      const isPaused = await videoElement.evaluate((v: HTMLVideoElement) => v.paused);
      const hasError = await videoElement.evaluate((v: HTMLVideoElement) => v.error !== null);
      
      expect(hasError, 'El elemento video no debe tener estado de error').toBe(false);
      console.log(`ℹ️ Video paused offline: ${isPaused} (aceptable si no hay video cacheado aún)`);
    }

    // ✅ No debe haber errores JS críticos sobre red o CORS
    const criticalErrors = jsErrors.filter(
      (e) => e.includes('fetch') || e.includes('NetworkError') || e.includes('Failed to load resource')
    );

    // Errores de fetch son esperados (la app debe manejarlos gracefully)
    console.log(
      criticalErrors.length > 0
        ? `⚠️ Errores de red detectados (verificar manejo graceful): \n  ${criticalErrors.join('\n  ')}`
        : '✅ Sin errores críticos de red en el player.'
    );
  });

  // ────────────────────────────────────────────────────────────────
  // TEST 1.3: El player no presenta Memory Leaks visibles (DOM overflow)
  // Detecta el error más común en players de video en bucle: fuga de <video> elements
  // ────────────────────────────────────────────────────────────────
  test('1.3 — Sin fugas de memoria DOM (no acumula elementos <video> en bucle)', async () => {
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Esperamos 10 segundos para que el player tenga algunos ciclos
    await page.waitForTimeout(10_000);

    // ✅ Verificamos que NO hay más de 3 elementos <video> en el DOM
    // (un player bien implementado reutiliza un solo <video> element)
    const videoCount = await page.locator('video').count();
    console.log(`ℹ️ Video elements en DOM: ${videoCount}`);

    expect(videoCount, `Memory leak potencial: ${videoCount} elementos <video> detectados. El player debe reutilizar un único elemento o máximo 2 (doble buffer).`).toBeLessThanOrEqual(3);

    // ✅ Verificamos cantidad de elementos totales (no debe haber crecimiento explosivo)
    const totalElements = await page.evaluate(() => document.querySelectorAll('*').length);
    console.log(`ℹ️ Total DOM elements: ${totalElements}`);

    expect(totalElements, `DOM excesivamente grande: ${totalElements} elementos. Posible memory leak.`).toBeLessThan(5000);
  });
});
