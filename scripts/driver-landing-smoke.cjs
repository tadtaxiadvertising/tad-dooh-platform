#!/usr/bin/env node
'use strict';

// Read-only local smoke. Does not start servers or navigate into login/registration.
// DRIVER_LANDING_BASE_URL=http://127.0.0.1:3004 node scripts/driver-landing-smoke.cjs
// Optional DRIVER_LANDING_SCREENSHOT_DIR must be an absolute path outside this repo.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
const results = [];

function localUrl(raw) {
  assert.ok(raw, 'Set DRIVER_LANDING_BASE_URL explicitly.');
  const url = new URL(raw);
  assert.ok(['http:', 'https:'].includes(url.protocol) && LOOPBACK.has(url.hostname),
    'DRIVER_LANDING_BASE_URL must be HTTP(S) loopback.');
  assert.ok(!url.username && !url.password, 'URL credentials are forbidden.');
  assert.equal(url.pathname, '/', 'Use the local site root.');
  assert.ok(!url.search && !url.hash, 'Use a URL without query or fragment.');
  return url;
}

function chromium() {
  const bundled = path.join(os.homedir(), '.cache', 'codex-runtimes',
    'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright');
  for (const candidate of ['playwright', '@playwright/test', bundled]) {
    try {
      const api = require(candidate);
      if (api.chromium) return api.chromium;
    } catch (error) {
      if (error.code !== 'MODULE_NOT_FOUND') throw error;
    }
  }
  throw new Error('Playwright unavailable. No installation was attempted.');
}

function screenshotDirectory() {
  const supplied = process.env.DRIVER_LANDING_SCREENSHOT_DIR;
  if (!supplied) return null;
  assert.ok(path.isAbsolute(supplied), 'Screenshot directory must be absolute.');
  const directory = path.resolve(supplied);
  const relative = path.relative(path.resolve(__dirname, '..'), directory);
  assert.ok(relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative),
    'Screenshots must be written outside the repository.');
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}

async function check(name, action) {
  await action();
  results.push(name);
  process.stdout.write(`PASS ${name}\n`);
}

async function main() {
  const base = localUrl(process.env.DRIVER_LANDING_BASE_URL);
  const screenshots = screenshotDirectory();
  const browser = await chromium().launch({ headless: true });
  const remote = [];
  const api = [];
  const errors = [];
  const workers = [];
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', serviceWorkers: 'block',
    });
    await context.addInitScript(() => {
      window.__driverLandingEffects = { registrations: [] };
      if ('serviceWorker' in navigator) {
        Object.defineProperty(navigator.serviceWorker, 'register', { configurable: true,
          value: script => {
            window.__driverLandingEffects.registrations.push(String(script).split('?')[0]);
            return Promise.reject(new Error('Public landing must not register a service worker.'));
          },
        });
      }
    });
    context.on('serviceworker', worker => workers.push(worker.url().split('?')[0]));
    await context.route('**/*', route => {
      const target = new URL(route.request().url());
      const address = `${target.origin}${target.pathname}`;
      if (!['data:', 'blob:'].includes(target.protocol) && !LOOPBACK.has(target.hostname)) {
        remote.push(address);
        return route.abort('blockedbyclient');
      }
      if (target.pathname === '/api' || ['/api/', '/auth/v1/', '/rest/v1/']
        .some(prefix => target.pathname.startsWith(prefix))) {
        api.push(address);
        return route.abort('blockedbyclient');
      }
      return route.continue();
    });
    assert.equal(typeof context.routeWebSocket, 'function', 'This smoke requires WebSocket interception.');
    await context.routeWebSocket(/.*/, socket => {
      const target = new URL(socket.url());
      // Next development uses this transport; other sockets are unexpected.
      if (LOOPBACK.has(target.hostname) && target.pathname === '/_next/webpack-hmr') socket.connectToServer();
      else {
        remote.push(`${target.origin}${target.pathname}`);
        socket.close();
      }
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

    await check('Guest driver root responds 200 without login redirect', async () => {
      const response = await page.goto(base.href, { waitUntil: 'networkidle', timeout: 60_000 });
      assert.ok(response);
      assert.equal(response.status(), 200);
      assert.equal(new URL(page.url()).pathname, '/');
      assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1);
      assert.ok((await page.getByRole('heading', { level: 1 }).innerText()).trim());
      assert.equal(await page.locator('html').getAttribute('lang'), 'es-DO');
      assert.ok((await page.title()).trim());
    });

    await check('Optional cookies can be rejected', async () => {
      const reject = page.getByRole('button', { name: 'Rechazar opcionales', exact: true });
      await reject.waitFor({ state: 'visible' });
      await reject.click();
      await reject.waitFor({ state: 'hidden' });
      const close = page.getByRole('button', { name: 'Cerrar', exact: true });
      if (await close.isVisible()) await close.click();
    });

    await check('Participation, conditions, FAQ and legal links are discoverable', async () => {
      for (const id of ['como-participar', 'condiciones', 'preguntas']) {
        assert.equal(await page.locator(`#${id}`).count(), 1);
      }
      assert.equal(await page.locator('header').getByRole('link', { name: 'Ingresar', exact: true })
        .getAttribute('href'), '/driver/login');
      const participation = new URL(await page.getByRole('link', { name: 'Conoce cómo participar', exact: false }).first()
        .getAttribute('href'), base);
      assert.equal(participation.origin, base.origin);
      assert.equal(participation.pathname, '/');
      assert.equal(participation.hash, '#como-participar');
      for (const pathname of ['/politica-de-cookies', '/politica-de-privacidad', '/terminos-de-servicio', '/aviso-legal']) {
        assert.ok(await page.locator(`a[href="${pathname}"]`).count(), `Missing legal link ${pathname}`);
      }
      assert.equal(await page.locator('a[href="/register"]').count(), 0,
        'Run default smoke with NEXT_PUBLIC_LANDING_SIGNUP_ENABLED unset or false.');
    });

    await check('Three earning streams update without network calls or balances', async () => {
      const lab = page.locator('#calculadora');
      assert.equal(await lab.count(), 1);
      const ads = lab.getByRole('slider', { name: /publicidad en mi pantalla/i });
      const sales = lab.getByRole('slider', { name: /venta de publicidad/i });
      const referrals = lab.getByRole('slider', { name: /referir conductores/i });
      const total = lab.locator('output[htmlFor]');
      assert.equal(await ads.getAttribute('max'), '15');
      assert.equal(await sales.getAttribute('max'), '20');
      assert.equal(await referrals.getAttribute('max'), '20');
      const read = async () => Number((await lab.locator('output').last().innerText()).replace(/[^0-9]/g, ''));
      assert.equal(await read(), 5000); // 8 ads + 1 sale + 1 referral
      await ads.fill('15');
      assert.equal(await read(), 8500);
      await sales.fill('0');
      await referrals.fill('0');
      assert.equal(await read(), 7500);
      await ads.fill('0');
      assert.equal(await read(), 0);
      assert.equal(await lab.locator('[data-active="true"]').count(), 0);
      assert.equal(await lab.locator('[data-active]').count(), 15);
      assert.match(await lab.innerText(), /no recurrentes|no se repiten mensualmente/i);
      assert.deepEqual(api, []);
    });

    await check('Participation anchor and native FAQ are operable by keyboard', async () => {
      const participation = page.getByRole('link', { name: 'Conoce cómo participar', exact: false }).first();
      await participation.focus();
      await participation.press('Enter');
      assert.equal(new URL(page.url()).hash, '#como-participar');
      const summary = page.locator('#preguntas summary').first();
      await summary.focus();
      assert.equal(await summary.evaluate(element => element === document.activeElement), true);
      const before = await summary.evaluate(element => element.parentElement.open);
      await summary.press('Enter');
      assert.equal(await summary.evaluate(element => element.parentElement.open), !before);
      await summary.press('Enter');
      assert.equal(await summary.evaluate(element => element.parentElement.open), before);
    });

    await check('Desktop 1440px and mobile 320px fit without horizontal overflow', async () => {
      for (const width of [1440, 320]) {
        await page.setViewportSize({ width, height: width === 320 ? 800 : 1000 });
        await page.evaluate(() => { document.activeElement?.blur(); scrollTo(0, 0); });
        const sizes = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }));
        assert.ok(sizes.content <= sizes.width + 1, `${width}px viewport overflows to ${sizes.content}px.`);
        if (screenshots) await page.screenshot({ path: path.join(screenshots, `driver-landing-${width}.png`), fullPage: true });
      }
    });

    await check('Reduced motion suppresses nontrivial animations', async () => {
      assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
      const moving = await page.evaluate(() => document.getAnimations().filter(animation => {
        const duration = animation.effect?.getComputedTiming().duration;
        return animation.playState === 'running' && typeof duration === 'number' && duration > 1;
      }).length);
      assert.equal(moving, 0);
      assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto');
    });

    await check('Public page initializes no service worker, API or private stored state', async () => {
      assert.deepEqual(await page.evaluate(() => window.__driverLandingEffects.registrations), []);
      assert.deepEqual(workers, []);
      const registrations = await page.evaluate(async () => 'serviceWorker' in navigator
        ? (await navigator.serviceWorker.getRegistrations()).length : 0);
      assert.equal(registrations, 0);
      assert.deepEqual(api, []);
      const privateKeys = await page.evaluate(() => Object.keys(localStorage)
        .filter(key => /^(sb-|supabase)|react-query|offline-queue|driver-session|auth-token/i.test(key)));
      assert.deepEqual(privateKeys, []);
    });

    await check('Public interactions make no remote requests or JavaScript errors', async () => {
      assert.deepEqual(remote, [], 'Unexpected network requests were blocked.');
      assert.deepEqual(errors, [], 'Browser errors occurred.');
      assert.equal(new URL(page.url()).origin, base.origin);
      assert.equal(new URL(page.url()).pathname, '/');
    });
    process.stdout.write(JSON.stringify({ result: 'PASS', checks: results.length, baseUrl: base.href,
      screenshots, omitted: ['Authenticated login and dashboard', 'Registration submission',
        'Real API, earnings or financial data', 'Production deployment', 'Comprehensive accessibility audit'],
    }, null, 2) + '\n');
  } finally { await browser.close(); }
}

main().catch(error => {
  process.stderr.write(`FAIL ${error.message}\n${results.length} earlier checks passed; remaining checks were not run.\n`);
  process.exitCode = 1;
});
