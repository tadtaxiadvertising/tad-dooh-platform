/**
 * TAD DOOH Platform — Playwright Configuration
 * =============================================
 * Optimizado para:
 *  - Tablets Android (FullyKiosk, 1280×800, Landscape)
 *  - Entornos con conectividad inestable (3G, offline-first)
 *  - CI/CD en VPS con recursos limitados (Easypanel)
 */
import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002';

export default defineConfig({
  // Directorio raíz con todos los spec files
  testDir: './tests/e2e',

  // Ejecución secuencial: evita saturar el VPS durante CI
  fullyParallel: false,

  // Falla si hay test.only accidentales en CI
  forbidOnly: !!process.env.CI,

  // Reintenta 2 veces en CI para absorber fallos de red transitoria
  retries: 2,

  // 1 worker en CI, libre en local
  workers: 1,

  timeout: 120_000,
  expect: {
    timeout: 30_000,
  },

  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],

  use: {
    baseURL: BASE_URL,

    // Captura de traza: muy útil para depurar fallos de red/Service Worker
    trace: 'on-first-retry',

    // Capturas de pantalla sólo en fallo
    screenshot: 'only-on-failure',

    // Video en fallo (crítico para depurar comportamiento en kiosco sin acceso físico)
    video: 'retain-on-failure',

    // Timeout extendido: redes 3G pueden ser lentas al cargar el SW
    actionTimeout: 30_000,
    navigationTimeout: 60_000,

    // Simula exactamente el entorno de FullyKiosk en Android 13
    viewport: { width: 1280, height: 800 },
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (Linux; Android 13; Generic Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 FullyKiosk/3.0',

    // Permisos necesarios para GPS y notificaciones
    permissions: ['geolocation'],
    geolocation: { latitude: 18.4861, longitude: -69.9312 }, // Santo Domingo, RD
    locale: 'es-DO',
    timezoneId: 'America/Santo_Domingo',

    // Ignora errores de cert en entorno dev/staging
    ignoreHTTPSErrors: true,
  },

  projects: [
    // ─── Proyecto Principal: Kiosco Android ────────────────────────────
    {
      name: 'android-kiosk',
      use: {
        viewport: { width: 1280, height: 800 },
        isMobile: true,
        hasTouch: true,
        userAgent:
          'Mozilla/5.0 (Linux; Android 13; Generic Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 FullyKiosk/3.0',
      },
    },

    // ─── Proyecto Desktop Admin (Para el Admin Dashboard) ──────────────
    {
      name: 'admin-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },

    // ─── Proyecto Offline Stress Test ──────────────────────────────────
    // Solo se usa para las pruebas de resiliencia offline
    {
      name: 'offline-resilience',
      use: {
        viewport: { width: 1280, height: 800 },
        isMobile: true,
        hasTouch: true,
        // Timeout extendido porque el SW necesita activarse antes de las pruebas
        actionTimeout: 20_000,
        navigationTimeout: 45_000,
      },
      testMatch: '**/offline-resilience.spec.ts',
    },
  ],

  // Levanta Next.js dev server automáticamente si no está corriendo
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
