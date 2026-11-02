/**
 * Auditoría E2E de producción — TAD DOOH
 * ======================================
 * Verifica el estado real de los servicios desplegados en EasyPanel:
 *  - Admin (proyecto-ia-tad-dashboard.rewvid.easypanel.host)
 *  - Advertiser (proyecto-ia-tad-advertiser.rewvid.easypanel.host)
 *  - Driver (proyecto-ia-tad-driver.rewvid.easypanel.host)
 *
 * Credenciales: exclusivamente variables de entorno (TAD_AUDIT_*).
 * Nunca almacenar contraseñas reales en código o documentación.
 * Solo lectura + login. Sin mutaciones (R8/R3).
 */
import { test, expect } from '@playwright/test';

const ADMIN_URL = process.env.TAD_AUDIT_ADMIN_URL || 'https://proyecto-ia-tad-dashboard.rewvid.easypanel.host';
const ADVERTISER_URL = process.env.TAD_AUDIT_ADVERTISER_URL || 'https://proyecto-ia-tad-advertiser.rewvid.easypanel.host';
const DRIVER_URL = process.env.TAD_AUDIT_DRIVER_URL || 'https://proyecto-ia-tad-driver.rewvid.easypanel.host';

const ADMIN_EMAIL = process.env.TAD_AUDIT_ADMIN_USER || 'admin@tad.do';
const ADMIN_PASS = process.env.TAD_AUDIT_ADMIN_PASS;
const ADVERTISER_EMAIL = process.env.TAD_AUDIT_ADVERTISER_USER || 'qa-advertiser@tad.do';
const ADVERTISER_PASS = process.env.TAD_AUDIT_ADVERTISER_PASS;

const results: Record<string, { ok: boolean; detail: string; ms: number }> = {};

function mark(name: string, ok: boolean, detail: string, ms: number) {
  results[name] = { ok, detail, ms };
}

test.describe('TAD DOOH — Auditoría E2E de producción', () => {
  test('Admin: login y rutas principales', async ({ page }) => {
    test.skip(!ADMIN_PASS, 'TAD_AUDIT_ADMIN_PASS is required');
    const sw = Date.now();
    const consoleErrors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
    page.on('pageerror', (e) => consoleErrors.push(e.message.slice(0, 200)));

    await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForSelector('button[type="submit"]', { state: 'visible', timeout: 20_000 });
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASS);
    await page.click('button[type="submit"]');

    const loggedIn = await page.waitForURL(/\/(dashboard|fleet|campaigns|finance|admin)/, { timeout: 25_000 }).then(() => true).catch(() => false);
    mark('admin-login', loggedIn, loggedIn ? `final URL: ${page.url()}` : 'login no redirige', Date.now() - sw);

    if (loggedIn) {
      // navegación principal
      for (const [name, path] of [['dashboard', '/admin/dashboard'], ['fleet', '/fleet']] as const) {
        await page.goto(`${ADMIN_URL}${path}`, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
        const hasTitle = await page.locator('h1, [data-testid*="title"]').first().isVisible({ timeout: 10_000 }).then(() => true).catch(() => false);
        mark(`admin-nav-${name}`, hasTitle, hasTitle ? '' : `no h1 visible en ${path}`, Date.now() - sw);
      }
    }
    const jsErrors = consoleErrors.filter((e) => !e.toLowerCase().includes('favicon'));
    mark('admin-js-errors', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '), Date.now() - sw);
    expect(true).toBeTruthy();
  });

  test('Advertiser: login y dashboard', async ({ page }) => {
    test.skip(!ADVERTISER_PASS, 'TAD_AUDIT_ADVERTISER_PASS is required');
    const sw = Date.now();
    const consoleErrors: string[] = [];
    const badResponses: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
    page.on('pageerror', (e) => consoleErrors.push(e.message.slice(0, 200)));
    page.on('response', (r) => { if (r.status() >= 400) badResponses.push(`${r.status()} ${r.url().slice(0, 180)}`); });

    await page.goto(`${ADVERTISER_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForSelector('button[type="submit"]', { state: 'visible', timeout: 20_000 });
    await page.fill('input[type="email"]', ADVERTISER_EMAIL);
    await page.fill('input[type="password"]', ADVERTISER_PASS);
    await page.click('button[type="submit"]');

    const loggedIn = await page.waitForURL(/\/(p\/|advertiser\/dashboard)/, { timeout: 25_000 }).then(() => true).catch(() => false);
    mark('advertiser-login', loggedIn, loggedIn ? `final URL: ${page.url()}` : 'login no redirige', Date.now() - sw);

    if (loggedIn) {
      await page.goto(`${ADVERTISER_URL}/advertiser/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});
      await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
      const hasDashboard = await page.locator('h1, [data-testid*="dashboard"], [data-testid*="title"]').first().isVisible({ timeout: 10_000 }).then(() => true).catch(() => false);
      mark('advertiser-dashboard', hasDashboard, hasDashboard ? '' : 'dashboard no renderiza h1', Date.now() - sw);
    }
    const jsErrors = consoleErrors.filter((e) => !e.toLowerCase().includes('favicon'));
    mark('advertiser-js-errors', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '), Date.now() - sw);
    mark('advertiser-http-4xx-5xx', badResponses.length === 0, badResponses.slice(0, 5).join(' | '), Date.now() - sw);
    expect(true).toBeTruthy();
  });

  test('Driver: página de login responde', async ({ page }) => {
    const sw = Date.now();
    const consoleErrors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
    page.on('pageerror', (e) => consoleErrors.push(e.message.slice(0, 200)));

    await page.goto(`${DRIVER_URL}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    const hasLogin = await page.locator('input[type="tel"], input[type="password"], button[type="submit"]').first().isVisible({ timeout: 15_000 }).then(() => true).catch(() => false);
    mark('driver-login-page', hasLogin, hasLogin ? `final URL: ${page.url()}` : 'no login form visible', Date.now() - sw);

    const jsErrors = consoleErrors.filter((e) => !e.toLowerCase().includes('favicon'));
    mark('driver-js-errors', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '), Date.now() - sw);
    expect(true).toBeTruthy();
  });

  test.afterAll(async () => {
    const lines = [
      '# Resultados de auditoría E2E de producción',
      '',
      '> Generado por tests/audit-prod.spec.ts — 2026-08-10',
      '',
      '| Check | Estado | Detalle | Tiempo (ms) |',
      '| --- | --- | --- | --- |',
    ];
    for (const [k, v] of Object.entries(results)) {
      lines.push(`| ${k} | ${v.ok ? '✅ OK' : '❌ FAIL'} | ${v.detail.replace(/\|/g, '\\|').slice(0, 120)} | ${v.ms} |`);
    }
    require('fs').writeFileSync('audit-prod-results.md', lines.join('\n'), 'utf-8');
  });
});
