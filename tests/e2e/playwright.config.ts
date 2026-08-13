/**
 * TAD DOOH — E2E Playwright Automation v12
 * ========================================
 * Configuración base de pruebas E2E de extremo a extremo contra los tres
 * portales (Admin, Advertiser, Driver).
 *
 * - Los tests se ejecutan contra las URLs desplegadas en la web (EasyPanel),
 *   configurables via variables de entorno (TAD_ADMIN_URL / TAD_ADVERTISER_URL
 *   / TAD_DRIVER_URL). Por defecto apuntan a los servicios remotos.
 * - 1 worker + fullyParallel:false para respetar los límites de conexión del
 *   backend y evitar OOM (contenedores 512MB).
 * - El reporte consolidado e2e-report.md se genera en la raíz del proyecto y
 *   los snapshots en /playwright-report/e2e-snapshots.
 */
import { defineConfig, devices } from '@playwright/test';

export const ENV_URLS = {
  admin: process.env.TAD_ADMIN_URL || 'https://proyecto-ia-tad-dashboard.rewvid.easypanel.host',
  advertiser: process.env.TAD_ADVERTISER_URL || 'https://proyecto-ia-tad-advertiser.rewvid.easypanel.host',
  driver: process.env.TAD_DRIVER_URL || 'https://proyecto-ia-tad-driver.rewvid.easypanel.host',
};

export default defineConfig({
  testDir: './v12',

  // Solo se ejecutan los specs de la suite v12 (se ignora el resto del repo).
  testMatch: /(admin|advertiser|driver)\.spec\.ts/,

  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,

  timeout: 180_000,
  expect: { timeout: 30_000 },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['./v12/lib/report.ts'],
  ],

  // Limpia el estado de reportes de la corrida anterior antes de empezar.
  globalSetup: './v12/lib/global-setup.ts',

  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30_000,
    navigationTimeout: 90_000,
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'admin',
      testMatch: /admin\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        baseURL: ENV_URLS.admin,
      },
    },
    {
      name: 'advertiser',
      testMatch: /advertiser\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        baseURL: ENV_URLS.advertiser,
      },
    },
    {
      name: 'driver',
      testMatch: /driver\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        hasTouch: true,
        baseURL: ENV_URLS.driver,
      },
    },
  ],
});
