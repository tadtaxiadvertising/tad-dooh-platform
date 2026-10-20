/**
 * TAD Advertiser Portal — Playwright Configuration
 * ================================================
 * Optimizado para:
 *  - Mobile Chrome (Portal de anunciantes en móviles)
 *  - Desktop Chrome (Dashboard del anunciante)
 *  - CI/CD en VPS con recursos limitados (Easypanel)
 */
import { defineConfig, devices } from "@playwright/test";

const BASE_URL =
  process.env.NEXT_PUBLIC_ADVERTISER_URL || "http://localhost:3003";

export default defineConfig({
  // Directorio raíz con todos los spec files
  testDir: "./tests/e2e",

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
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["list"],
  ],

  use: {
    baseURL: BASE_URL,

    // Captura de traza: muy útil para depurar fallos
    trace: "on-first-retry",

    // Capturas de pantalla sólo en fallo
    screenshot: "only-on-failure",

    // Video en fallo
    video: "retain-on-failure",

    // Timeout extendido
    actionTimeout: 30_000,
    navigationTimeout: 60_000,

    // Mobile First (Anunciantes usan móviles)
    viewport: { width: 393, height: 851 },
    isMobile: true,
    hasTouch: true,

    // Ignora errores de cert en entorno dev/staging
    ignoreHTTPSErrors: true,
  },

  projects: [
    // ─── Proyecto Principal: Mobile Advertiser ───────────────────────
    {
      name: "advertiser-mobile",
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 393, height: 851 },
        isMobile: true,
        hasTouch: true,
      },
    },

    // ─── Proyecto Desktop Advertiser ────────────────────────────────
    {
      name: "advertiser-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        isMobile: false,
        hasTouch: false,
      },
    },

    // ─── Proyecto Tablet ────────────────────────────────────────────
    {
      name: "tablet",
      use: {
        ...devices["iPad Pro"],
        viewport: { width: 1024, height: 1366 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],

  // Levanta Next.js dev server automáticamente si no está corriendo
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
