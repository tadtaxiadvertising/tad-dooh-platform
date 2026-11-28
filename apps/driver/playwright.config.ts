/**
 * TAD DOOH Platform — Playwright Configuration
 * =============================================
 * Optimizado para:
 *  - Tablets Android (FullyKiosk, 1280×800, Landscape)
 *  - Entornos con conectividad inestable (3G, offline-first)
 *  - CI/CD en VPS con recursos limitados (Easypanel)
 */
import { defineConfig } from "@playwright/test";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3004";

export default defineConfig({
  // Directorio raíz con todos los spec files
  testDir: "./tests/e2e",

  // Ejecución secuencial
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

  // ELIMINADO: el webServer se omite porque el servidor ya está en ejecución
  // (production start), no dev. El baseURL apunta al servidor real.
  // webServer: { ... },

  reporter: [
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["list"],
  ],

  use: {
    baseURL: BASE_URL,

    // Captura de traza
    trace: "on-first-retry",

    // Capturas de pantalla sólo en fallo
    screenshot: "only-on-failure",

    // Video en fallo
    video: "retain-on-failure",

    // Timeout extendido para redes 3G
    actionTimeout: 30_000,
    navigationTimeout: 45_000,

    // Entorno tablet Android FullyKiosk (imagen real del dispositivo)
    viewport: { width: 1280, height: 800 },
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (Linux; Android 13; Generic Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 FullyKiosk/3.0",

    // Permisos necesarios para GPS y notificaciones
    permissions: ["geolocation"],
    geolocation: { latitude: 18.4861, longitude: -69.9312 },
    locale: "es-DO",
    timezoneId: "America/Santo_Domingo",

    // Ignora errores de cert en entorno dev/staging
    ignoreHTTPSErrors: true,
  },
});
