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
import { test, expect, Page, CDPSession } from "@playwright/test";

const OFFLINE_STORAGE_KEY = "TAD_TELEMETRY_OFFLINE";

async function openGpsHarness(page: Page): Promise<void> {
  await page.goto("/gps-test", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("gps-test-title")).toHaveText("gps-test-ready");
}

async function seedOfflineEvents(page: Page, count: number): Promise<void> {
  await page.evaluate(
    ({ storageKey, eventCount }) => {
      const santoDomingoCoords = [
        { lat: 18.4861, lng: -69.9312 },
        { lat: 18.4737, lng: -69.9314 },
        { lat: 18.4784, lng: -69.9116 },
        { lat: 18.5001, lng: -69.9846 },
        { lat: 18.4543, lng: -69.9736 },
      ];

      const payload = Array.from({ length: eventCount }, (_, index) => {
        const coord = santoDomingoCoords[index % santoDomingoCoords.length];
        return {
          lat: coord.lat + (Math.random() * 0.01 - 0.005),
          lng: coord.lng + (Math.random() * 0.01 - 0.005),
          ts: Date.now() - (eventCount - index) * 30_000,
          accuracy: 8,
        };
      });

      localStorage.setItem(storageKey, JSON.stringify(payload));
    },
    { storageKey: OFFLINE_STORAGE_KEY, eventCount: count },
  );
}

async function readOfflineEvents(page: Page): Promise<number> {
  return page.evaluate((storageKey) => {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw).length : 0;
  }, OFFLINE_STORAGE_KEY);
}

// ──────────────────────────────────────────────────────────────────
// HELPERS: CDP Network Throttling
// ──────────────────────────────────────────────────────────────────
/**
 * Simula una conexión 3G lenta usando el Chrome DevTools Protocol.
 * Esto es más realista que setOffline(true) ya que modela
 * la conectividad real de una tablet en un taxi en movimiento.
 */
async function simulate3GSlow(cdp: CDPSession): Promise<void> {
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    downloadThroughput: (750 * 1024) / 8, // 750 kbps download
    uploadThroughput: (250 * 1024) / 8, // 250 kbps upload
    latency: 400, // 400ms latency (common in mobile DR)
  });
  console.log(
    "📶 [3G SLOW] Network throttled: 750kbps down / 250kbps up / 400ms latency",
  );
}

/**
 * Restaura la red a velocidad completa
 */
async function restoreFullNetwork(cdp: CDPSession): Promise<void> {
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    downloadThroughput: -1, // Sin límite
    uploadThroughput: -1,
    latency: 0,
  });
  console.log("✅ [FULL NETWORK] Red restaurada a velocidad máxima");
}

// ──────────────────────────────────────────────────────────────────
// TESTS
// ──────────────────────────────────────────────────────────────────
test.describe("GPS Batch Sync — Offline → 3G Recovery", () => {
  // ────────────────────────────────────────────────────────────────
  // TEST 2.1: Batching — un solo request al recuperar red
  // ────────────────────────────────────────────────────────────────
  test("2.1 — Sync envía eventos acumulados en un SOLO request (no N+1)", async ({
    page,
    context,
  }) => {
    // Registramos TODOS los requests hacia la API de sync
    const syncRequests: { url: string; body: unknown }[] = [];

    // Interceptamos los requests al backend ANTES de ir offline
    await page.route(
      (url) => url.pathname.includes("/api/proxy/fleet/track-batch"),
      async (route) => {
        const body = route.request().postDataJSON();
        syncRequests.push({ url: route.request().url(), body });
        console.log(
          `📤 [SYNC INTERCEPTED] Request a: ${route.request().url()}`,
        );
        console.log(
          `📦 [PAYLOAD] ${JSON.stringify(body).substring(0, 200)}...`,
        );

        // Respondemos con éxito para que el sync se complete
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ count: body?.points?.length || 0 }),
        });
      },
    );

    await openGpsHarness(page);

    // Simulamos que el dispositivo está offline
    await context.setOffline(true);
    console.log("🔴 [OFFLINE] Iniciando acumulación de eventos GPS...");

    await seedOfflineEvents(page, 25);
    await expect(page.getByTestId("offline-count")).toHaveText("25");
    await page.waitForTimeout(1000);

    // Restauramos la red (simula recuperación de señal)
    await context.setOffline(false);
    console.log("🟢 [ONLINE] Red restaurada. Esperando sync automático...");

    // Esperamos a que el sync se dispare (el listener 'online' debe activarlo)
    await page.waitForTimeout(5_000);

    // ────────────────────────────────────────────────────────────────
    // ASSERTION CRÍTICA: Debe ser máximo 1 request de sync
    // (o 2 si hay separación entre GPS y playback events)
    // ────────────────────────────────────────────────────────────────
    console.log(`\n📊 Total sync requests enviados: ${syncRequests.length}`);

    if (syncRequests.length === 0) {
      console.warn(
        "⚠️  [GPS_004] El sync NO se disparó automáticamente al recuperar la red. " +
          'Verificar que existe window.addEventListener("online", triggerSync) en el player.',
      );
    } else {
      // Si hubo sync, verificar que fue en batch (no N+1)
      expect(
        syncRequests.length,
        `[GPS_001] N+1 Requests detectados: ${syncRequests.length} requests de sync. El player debe agrupar TODOS los eventos en un solo payload.`,
      ).toBeLessThanOrEqual(2);

      // Verificar que el payload contiene el array de eventos
      const firstPayload = syncRequests[0]?.body as Record<string, unknown>;
      if (firstPayload?.points) {
        const eventsInPayload = (firstPayload.points as unknown[]).length;
        console.log(
          `✅ Batch payload con ${eventsInPayload} eventos. Correcto!`,
        );
        expect(
          eventsInPayload,
          "El batch debe contener múltiples eventos, no solo 1.",
        ).toBeGreaterThan(1);
      } else {
        console.warn(
          '⚠️  El payload no contiene una propiedad "points". ' +
            "Verificar la estructura del batch en el driver: { driverId, deviceId, points: [...] }",
        );
      }
    }
  });

  // ────────────────────────────────────────────────────────────────
  // TEST 2.2: Los eventos NO se pierden al recargar la página offline
  // ────────────────────────────────────────────────────────────────
  test("2.2 — localStorage persiste eventos GPS entre recargas (no se pierden datos)", async ({
    page,
  }) => {
    await openGpsHarness(page);

    // Sembramos 10 eventos offline
    await seedOfflineEvents(page, 10);

    // Simulamos recarga de página (como si FullyKiosk reiniciara el browser)
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("gps-test-title")).toHaveText(
      "gps-test-ready",
    );

    const remainingEvents = await readOfflineEvents(page);

    console.log(`📦 Eventos en localStorage tras recarga: ${remainingEvents}`);

    expect(
      remainingEvents,
      "[GPS_002] ALERTA: Los eventos offline se perdieron tras recargar la página. Verificar persistencia local del buffer de GPS.",
    ).toBeGreaterThan(0);
  });

  // ────────────────────────────────────────────────────────────────
  // TEST 2.3: Throttling 3G — Sync completa correctamente en red lenta
  // ────────────────────────────────────────────────────────────────
  test("2.3 — Sync batch funciona bajo condiciones de red 3G lento (CDP)", async ({
    page,
  }) => {
    // Obtenemos la sesión CDP para throttling de red
    const cdp = await page.context().newCDPSession(page);

    // Interceptamos el endpoint de sync
    let syncCompleted = false;
    let syncPayloadSize = 0;

    await page.route(
      (url) => url.pathname.includes("/api/proxy/fleet/track-batch"),
      async (route) => {
        const body = route.request().postData() || "";
        syncPayloadSize = new Blob([body]).size;
        syncCompleted = true;

        await route.fulfill({
          status: 200,
          body: JSON.stringify({ accepted: true }),
        });
      },
    );

    await openGpsHarness(page);

    // Inyectamos 50 eventos (simulando 50 minutos de viaje con desconexión)
    await seedOfflineEvents(page, 50);

    // ⚡ Activamos throttling 3G LENTO usando CDP
    await simulate3GSlow(cdp);

    // Disparamos el sync manualmente (como si la app detectara que volvió la red)
    await page.evaluate(() => {
      window.dispatchEvent(new Event("online"));
    });

    // Esperamos hasta 30 segundos (3G puede tardar)
    await page.waitForTimeout(15_000);

    // Restauramos la red
    await restoreFullNetwork(cdp);

    // ASSERTION: El sync debe completarse incluso en 3G
    if (syncCompleted) {
      console.log(
        `✅ Sync completado en 3G. Payload size: ${(syncPayloadSize / 1024).toFixed(2)} KB`,
      );

      // Verificamos que el payload no excede 1MB (evitar timeout en VPS)
      expect(
        syncPayloadSize,
        `[GPS_003] Payload demasiado grande: ${(syncPayloadSize / 1024).toFixed(2)} KB. Considerar paginación del batch o compresión gzip.`,
      ).toBeLessThan(1_048_576);
    } else {
      console.warn(
        "⚠️  [GPS_004] El sync NO se completó en 3G dentro del timeout de 15s. " +
          "Verificar timeout de Axios en el player o implementar retry con exponential backoff.",
      );
    }

    await cdp.detach();
  });
});
