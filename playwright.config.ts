/**
 * TAD DOOH Platform — Root Playwright Configuration
 * =================================================
 * Configuración a nivel de monorepo para tests cross-service:
 *  - API Contract Tests (API ↔ Frontends)
 *  - End-to-End Flows (Admin → Player → Advertiser)
 *  - Multi-device testing (Desktop, Tablet, Mobile)
 *  - CI/CD Integration
 */
import { defineConfig, devices } from '@playwright/test';

// URLs de los servicios (configurables via env vars)
const ADMIN_URL = process.env.ADMIN_URL || 'http://localhost:3002';
const ADVERTISER_URL = process.env.ADVERTISER_URL || 'http://localhost:3003';
const PLAYER_URL = process.env.PLAYER_URL || 'http://localhost:5173';
const DRIVER_URL = process.env.DRIVER_URL || 'http://localhost:3004';
const API_URL = process.env.API_URL || 'http://localhost:3001';

export default defineConfig({
  // Directorio raíz con todos los spec files cross-service
  testDir: './tests/e2e',

  // Ejecución secuencial para tests cross-service
  fullyParallel: false,

  // Falla si hay test.only accidentales en CI
  forbidOnly: !!process.env.CI,

  // Reintenta 2 veces en CI
  retries: 2,

  // 1 worker en CI
  workers: 1,

  timeout: 180_000,
  expect: {
    timeout: 30_000,
  },

  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
  ],

  use: {
    // Captura de traza
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    ignoreHTTPSErrors: true,
  },

  projects: [
    // ─── Cross-Service: Admin Desktop ─────────────────────────────────
    {
      name: 'cross-admin-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        baseURL: ADMIN_URL,
      },
    },

    // ─── Cross-Service: Advertiser Mobile ─────────────────────────────
    {
      name: 'cross-advertiser-mobile',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 393, height: 851 },
        isMobile: true,
        hasTouch: true,
        baseURL: ADVERTISER_URL,
      },
    },

    // ─── Cross-Service: Player Android Kiosk ──────────────────────────
    {
      name: 'cross-player-kiosk',
      use: {
        viewport: { width: 1280, height: 800 },
        isMobile: true,
        hasTouch: true,
        userAgent:
          'Mozilla/5.0 (Linux; Android 13; Generic Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 FullyKiosk/3.0',
        baseURL: PLAYER_URL,
      },
    },

    // ─── Cross-Service: Driver Tablet ─────────────────────────────────
    {
      name: 'cross-driver-tablet',
      use: {
        viewport: { width: 1280, height: 800 },
        isMobile: true,
        hasTouch: true,
        userAgent:
          'Mozilla/5.0 (Linux; Android 13; Generic Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 FullyKiosk/3.0',
        baseURL: DRIVER_URL,
      },
    },

    // ─── API Contract Testing ─────────────────────────────────────────
    {
      name: 'api-contract',
      use: {
        baseURL: API_URL,
        // No navegador, solo API requests
      },
      testMatch: '**/api-contract/**/*.spec.ts',
    },
  ],

  // NO levanta webServer aquí - cada servicio tiene su propio config
  // Para tests cross-service, usar docker-compose o servicios ya levantados
});