/**
 * TAD Auth Helper
 * Centraliza la lógica de login para reutilizar en todos los specs.
 * Evita repetir código de autenticación y gestiona el almacenamiento del estado de sesión.
 */
import { Page, expect } from '@playwright/test';

export const TEST_CREDENTIALS = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@tad.do',
    password: process.env.TEST_ADMIN_PASSWORD || 'TadAdmin2026!',
  },
  driver: {
    email: process.env.TEST_DRIVER_EMAIL || 'driver@tad.do',
    password: process.env.TEST_DRIVER_PASSWORD || 'TadDriver2026!',
  },
};

/**
 * Realiza login completo en la plataforma web TAD y espera
 * a que el dashboard esté completamente hidratado.
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');

  // Esperamos a que el formulario esté listo (evita race conditions de hidratación Next.js 15)
  await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 15_000 });

  await page.fill('input[type="email"]', TEST_CREDENTIALS.admin.email);
  await page.fill('input[type="password"]', TEST_CREDENTIALS.admin.password);

  // Esperamos a que el botón NO esté deshabilitado (puede estar disabled durante hydration)
  await page.waitForSelector('button[type="submit"]:not([disabled])', { timeout: 10_000 });
  await page.click('button[type="submit"]');

  // Verificamos redirección al dashboard
  await expect(page).toHaveURL(/\/(dashboard|fleet|campaigns)/, { timeout: 20_000 });

  // Esperamos a que el contenido principal se renderice (no solo el skeleton loader)
  await page.waitForSelector('[data-testid="dashboard-ready"], h1', {
    state: 'visible',
    timeout: 20_000,
  });
}

/**
 * Inyecta tokens de Supabase directamente en localStorage para evitar
 * el flujo de login completo en pruebas donde el auth no es el foco.
 * IMPORTANTE: Requiere tener SUPABASE_TEST_TOKEN en env o usar un token estático de entorno dev.
 */
export async function injectSupabaseSession(page: Page): Promise<void> {
  const mockSession = {
    access_token: process.env.TEST_ACCESS_TOKEN || 'mock-jwt-token-for-dev',
    refresh_token: process.env.TEST_REFRESH_TOKEN || 'mock-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: 'test-user-uuid',
      email: TEST_CREDENTIALS.admin.email,
      role: 'admin',
    },
  };

  await page.goto('/');
  await page.evaluate((session) => {
    const projectRef = 'sbp_tad_dooh';
    localStorage.setItem(
      `sb-${projectRef}-auth-token`,
      JSON.stringify(session)
    );
  }, mockSession);
}
