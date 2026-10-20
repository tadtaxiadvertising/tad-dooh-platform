/**
 * ============================================================
 *  ADMIN DASHBOARD — AUTENTICACIÓN & AUTORIZACIÓN
 * ============================================================
 * Tests para el flujo de login, protección de rutas y persistencia de sesión.
 */
import { test, expect, Page } from "@playwright/test";

// ──────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────
async function loginAsAdmin(
  page: Page,
  email = "admin@tad.do",
  password = "TadAdmin2026!",
) {
  await page.goto("/login");
  await page.waitForSelector('button[type="submit"]', {
    state: "visible",
    timeout: 15_000,
  });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/(dashboard|fleet|campaigns|finance)/, {
    timeout: 25_000,
  });
}

// ──────────────────────────────────────────────────────────────────
// TESTS
// ──────────────────────────────────────────────────────────────────
test.describe("Admin Dashboard — Autenticación", () => {
  test("Login exitoso con credenciales válidas", async ({ page }) => {
    const hydrationErrors: string[] = [];
    page.on("console", (msg) => {
      if (
        msg.type() === "error" &&
        (msg.text().includes("Hydration") || msg.text().includes("hydrat"))
      ) {
        hydrationErrors.push(msg.text());
      }
    });

    await loginAsAdmin(page);

    expect(
      hydrationErrors.length,
      `Hydration errors: ${hydrationErrors.join(", ")}`,
    ).toBe(0);
  });

  test("Login fallido muestra mensaje de error", async ({ page }) => {
    await page.goto("/login");
    await page.waitForSelector('button[type="submit"]', { state: "visible" });
    await page.fill('input[type="email"]', "wrong@tad.do");
    await page.fill('input[type="password"]', "WrongPass123!");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    expect(page.url()).toContain("/login");

    const errorMsg = page
      .locator(
        '[role="alert"], .toast-error, [data-testid="login-error"], .text-red, .text-destructive',
      )
      .first();
    const errorVisible = (await errorMsg.count()) > 0;
    expect(errorVisible, "Debe mostrar mensaje de error al fallar login").toBe(
      true,
    );
  });

  test("Sesión persiste tras refresh (F5)", async ({ page }) => {
    await loginAsAdmin(page);
    const urlAfterLogin = page.url();
    await page.reload({ waitUntil: "networkidle" });
    const urlAfterRefresh = page.url();
    const redirectedToLogin = urlAfterRefresh.includes("/login");
    expect(redirectedToLogin, "La sesión no debe perderse al refrescar").toBe(
      false,
    );
  });

  test("Login escribe cookie canónica @supabase/ssr (sb-<ref>-auth-token)", async ({
    page,
  }) => {
    // REGRESIÓN: tras autenticarse, el middleware SSR debe poder leer una
    // sesión server-side (getUser). Sin esta cookie, createServerClient no
    // puede validar/refrescar la sesión y el flujo rompe tras F5
    // (el "entra 1 segundo y lo expulsan" reportado).
    await loginAsAdmin(page);
    const cookies = await page.context().cookies();
    const ssrCookie = cookies.find((c) => /^sb-.+-auth-token$/.test(c.name));
    expect(
      ssrCookie,
      "Debe existir la cookie sb-<ref>-auth-token",
    ).toBeTruthy();
    expect(
      ssrCookie!.value.length,
      "La cookie canónica no puede estar vacía",
    ).toBeGreaterThan(10);

    // El token dentro de la cookie debe traer el rol ADMIN (claims role-bearing)
    const raw = Buffer.from(
      ssrCookie!.value.replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    ).toString("utf-8");
    const sessionDoc = JSON.parse(raw);
    const claims = JSON.parse(
      Buffer.from(sessionDoc.access_token.split(".")[1], "base64url").toString(
        "utf-8",
      ),
    );
    const role = claims?.app_metadata?.role || claims?.role || "GUEST";
    expect(
      role,
      "El access_token de la cookie debe ser role-bearing (ADMIN)",
    ).toBe("ADMIN");
  });

  test("Rutas protegidas redirigen a /login sin sesión", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});

test.describe("Admin Dashboard — Navegación y Layout", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("Dashboard principal carga correctamente", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page.locator('h1, [data-testid="dashboard-title"]'),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("Navegación a Fleet Management funciona", async ({ page }) => {
    await page.goto("/fleet");
    await expect(page.locator('h1, [data-testid="fleet-title"]')).toBeVisible({
      timeout: 15_000,
    });
  });

  test("Navegación a Campañas funciona", async ({ page }) => {
    await page.goto("/campaigns");
    await expect(
      page.locator('h1, [data-testid="campaigns-title"]'),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("Navegación a Finanzas funciona", async ({ page }) => {
    await page.goto("/finance");
    await expect(page.locator('h1, [data-testid="finance-title"]')).toBeVisible(
      { timeout: 15_000 },
    );
  });

  test("Navegación a Analytics funciona", async ({ page }) => {
    await page.goto("/analytics");
    await expect(
      page.locator('h1, [data-testid="analytics-title"]'),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("Navegación a Dispositivos funciona", async ({ page }) => {
    await page.goto("/devices");
    await expect(page.locator('h1, [data-testid="devices-title"]')).toBeVisible(
      { timeout: 15_000 },
    );
  });

  test("Navegación a Conductores funciona", async ({ page }) => {
    await page.goto("/drivers");
    await expect(page.locator('h1, [data-testid="drivers-title"]')).toBeVisible(
      { timeout: 15_000 },
    );
  });

  test("Navegación a Media Library funciona", async ({ page }) => {
    await page.goto("/media");
    await expect(page.locator('h1, [data-testid="media-title"]')).toBeVisible({
      timeout: 15_000,
    });
  });

  test("Navegación a Settings funciona", async ({ page }) => {
    await page.goto("/settings");
    await expect(
      page.locator('h1, [data-testid="settings-title"]'),
    ).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Admin Dashboard — Branding TAD Yellow", () => {
  test("Color TAD Yellow (#FFD400) presente en elementos clave", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.waitForSelector("body", { state: "visible" });

    const tadYellowElements = await page.evaluate(() => {
      const elements = document.querySelectorAll("*");
      const yellow: string[] = [];
      elements.forEach((el) => {
        const bg = window.getComputedStyle(el).backgroundColor;
        const color = window.getComputedStyle(el).color;
        const isYellow = (c: string) =>
          c.includes("255, 212") || // #FFD400
          c.includes("250, 212"); // #FAD400

        if ((isYellow(bg) || isYellow(color)) && el.textContent?.trim()) {
          yellow.push(
            `${el.tagName}.${el.className.split(" ")[0]}: ${bg || color}`,
          );
        }
      });
      return [...new Set(yellow)].slice(0, 10);
    });

    expect(
      tadYellowElements.length,
      "No se encontraron elementos con TAD Yellow",
    ).toBeGreaterThan(0);
  });
});
