/**
 * ============================================================
 *  ADVERTISER PORTAL — AUTENTICACIÓN & CAMPAIGN MANAGEMENT
 * ============================================================
 * Tests para el portal de anunciantes: login, creación de campañas, métricas.
 */
import { test, expect, Page } from "@playwright/test";

// ──────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────
const advertiserEmail = process.env.TEST_ADVERTISER_EMAIL?.trim();
const advertiserPassword = process.env.TEST_ADVERTISER_PASSWORD?.trim();
const hasAdvertiserCredentials = Boolean(
  advertiserEmail && advertiserPassword,
);

async function loginAsAdvertiser(page: Page) {
  if (!advertiserEmail || !advertiserPassword) {
    throw new Error(
      "Missing TEST_ADVERTISER_EMAIL or TEST_ADVERTISER_PASSWORD. " +
        "Configure isolated E2E credentials outside source control.",
    );
  }
  await page.goto("/login");
  await page.waitForSelector('button[type="submit"]', {
    state: "visible",
    timeout: 15_000,
  });
  await page.fill('input[type="email"]', advertiserEmail);
  await page.fill('input[type="password"]', advertiserPassword);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/p\//, { timeout: 25_000 });
}

// ──────────────────────────────────────────────────────────────────
// TESTS
// ──────────────────────────────────────────────────────────────────
test.describe("Advertiser Portal — Autenticación", () => {
  test("Login exitoso redirige al portal de anunciantes", async ({ page }) => {
    test.skip(
      !hasAdvertiserCredentials,
      "Configure isolated advertiser E2E credentials.",
    );
    await loginAsAdvertiser(page);
    await expect(
      page.locator('h1, [data-testid="advertiser-dashboard"]'),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("Login fallido muestra error", async ({ page }) => {
    await page.goto("/login");
    await page.waitForSelector('button[type="submit"]', { state: "visible" });
    await page.fill(
      'input[type="email"]',
      "nobody-" + Date.now() + "@example.invalid",
    );
    await page.fill(
      'input[type="password"]',
      "invalid-" + crypto.randomUUID(),
    );
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    expect(page.url()).toContain("/login");
  });

  test("Rutas protegidas redirigen a login", async ({ page }) => {
    await page.goto("/p/");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});

test.describe("Advertiser Portal — Dashboard", () => {
  test.skip(
    !hasAdvertiserCredentials,
    "Configure isolated advertiser E2E credentials.",
  );

  test.beforeEach(async ({ page }) => {
    await loginAsAdvertiser(page);
  });

  test("Dashboard muestra métricas clave", async ({ page }) => {
    await page.goto("/p/");
    await expect(
      page.locator('h1, [data-testid="dashboard-title"]'),
    ).toBeVisible({ timeout: 15_000 });
    // Verificar tarjetas de métricas
    await expect(
      page.locator('[data-testid="total-impressions"], .metric-card'),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("Navegación a Mis Campañas", async ({ page }) => {
    await page.goto("/p/");
    await page.click('a:has-text("Campañas"), [href*="campaigns"]');
    await expect(
      page.locator('h1, [data-testid="campaigns-title"]'),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("Navegación a Analytics", async ({ page }) => {
    await page.goto("/p/");
    await page.click('a:has-text("Analytics"), [href*="analytics"]');
    await expect(
      page.locator('h1, [data-testid="analytics-title"]'),
    ).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Advertiser Portal — Creación de Campaña", () => {
  test.skip(
    !hasAdvertiserCredentials,
    "Configure isolated advertiser E2E credentials.",
  );

  test.beforeEach(async ({ page }) => {
    await loginAsAdvertiser(page);
  });

  test("Crear nueva campaña - flujo completo", async ({ page }) => {
    await page.goto("/p/campaigns/new");
    await expect(
      page.locator(
        'h1:has-text("Nueva Campaña"), [data-testid="new-campaign-title"]',
      ),
    ).toBeVisible({ timeout: 15_000 });

    // Llenar formulario básico
    await page.fill(
      'input[name="name"], input[placeholder*="nombre"]',
      "Test Campaign " + Date.now(),
    );
    await page.fill(
      'textarea[name="description"], textarea[placeholder*="descripción"]',
      "Campaña de prueba automatizada",
    );

    // Seleccionar fechas
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    await page.fill(
      'input[name="startDate"], input[type="date"]:first-of-type',
      startDate.toISOString().split("T")[0],
    );
    await page.fill(
      'input[name="endDate"], input[type="date"]:last-of-type',
      endDate.toISOString().split("T")[0],
    );

    // Subir creativo (mock)
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: "test-video.mp4",
      mimeType: "video/mp4",
      buffer: Buffer.from("fake video content"),
    });

    // Enviar
    await page.click(
      'button[type="submit"]:has-text("Crear"), button:has-text("Guardar")',
    );

    // Verificar éxito
    await expect(
      page.locator(
        '.toast-success, [role="alert"]:has-text("creada"), text=creada',
      ),
    ).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Advertiser Portal — Responsive Mobile", () => {
  test.skip(
    !hasAdvertiserCredentials,
    "Configure isolated advertiser E2E credentials.",
  );

  test("Portal funciona correctamente en viewport móvil", async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 851 });
    await loginAsAdvertiser(page);
    await page.goto("/p/");
    await expect(page.locator("h1")).toBeVisible({ timeout: 15_000 });

    // Verificar que no hay scroll horizontal
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(393 + 5);
  });
});
