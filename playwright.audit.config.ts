import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: /e2e-autonomous-audit\.spec\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 30_000 },
  reporter: [['list']],
  use: {
    ignoreHTTPSErrors: true,
    viewport: { width: 1600, height: 1000 },
    hasTouch: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 30_000,
    navigationTimeout: 90_000,
  },
});
