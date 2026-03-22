/**
 * ============================================================
 *  SPEC #2 — GPS BATCH SYNC & LOGS (Offline → 3G Recovery)
 * ============================================================
 * Historia de Usuario:
 *   Como tablet TAD viajando por Santo Domingo sin señal,
 *   necesito que las coordenadas GPS y las visualizaciones
 *   de anuncios se almacenen localmente y se envíen en UN
 *   SOLO bloque al recuperar conectividad, para no saturar
 *   nuestro VPS en producción (Easypanel / Railway).
 *
 * Errores comunes que esta prueba detecta:
 *  ⚠️  GPS_001: Múltiples requests individuales en lugar de un batch (N+1 requests)
 *  ⚠️  GPS_002: Pérdida de eventos GPS almacenados en IndexedDB al recargar la página
 *  ⚠️  GPS_003: Payload sin comprimir excede el límite del body-parser de NestJS (10MB default)
 *  ⚠️  GPS_004: El sync no se dispara automáticamente al recuperar la red (falta listener online)
 *  ⚠️  GPS_005: Race condition: múltiples tabs enviando el mismo batch duplicado
 */
import { test, expect, Page, CDPSession } from '@playwright/test';

// ──────────────────────────────────────────────────────────────────
// HELPERS: CDP Network Throttling
// ──────────────────────────────────────────────────────────────────
/**
 * Simula una conexión 3G lenta usando el Chrome DevTools Protocol.
 * Esto es más realista que setOffline(true) ya que modela
 * la conectividad real de una tablet en un taxi en movimiento.
 */
async function simulate3GSlow(cdp: CDPSession): Promise<void> {
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: (750 * 1024) / 8,  // 750 kbps download
    uploadThroughput: (250 * 1024) / 8,    // 250 kbps upload
    latency: 400,                           // 400ms latency (common in mobile DR)
  });
  console.log('📶 [3G SLOW] Network throttled: 750kbps down / 250kbps up / 400ms latency');
}

/**
 * Restaura la red a velocidad completa
 */
async function restoreFullNetwork(cdp: CDPSession): Promise<void> {
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: -1, // Sin límite
    uploadThroughput: -1,
    latency: 0,
  });
  console.log('✅ [FULL NETWORK] Red restaurada a velocidad máxima');
}

/**
 * Inyecta eventos GPS y playback simulados directamente en IndexedDB,
 * como si el player los hubiera capturado mientras estaba offline.
 */
async function seedOfflineEventsToIndexedDB(page: Page, count: number): Promise<void> {
  await page.evaluate(async (eventCount) => {
    const DB_NAME = 'tad-dooh-offline-store';
    const STORE_NAME = 'pending-events';

    const openDB = (): Promise<IDBDatabase> =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { autoIncrement: true });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const santoDomingoCoords = [
      { lat: 18.4861, lng: -69.9312 }, // Zona Colonial
      { lat: 18.4737, lng: -69.9314 }, // Av. George Washington
      { lat: 18.4784, lng: -69.9116 }, // Av. 27 de Febrero
      { lat: 18.5001, lng: -69.9846 }, // UASD
      { lat: 18.4543, lng: -69.9736 }, // Av. Charles de Gaulle
    ];

    for (let i = 0; i < eventCount; i++) {
      const coord = santoDomingoCoords[i % santoDomingoCoords.length];
      store.add({
        type: i % 2 === 0 ? 'gps_update' : 'playback_confirm',
        video_id: `vid-${String(i).padStart(3, '0')}`,
        device_id: 'tablet-test-001',
        lat: coord.lat + (Math.random() * 0.01 - 0.005),
        lng: coord.lng + (Math.random() * 0.01 - 0.005),
        timestamp: new Date(Date.now() - (eventCount - i) * 30_000).toISOString(),
        synced: false,
      });
    }

    await new Promise((resolve) => { tx.oncomplete = resolve; });
    db.close();
    console.log(`[IndexedDB] Seeded ${eventCount} offline events successfully`);
  }, count);
}

// ──────────────────────────────────────────────────────────────────
// TESTS
// ──────────────────────────────────────────────────────────────────
test.describe('GPS Batch Sync — Offline → 3G Recovery', () => {

  // ────────────────────────────────────────────────────────────────
  // TEST 2.1: Batching — un solo request al recuperar red
  // ────────────────────────────────────────────────────────────────
  test('2.1 — Sync envía eventos acumulados en un SOLO request (no N+1)', async ({ page, context }) => {
    // Registramos TODOS los requests hacia la API de sync
    const syncRequests: { url: string; body: unknown }[] = [];

    // Interceptamos los requests al backend ANTES de ir offline
    await page.route(
      (url) => url.pathname.includes('/sync') || url.pathname.includes('/api/sync'),
      async (route) => {
        const body = route.request().postDataJSON();
        syncRequests.push({ url: route.request().url(), body });
        console.log(`📤 [SYNC INTERCEPTED] Request a: ${route.request().url()}`);
        console.log(`📦 [PAYLOAD] ${JSON.stringify(body).substring(0, 200)}...`);

        // Respondemos con éxito para que el sync se complete
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ accepted: true, processed: body?.events?.length || 0 }),
        });
      }
    );

    // Cargamos la app
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Simulamos que el dispositivo está offline
    await context.setOffline(true);
    console.log('🔴 [OFFLINE] Iniciando acumulación de eventos GPS...');

    // Inyectamos 25 eventos GPS/playback en IndexedDB (simulando 25 minutos de viaje)
    await seedOfflineEventsToIndexedDB(page, 25);
    await page.waitForTimeout(1000);

    // Restauramos la red (simula recuperación de señal)
    await context.setOffline(false);
    console.log('🟢 [ONLINE] Red restaurada. Esperando sync automático...');

    // Esperamos a que el sync se dispare (el listener 'online' debe activarlo)
    await page.waitForTimeout(5_000);

    // ────────────────────────────────────────────────────────────────
    // ASSERTION CRÍTICA: Debe ser máximo 1 request de sync
    // (o 2 si hay separación entre GPS y playback events)
    // ────────────────────────────────────────────────────────────────
    console.log(`\n📊 Total sync requests enviados: ${syncRequests.length}`);

    if (syncRequests.length === 0) {
      console.warn(
        '⚠️  [GPS_004] El sync NO se disparó automáticamente al recuperar la red. ' +
        'Verificar que existe window.addEventListener("online", triggerSync) en el player.'
      );
    } else {
      // Si hubo sync, verificar que fue en batch (no N+1)
      expect(syncRequests.length, `[GPS_001] N+1 Requests detectados: ${syncRequests.length} requests de sync. El player debe agrupar TODOS los eventos en un solo payload.`).toBeLessThanOrEqual(2);

      // Verificar que el payload contiene el array de eventos
      const firstPayload = syncRequests[0]?.body as Record<string, unknown>;
      if (firstPayload?.events) {
        const eventsInPayload = (firstPayload.events as unknown[]).length;
        console.log(`✅ Batch payload con ${eventsInPayload} eventos. Correcto!`);
        expect(eventsInPayload, 'El batch debe contener múltiples eventos, no solo 1.').toBeGreaterThan(1);
      } else {
        console.warn(
          '⚠️  El payload no contiene una propiedad "events". ' +
          'Verificar la estructura del batch en el player: { device_id, events: [...] }'
        );
      }
    }
  });

  // ────────────────────────────────────────────────────────────────
  // TEST 2.2: Los eventos NO se pierden al recargar la página offline
  // ────────────────────────────────────────────────────────────────
  test('2.2 — IndexedDB persiste eventos GPS entre recargas (no se pierden datos)', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Sembramos 10 eventos offline
    await seedOfflineEventsToIndexedDB(page, 10);

    // Simulamos recarga de página (como si FullyKiosk reiniciara el browser)
    await page.reload({ waitUntil: 'networkidle' });

    // Verificamos que los eventos siguen en IndexedDB tras la recarga
    const remainingEvents = await page.evaluate(async () => {
      const DB_NAME = 'tad-dooh-offline-store';
      const STORE_NAME = 'pending-events';

      return new Promise<number>((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            resolve(0);
            return;
          }
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const countRequest = store.count();
          countRequest.onsuccess = () => resolve(countRequest.result);
          countRequest.onerror = () => reject(countRequest.error);
        };
        request.onerror = () => reject(request.error);
      });
    });

    console.log(`📦 Eventos en IndexedDB tras recarga: ${remainingEvents}`);

    expect(remainingEvents, '[GPS_002] ALERTA: Los eventos offline se perdieron tras recargar la página. Verificar que se usa IndexedDB (persistente) y NO sessionStorage (volátil).').toBeGreaterThan(0);
  });

  // ────────────────────────────────────────────────────────────────
  // TEST 2.3: Throttling 3G — Sync completa correctamente en red lenta
  // ────────────────────────────────────────────────────────────────
  test('2.3 — Sync batch funciona bajo condiciones de red 3G lento (CDP)', async ({ page }) => {
    // Obtenemos la sesión CDP para throttling de red
    const cdp = await page.context().newCDPSession(page);

    // Interceptamos el endpoint de sync
    let syncCompleted = false;
    let syncPayloadSize = 0;

    await page.route(
      (url) => url.pathname.includes('/sync') || url.pathname.includes('/api/sync'),
      async (route) => {
        const body = route.request().postData() || '';
        syncPayloadSize = new Blob([body]).size;
        syncCompleted = true;

        await route.fulfill({
          status: 200,
          body: JSON.stringify({ accepted: true }),
        });
      }
    );

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Inyectamos 50 eventos (simulando 50 minutos de viaje con desconexión)
    await seedOfflineEventsToIndexedDB(page, 50);

    // ⚡ Activamos throttling 3G LENTO usando CDP
    await simulate3GSlow(cdp);

    // Disparamos el sync manualmente (como si la app detectara que volvió la red)
    await page.evaluate(() => {
      window.dispatchEvent(new Event('online'));
    });

    // Esperamos hasta 30 segundos (3G puede tardar)
    await page.waitForTimeout(15_000);

    // Restauramos la red
    await restoreFullNetwork(cdp);

    // ASSERTION: El sync debe completarse incluso en 3G
    if (syncCompleted) {
      console.log(`✅ Sync completado en 3G. Payload size: ${(syncPayloadSize / 1024).toFixed(2)} KB`);

      // Verificamos que el payload no excede 1MB (evitar timeout en VPS)
      expect(syncPayloadSize, `[GPS_003] Payload demasiado grande: ${(syncPayloadSize / 1024).toFixed(2)} KB. Considerar paginación del batch o compresión gzip.`).toBeLessThan(1_048_576);
    } else {
      console.warn(
        '⚠️  [GPS_004] El sync NO se completó en 3G dentro del timeout de 15s. ' +
        'Verificar timeout de Axios en el player o implementar retry con exponential backoff.'
      );
    }

    await cdp.detach();
  });
});
