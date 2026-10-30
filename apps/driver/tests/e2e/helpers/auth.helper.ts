/**
 * TAD Auth Helper
 * Centraliza la lógica de login para reutilizar en todos los specs.
 * Evita repetir código de autenticación y gestiona el almacenamiento del estado de sesión.
 */
import { Page, expect } from "@playwright/test";

type TestCredentials = Readonly<{
  email: string;
  password: string;
}>;

function requireCredential(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      "Missing " +
        name +
        ". Configure E2E credentials in the test environment; " +
        "credentials must never be committed to source control.",
    );
  }
  return value;
}

export function getAdminCredentials(): TestCredentials {
  return {
    email: requireCredential("TEST_ADMIN_EMAIL"),
    password: requireCredential("TEST_ADMIN_PASSWORD"),
  };
}

export function getDriverCredentials(): TestCredentials {
  return {
    email: requireCredential("TEST_DRIVER_EMAIL"),
    password: requireCredential("TEST_DRIVER_PASSWORD"),
  };
}

/**
 * Realiza login completo en la plataforma web TAD y espera
 * a que el dashboard esté completamente hidratado.
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  const credentials = getAdminCredentials();
  await page.goto("/login");

  // Esperamos a que el formulario esté listo (evita race conditions de hidratación Next.js 15)
  await page.waitForSelector('input[type="email"]', {
    state: "visible",
    timeout: 15_000,
  });

  await page.fill('input[type="email"]', credentials.email);
  await page.fill('input[type="password"]', credentials.password);

  // Esperamos a que el botón NO esté deshabilitado (puede estar disabled durante hydration)
  await page.waitForSelector('button[type="submit"]:not([disabled])', {
    timeout: 10_000,
  });
  await page.click('button[type="submit"]');

  // Verificamos redirección al dashboard
  await expect(page).toHaveURL(/\/(dashboard|fleet|campaigns)/, {
    timeout: 20_000,
  });

  // Esperamos a que el contenido principal se renderice (no solo el skeleton loader)
  await page.waitForSelector('[data-testid="dashboard-ready"], h1', {
    state: "visible",
    timeout: 20_000,
  });
}

/**
 * Inyecta tokens de Supabase directamente en localStorage para evitar
 * el flujo de login completo en pruebas donde el auth no es el foco.
 * IMPORTANTE: Requiere tokens efímeros de un entorno de pruebas aislado.
 */
export async function injectSupabaseSession(page: Page): Promise<void> {
  const credentials = getAdminCredentials();
  const mockSession = {
    access_token: requireCredential("TEST_ACCESS_TOKEN"),
    refresh_token: requireCredential("TEST_REFRESH_TOKEN"),
    expires_in: 3600,
    token_type: "bearer",
    user: {
      id: "test-user-uuid",
      email: credentials.email,
      role: "admin",
    },
  };

  await page.goto("/");
  await page.evaluate((session) => {
    const projectRef = "sbp_tad_dooh";
    localStorage.setItem(
      `sb-${projectRef}-auth-token`,
      JSON.stringify(session),
    );
  }, mockSession);
}
