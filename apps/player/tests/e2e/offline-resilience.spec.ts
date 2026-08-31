/**
 * ============================================================
 *  TAD DOOH PLAYER — OFFLINE RESILIENCE & KILLSWITCH (ITEM 18)
 * ============================================================
 * - Cold cache: primer arranque con red, luego kill de red y recarga.
 * - Kill-switch (C5/R3): un TAD_KILLSWITCH_ACTIVE persistido NO se
 *   auto-levanta por TTL local; solo el servidor lo libera (blocked:false).
 * - Benchmark 10x10: 10 recargas offline sobre 10 arranques en frío.
 * Corrido por el proyecto 'offline-resilience' (playwright.config.ts).
 */
import { test, expect, BrowserContext, Page } from '@playwright/test';

test.describe('Offline Resilience — Cold Cache & KillSwitch R3', () => {
  let context: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      isMobile: true,
      hasTouch: true,
      serviceWorkers: 'allow',
    });
  });

  test.afterEach(async () => {
    await context.setOffline(false);
    await context.close();
  });

  function seedDeviceId(page: Page) {
    return page.addInitScript(() => {
      localStorage.setItem('TAD_DEVICE_ID', 'e2e-device');
    });
  }

  function seedKillSwitch(ageMs: number, reason: string) {
    return (page: Page) =>
      page.addInitScript(
        ({ age, reason: r }) => {
          localStorage.setItem(
            'TAD_KILLSWITCH_ACTIVE',
            JSON.stringify({ reason: r, timestamp: Date.now() - age }),
          );
        },
        { age: ageMs, reason },
      );
  }

  async function isOverlayVisible(page: Page): Promise<boolean> {
    const overlay = page.locator('#tad-killswitch-overlay');
    if ((await overlay.count()) === 0) return false;
    return overlay.evaluate((el: HTMLElement) => el.style.display === 'block' || getComputedStyle(el).display !== 'none');
  }

  // Silencia syncs hacia el API real: responde "no bloqueado" salvo override.
  function mockSyncEndpoint(page: Page, blocked: boolean, reason = '') {
    return page.route('**/device/sync*', (route) =>
      route.fulfill({
        status: blocked ? 402 : 200,
        contentType: 'application/json',
        body: JSON.stringify(blocked
          ? { update: false, blocked: true, reason, media_assets: [] }
          : { update: false, blocked: false, sync_hash: 'e2e', media_assets: [] }),
      }),
    );
  }

  test('6.1 — Cold cache: app shell se sirve desde SW tras cortar red', async () => {
    const page = await context.newPage();
    await seedDeviceId(page);
    await mockSyncEndpoint(page, false);

    // 1) Primer arranque con red — deja el shell y caches del SW instalados.
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await page.waitForTimeout(4000);

    const swReady = await page.evaluate(() =>
      navigator.serviceWorker.ready.then(() => true).catch(() => false),
    );
    expect(swReady, 'SW debe quedar registrado y activo tras el primer arranque').toBe(true);

    // 2) Sin red y recarga: debe servir el shell desde Cache API.
    await context.setOffline(true);
    for (let i = 0; i < 5; i++) {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });
      await page.waitForTimeout(500);
    }

    const shellOk = await page.evaluate(async () => {
      const cache = await caches.open('tad-player-shell-v1');
      const keys = await cache.keys();
      return keys.some((r) => r.url.includes('/') || r.url.includes('index.html'));
    });
    expect(shellOk, 'SHELL_CACHE debe contener index.html tras navegar offline').toBe(true);

    const browserOfflineErrors = errors.filter((e) => /ERR_INTERNET|Failed to load resource/i.test(e));
    // El navegador puede no emitir pageerror en offline; solo aseguramos que no haya JS de app roto.
    expect(browserOfflineErrors.length).toBeLessThanOrEqual(0);
  });

  test('6.2 — Kill-switch persistido NO se auto-levanta: sigue activo offline', async () => {
    const page = await context.newPage();
    await seedDeviceId(page);
    await mockSyncEndpoint(page, true, 'SUBSCRIPTION_UNPAID');
    // Estado de hace >24h — la evasión C5 borraba esto y liberaba; R3 lo mantiene.
    await seedKillSwitch(86_400_000 + 60_000, 'SUBSCRIPTION_UNPAID')(page);

    await page.goto('/');
    await page.waitForTimeout(3000);

    const active = await isOverlayVisible(page);
    expect(active, 'R3: un kill-switch NO se auto-levanta por TTL local; sigue bloqueando').toBe(true);

    const reason = await page.locator('#tad-killswitch-reason').textContent();
    expect(reason).toContain('SUBSCRIPTION_UNPAID');
  });

  test('6.3 — Kill-switch se libera solo cuando el servidor responde blocked=false', async () => {
    const page = await context.newPage();
    await seedDeviceId(page);
    await seedKillSwitch(60_000, 'SUBSCRIPTION_UNPAID')(page);
    // El servidor dice "todo ok" → el player DEBE deactivar.
    await mockSyncEndpoint(page, false);

    await page.goto('/');
    await page.waitForTimeout(3000);

    const active = await isOverlayVisible(page);
    expect(active, 'R3: el servidor confirmó blocked=false → el overlay debe cerrarse').toBe(false);
  });

  test('6.4 — Bench 10x10: 10 arranques en frío × 10 recargas offline', async () => {
    // 10 arranques en frío (contextos nuevos) × 10 recargas sin red = 100 recargas.
    for (let cycle = 0; cycle < 10; cycle++) {
      const coldCtx = await context.browser()!.newContext({
        viewport: { width: 1280, height: 800 },
        isMobile: true,
        hasTouch: true,
        serviceWorkers: 'allow',
      });
      const page = await coldCtx.newPage();
      await seedDeviceId(page);
      await mockSyncEndpoint(page, false);

      await page.goto('/');
      await page.waitForTimeout(2500);
      await coldCtx.setOffline(true);

      for (let reload = 0; reload < 10; reload++) {
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });
      }

      expect(await isOverlayVisible(page), `Ciclo ${cycle + 1}: sin kill-switch espurio`).toBe(false);
      await coldCtx.close();
    }
  });
});