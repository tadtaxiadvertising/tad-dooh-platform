/**
 * ============================================================
 *  TAD DOOH PLAYER — 3G SYNCHRONIZATION (ITEM 16 / M4)
 * ============================================================
 * Verifica que la cola de telemetría (IndexedDB tad_playback_queue)
 * se vacía al reconectar, con POST /telemetry/playback-batch
 * (header X-Device-Id + timeout). Red simulada offline/3G.
 * Corrido por el proyecto '3g-slow' (playwright.config.ts).
 */
import { test, expect, BrowserContext, Page } from "@playwright/test";

test.describe("3G Sync — Telemetry flush on reconnect", () => {
  let context: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      isMobile: true,
      hasTouch: true,
      // Este spec valida la cola de telemetría (flush-on-reconnect), no el SW.
      // Con el SW activo, Playwright no puede interceptar las requests que el
      // SW reenvía (respondWith → fetch), así que lo bloqueamos para que los
      // POST del PlaybackQueue pasen por page.route de forma determinista.
      serviceWorkers: "block",
    });
  });

  test.afterEach(async () => {
    await context.setOffline(false);
    await context.close();
  });

  test("5.1 — Cola de PoP se descarga al recuperar red", async ({
    browser,
  }) => {
    const page = await context.newPage();

    await page.addInitScript(() => {
      localStorage.setItem("TAD_DEVICE_ID", "e2e-device");
    });

    // Interceptar el backend: sync "vacío" (sin kill-switch) y batch OK,
    // para que el test sea determinista sin infraestructura.
    let batchReceived: {
      method: string;
      body: unknown;
      headers: Record<string, string>;
    } | null = null;

    await page.route("**/device/sync*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          update: false,
          blocked: false,
          sync_hash: "test",
        }),
      }),
    );
    await page.route("**/sync/*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ etag: "test", killSwitch: false, playlist: [] }),
      }),
    );
    await page.route("**/telemetry/playback-batch", (route) => {
      batchReceived = {
        method: route.request().method(),
        body: route.request().postDataJSON?.() ?? null,
        headers: route.request().headers(),
      };
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto("/");
    await page.waitForTimeout(4000);

    // Sembrar 2 eventos PoP directamente en la cola (como haría PlaylistEngine).
    await page.evaluate(() => {
      const open = indexedDB.open("tad_playback_queue", 1);
      open.onupgradeneeded = () => {
        const db = open.result;
        if (!db.objectStoreNames.contains("events"))
          db.createObjectStore("events", { keyPath: "id" });
      };
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction("events", "readwrite");
        const store = tx.objectStore("events");
        const now = Date.now();
        store.put({
          id: "vid1_" + now,
          device_id: "e2e-device",
          video_id: "vid1",
          event_type: "play_confirm",
          timestamp: now,
          lat: 18.4861,
          lng: -69.9312,
          queuedAt: now,
        });
        store.put({
          id: "vid2_" + (now + 1),
          device_id: "e2e-device",
          video_id: "vid2",
          event_type: "play_confirm",
          timestamp: now + 1,
          lat: 18.4862,
          lng: -69.9313,
          queuedAt: now + 1,
        });
      };
    });

    // Simular 3G lento → caída → reconexión (dispara flush inmediato).
    await context.setOffline(true);
    await page.waitForTimeout(1000);
    await context.setOffline(false);

    // El flush loop corre cada 5 min por defecto; el evento 'online' debe
    // dispararlo inmediatamente (SyncManager.setupNetworkListeners).
    await expect.poll(() => batchReceived, { timeout: 20_000 }).not.toBeNull();

    expect(batchReceived!.method).toBe("POST");
    const body = batchReceived!.body as { deviceId: string; videoId: string }[];
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(2);
    expect(batchReceived!.headers["x-device-id"]).toBeDefined();

    // La cola local debe quedar vacía tras un batch exitoso.
    const remaining = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        const open = indexedDB.open("tad_playback_queue", 1);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction("events", "readonly");
          const count = tx.objectStore("events").count();
          count.onsuccess = () => resolve(count.result);
        };
        open.onerror = () => resolve(-1);
      });
    });
    expect(remaining).toBe(0);
  });
});
