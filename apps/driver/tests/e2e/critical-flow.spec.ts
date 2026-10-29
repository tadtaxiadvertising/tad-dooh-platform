import { test, expect } from "@playwright/test";
import { getAdminCredentials } from "./helpers/auth.helper";

const hasAdminCredentials = Boolean(
  process.env.TEST_ADMIN_EMAIL?.trim() &&
    process.env.TEST_ADMIN_PASSWORD?.trim(),
);

/**
 * TAD CRITICAL FLOW TEST
 * Objetivo: Validar acceso admin y lógica de suscripción (RD$6,000).
 */

test.describe("TAD Platform - Critical Path", () => {
  test.beforeEach(async ({ page }) => {
    // 1. Acceso a la URL (Basada en config de Easypanel/Local)
    await page.goto("http://localhost:3002"); // Assuming local dev port from package.json
  });

  test("Debe permitir login de admin y mostrar el Dashboard", async ({
    page,
  }) => {
    test.skip(!hasAdminCredentials, "Configure isolated admin E2E credentials.");
    const credentials = getAdminCredentials();
    await page.fill('input[type="email"]', credentials.email);
    await page.fill('input[type="password"]', credentials.password);
    await page.click('button:has-text("Entrar")');

    // Validar que entramos al dashboard (buscamos el spotlight o mapa)
    await expect(page).toHaveURL(/.*dashboard/);
    const welcomeHeader = page.locator("h1");
    await expect(welcomeHeader).toContainText("Panel de Control");
  });

  test("Debe aplicar Kill-Switch si el backend devuelve 402 (Manejo de Morosidad)", async ({
    page,
  }) => {
    test.skip(!hasAdminCredentials, "Configure isolated admin E2E credentials.");
    const credentials = getAdminCredentials();
    await page.fill('input[type="email"]', credentials.email);
    await page.fill('input[type="password"]', credentials.password);
    await page.click('button:has-text("Entrar")');

    // Interceptamos la llamada de tracking para simular falta de pago (RD$6k)
    await page.route("**/fleet/tracking/summary", (route) => {
      route.fulfill({
        status: 402,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Payment Required",
          message: "Suscripción de RD$6,000 pendiente",
        }),
      });
    });

    // Forzamos una acción que dispare el tracking (ej. entrar a la ficha de un taxi o ver el resumen)
    await page.goto("http://localhost:3002/fleet");

    // Verificamos que aparezca el overlay de bloqueo o aviso de pago
    const lockOverlay = page.locator(".payment-lock-overlay");
    await expect(lockOverlay).toBeVisible();
    await expect(lockOverlay).toContainText("Pendiente");
  });

  test("UI debe respetar el Branding (TAD Yellow)", async ({ page }) => {
    await page.goto("http://localhost:3002/login");
    const loginButton = page.locator('button[type="submit"]');

    // Verificamos que el color de Tailwind sea el correcto (#fad400)
    const bgColor = await loginButton.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor,
    );
    // rgb(250, 212, 0) es #fad400
    expect(bgColor).toBe("rgb(250, 212, 0)");
  });
});
