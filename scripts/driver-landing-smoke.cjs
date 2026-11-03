#!/usr/bin/env node
'use strict';

// Read-only local smoke. Does not start servers or navigate into login/registration.
// DRIVER_LANDING_BASE_URL=http://127.0.0.1:3004 node scripts/driver-landing-smoke.cjs
// Optional DRIVER_LANDING_SCREENSHOT_DIR must be an absolute path outside this repo.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { VIEWPORT_WIDTHS, assertOpaque, assertNoHorizontalOverflow,
  assertCssZoomReflow, monetaryAmount, setRangeWithKeyboard, installAmountFeedbackProbe,
  assertAmountFeedback } = require('./landing-browser-contracts.cjs');
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

async function guardContext(context, base, effects) {
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
  context.on('serviceworker', worker => effects.workers.push(worker.url().split('?')[0]));
  await context.route('**/*', route => {
    const target = new URL(route.request().url());
    const address = `${target.origin}${target.pathname}`;
    if (['data:', 'blob:'].includes(target.protocol)) return route.continue();
    if (target.origin !== base.origin) {
      effects.remote.push(address);
      return route.abort('blockedbyclient');
    }
    if (!['GET', 'HEAD'].includes(route.request().method()) || target.pathname === '/api'
      || ['/api/', '/auth/v1/', '/rest/v1/', '/realtime/']
        .some(prefix => target.pathname.startsWith(prefix))) {
      effects.api.push(address);
      return route.abort('blockedbyclient');
    }
    return route.continue();
  });
  assert.equal(typeof context.routeWebSocket, 'function', 'This smoke requires WebSocket interception.');
  await context.routeWebSocket(/.*/, socket => {
    const target = new URL(socket.url());
    const hmrAllowed = process.env.DRIVER_LANDING_ALLOW_DEV_HMR === 'true'
      || process.env.LANDING_ALLOW_DEV_HMR === 'true';
    const developmentHmr = hmrAllowed && ['ws:', 'wss:'].includes(target.protocol)
      && target.hostname === base.hostname && target.port === base.port
      && !target.username && !target.password && target.pathname === '/_next/webpack-hmr';
    if (developmentHmr) socket.connectToServer();
    else {
      effects.remote.push(`${target.origin}${target.pathname}`);
      socket.close();
    }
  });
}

function recordErrors(page, errors) {
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
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
    await guardContext(context, base, { remote, api, workers });
    const amountSelector = 'output[for="driver-lab-ads driver-lab-sales driver-lab-referrals"]';
    await installAmountFeedbackProbe(context, amountSelector);
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);
    recordErrors(page, errors);

    await check('Guest driver root responds 200 without login redirect', async () => {
      const response = await page.goto(base.href, { waitUntil: 'networkidle', timeout: 60_000 });
      assert.ok(response);
      assert.equal(response.status(), 200);
      assert.equal(new URL(page.url()).pathname, '/');
      await page.getByRole('heading', { level: 1 }).waitFor({ state: 'visible' });
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

    await check('Three earning streams match independent fixtures through actual keyboard controls', async () => {
      const lab = page.locator('#calculadora');
      assert.equal(await lab.count(), 1);
      const ads = lab.getByRole('slider', { name: /publicidad en mi pantalla/i });
      const sales = lab.getByRole('slider', { name: /venta de publicidad/i });
      const referrals = lab.getByRole('slider', { name: /referir conductores/i });
      const total = lab.locator('output[for="driver-lab-ads driver-lab-sales driver-lab-referrals"]');
      assert.equal(await total.count(), 1, 'Use the rendered HTML for attribute, not React htmlFor.');
      assert.equal(await ads.getAttribute('max'), '15');
      assert.equal(await sales.getAttribute('max'), '100');
      assert.equal(await referrals.getAttribute('max'), '100');
      const read = async locator => monetaryAmount(await locator.innerText());
      assert.equal(await read(total), 5000); // 8 monthly ads + one sale + one referral.
      // Hand-derived values: keep the oracle independent of the application helper.
      const fixtures = [
        { ads: 0, sales: 0, referrals: 0, monthly: 0, events: 0, total: 0 },
        { ads: 2, sales: 0, referrals: 0, monthly: 1000, events: 0, total: 1000 },
        { ads: 0, sales: 2, referrals: 0, monthly: 0, events: 1000, total: 1000 },
        { ads: 0, sales: 0, referrals: 3, monthly: 0, events: 1500, total: 1500 },
        { ads: 15, sales: 2, referrals: 3, monthly: 7500, events: 2500, total: 10000 },
        { ads: 15, sales: 100, referrals: 100, monthly: 7500, events: 100000, total: 107500 },
      ];
      for (const fixture of fixtures) {
        await setRangeWithKeyboard(ads, fixture.ads);
        await setRangeWithKeyboard(sales, fixture.sales);
        await setRangeWithKeyboard(referrals, fixture.referrals);
        assert.equal(await read(total), fixture.total, JSON.stringify(fixture));
        assert.equal(await read(lab.locator('p').filter({ hasText: /^Mensual por anuncios:/ })), fixture.monthly);
        assert.equal(await read(lab.locator('p').filter({ hasText: /^Bonos por eventos:/ })), fixture.events);
        for (const [id, value] of [['ads', fixture.ads], ['sales', fixture.sales], ['referrals', fixture.referrals]]) {
          assert.equal(await lab.locator(`output[for="driver-lab-${id}"]`).innerText(), String(value));
        }
        assert.equal(await lab.locator('[data-active="true"]').count(), fixture.ads);
        assert.equal(await lab.locator('[data-active]').count(), 15);
      }
      await setRangeWithKeyboard(ads, 15);
      await ads.press('ArrowRight');
      assert.equal(await ads.inputValue(), '15', 'Keyboard may not exceed the absolute 15-ad cap.');
      await setRangeWithKeyboard(ads, 0);
      await ads.press('ArrowLeft');
      assert.equal(await ads.inputValue(), '0');
      await ads.press('Tab');
      assert.equal(await sales.evaluate(element => element === document.activeElement), true,
        'Natural keyboard order must move from ads to sales.');
      await setRangeWithKeyboard(ads, 8);
      await setRangeWithKeyboard(sales, 1);
      await setRangeWithKeyboard(referrals, 1);
      assert.equal(await read(total), 5000, 'Restore the initial illustrative scenario for visual inspection.');
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

    await check('Driver mobile sections menu opens by keyboard and navigates without private routes', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      const menu = page.locator('header details');
      assert.equal(await menu.count(), 1, 'Expected one native mobile sections disclosure.');
      const summary = menu.locator('summary');
      await summary.focus();
      await summary.press('Enter');
      assert.equal(await menu.evaluate(element => element.open), true);
      const target = menu.locator('a[href="#calculadora"]');
      const height = await target.evaluate(element => element.getBoundingClientRect().height);
      assert.ok(height >= 44, 'Menu link must have a >=44px touch target.');
      await target.click();
      assert.equal(new URL(page.url()).hash, '#calculadora');
      assert.equal(await menu.evaluate(element => element.open), false);
      await page.goto(base.href, { waitUntil: 'networkidle', timeout: 60_000 });
      await assertNoHorizontalOverflow(page, 'Driver after mobile menu navigation');
    });

    await check('Driver landing fits all eight required widths', async () => {
      for (const width of VIEWPORT_WIDTHS) {
        await page.setViewportSize({ width, height: width >= 1440 ? 1000 : 844 });
        await page.evaluate(() => { document.activeElement?.blur(); scrollTo(0, 0); });
        await assertNoHorizontalOverflow(page, `Driver ${width}px`);
        if (screenshots) await page.screenshot({ path: path.join(screenshots, `driver-landing-${width}.png`), fullPage: true });
      }
    });

    await check('Driver CSS zoom200% stress preserves reflow and keyboard controls in portrait, landscape and desktop', async () => {
      await assertCssZoomReflow(page, {
        label: 'Driver',
        essentialSelectors: ['#hero-title', amountSelector, '#driver-lab-ads', '#driver-lab-sales', '#driver-lab-referrals'],
        controlSelectors: ['section[aria-labelledby="hero-title"] a[href="#calculadora"]',
          'header a[href="/driver/login"]', '#driver-lab-ads', '#driver-lab-sales', '#driver-lab-referrals'],
        exerciseControls: async scenario => {
          for (const id of ['driver-lab-ads', 'driver-lab-sales', 'driver-lab-referrals']) {
            const control = page.locator(`#${id}`);
            const original = Number(await control.inputValue());
            const before = monetaryAmount(await page.locator(amountSelector).innerText());
            const next = original < Number(await control.getAttribute('max')) ? original + 1 : original - 1;
            await setRangeWithKeyboard(control, next);
            assert.equal(monetaryAmount(await page.locator(amountSelector).innerText()), before + (next - original) * 500,
              `${scenario}: ${id} must update the educational total.`);
            await setRangeWithKeyboard(control, original);
            assert.equal(monetaryAmount(await page.locator(amountSelector).innerText()), before);
          }
        },
        capture: screenshots ? size => page.screenshot({
          path: path.join(screenshots, `driver-landing-${size.width}x${size.height}-css-zoom200-stress.png`),
          fullPage: true,
        }) : undefined,
      });
    });

    await check('Reduced motion suppresses nontrivial animations', async () => {
      assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
      const moving = await page.evaluate(() => document.getAnimations().filter(animation => {
        const duration = animation.effect?.getComputedTiming().duration;
        return animation.playState === 'running' && typeof duration === 'number' && duration > 1;
      }).length);
      assert.equal(moving, 0);
      assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto');
      assert.equal(await page.evaluate(() => window.__landingAmountAnimations.length), 0,
        'Reduced motion must suppress feedback throughout the earnings keyboard fixtures.');
    });

    await check('Normal driver motion responds to an amount change for 180ms without entrance animation or focus loss', async () => {
      const normal = await browser.newContext({ viewport: { width: 1440, height: 1000 },
        reducedMotion: 'no-preference', serviceWorkers: 'block' });
      await guardContext(normal, base, { remote, api, workers });
      await installAmountFeedbackProbe(normal, amountSelector);
      const normalPage = await normal.newPage();
      recordErrors(normalPage, errors);
      try {
        const response = await normalPage.goto(base.href, { waitUntil: 'networkidle', timeout: 60_000 });
        assert.equal(response.status(), 200);
        await normalPage.getByRole('heading', { level: 1 }).waitFor({ state: 'visible' });
        const reject = normalPage.getByRole('button', { name: 'Rechazar opcionales', exact: true });
        await reject.waitFor({ state: 'visible' });
        await reject.click();
        await reject.waitFor({ state: 'hidden' });
        await assertAmountFeedback(normalPage, { outputSelector: amountSelector,
          inputSelector: '#driver-lab-ads', nextValue: 9, nextAmount: 5500 });
      } finally { await normal.close(); }
    });

    await check('Without JavaScript, driver heading, earnings controls and total remain opaque at all eight widths', async () => {
      const noJs = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: 'block',
        viewport: { width: 390, height: 844 } });
      await guardContext(noJs, base, { remote, api, workers });
      const staticPage = await noJs.newPage();
      recordErrors(staticPage, errors);
      try {
        const response = await staticPage.goto(base.href, { waitUntil: 'load', timeout: 60_000 });
        assert.equal(response.status(), 200);
        assert.equal(new URL(staticPage.url()).pathname, '/');
        for (const width of VIEWPORT_WIDTHS) {
          await staticPage.setViewportSize({ width, height: width >= 1440 ? 1000 : 844 });
          for (const selector of ['#hero-title', '#driver-lab-ads', '#driver-lab-sales', '#driver-lab-referrals',
            'output[for="driver-lab-ads driver-lab-sales driver-lab-referrals"]']) {
            await assertOpaque(staticPage.locator(selector), `Driver no-JS ${width}px ${selector}`);
          }
          await assertNoHorizontalOverflow(staticPage, `Driver no-JS ${width}px`);
          assert.equal(await staticPage.locator('header a[href="/driver/login"]').count(), 1);
          assert.equal(await staticPage.locator('a[href="/register"]').count(), 0);
          if (screenshots) await staticPage.screenshot({
            path: path.join(screenshots, `driver-landing-${width}-no-js.png`), fullPage: true });
        }
      } finally { await noJs.close(); }
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
        'Real API, earnings or financial data', 'Production deployment', 'Comprehensive accessibility audit',
        'Native browser zoom certification'],
    }, null, 2) + '\n');
  } finally { await browser.close(); }
}

main().catch(error => {
  process.stderr.write(`FAIL ${error.message}\n${results.length} earlier checks passed; remaining checks were not run.\n`);
  process.exitCode = 1;
});
