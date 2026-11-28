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
// Keep the shared stress cases and include every width requested in issue #249.
const DRIVER_VIEWPORT_WIDTHS = [...new Set([...VIEWPORT_WIDTHS, 375, 428])].sort((a, b) => a - b);
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

function recordErrors(page, errors, failedRequests) {
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', request => failedRequests.push({
    path: new URL(request.url()).pathname, error: request.failure()?.errorText,
  }));
  page.on('response', response => {
    if (response.status() >= 400) failedRequests.push({
      path: new URL(response.url()).pathname, status: response.status(),
    });
  });
}

async function assertHeroImage(page, base, label) {
  const image = page.locator('section[aria-labelledby="hero-title"] figure img');
  await assertOpaque(image, `${label}: approved taxi image`);
  await image.evaluate(async element => { await element.decode(); });
  const source = await image.evaluate(element => ({
    currentSrc: element.currentSrc, complete: element.complete,
    width: element.naturalWidth, height: element.naturalHeight,
    alt: element.alt, loading: element.getAttribute('loading'),
    preloaded: [...document.querySelectorAll('link[rel="preload"][as="image"]')].some(link =>
      (element.srcset && link.getAttribute('imagesrcset') === element.srcset)
      || link.href === element.currentSrc),
  }));
  assert.equal(source.complete, true, `${label}: image must finish loading.`);
  assert.ok(source.width > 0 && source.height > 0, `${label}: image must decode to real pixels.`);
  const alpha = await image.evaluate(element => {
    // Inspect decoded pixels from the delivered variant, including Next's
    // optimized response; a PNG extension or alpha channel alone proves nothing.
    const canvas = document.createElement('canvas');
    canvas.width = element.naturalWidth;
    canvas.height = element.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas is unavailable for the taxi transparency check.');
    context.drawImage(element, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparent = 0;
    let opaque = 0;
    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] === 0) transparent++;
      if (pixels[index] >= 250) opaque++;
    }
    const total = canvas.width * canvas.height;
    return { transparentRatio: transparent / total, opaqueRatio: opaque / total };
  });
  assert.ok(alpha.transparentRatio > 0.05,
    `${label}: more than 5% of delivered pixels must be fully transparent; got ${alpha.transparentRatio}.`);
  assert.ok(alpha.opaqueRatio > 0.05,
    `${label}: more than 5% of delivered pixels must preserve opaque taxi/callout content; got ${alpha.opaqueRatio}.`);
  const requested = new URL(source.currentSrc, base);
  assert.equal(requested.origin, base.origin, `${label}: load the taxi from the local site.`);
  const media = new URL(requested.pathname === '/_next/image'
    ? requested.searchParams.get('url') : requested.href, base);
  assert.equal(media.origin, base.origin);
  assert.match(media.pathname, /^\/_next\/static\/media\/tad-driver-taxi-headrest\.[^/]+\.png$|^\/tad-driver-taxi-headrest\.png$/,
    `${label}: the browser must load the checked-in taxi asset, not an inline or remote substitute.`);
  assert.match(source.alt, /detrás del reposacabezas del copiloto/i);
  await image.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest' }));
  const geometry = await image.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const crop = [];
    for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
      const bounds = ancestor.getBoundingClientRect();
      const ancestorStyle = getComputedStyle(ancestor);
      if (/hidden|clip|scroll|auto/.test(ancestorStyle.overflowX)
        && (rect.left < bounds.left - 1 || rect.right > bounds.right + 1)) crop.push('horizontal');
      if (/hidden|clip|scroll|auto/.test(ancestorStyle.overflowY)
        && (rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1)) crop.push('vertical');
    }
    const scale = style.objectFit === 'cover'
      ? Math.max(rect.width / element.naturalWidth, rect.height / element.naturalHeight)
      : Math.min(rect.width / element.naturalWidth, rect.height / element.naturalHeight);
    const occluded = [];
    // Sample both sides, the upper callout region and the taxi body after scrolling
    // the photograph into view. A visible box alone can still have an overlay.
    for (const [x, y] of [[0.1, 0.1], [0.5, 0.2], [0.9, 0.1], [0.1, 0.8], [0.5, 0.8], [0.9, 0.8]]) {
      const target = document.elementFromPoint(rect.left + rect.width * x, rect.top + rect.height * y);
      if (target !== element) occluded.push([x, y, target?.tagName]);
    }
    return { width: rect.width, height: rect.height, left: rect.left, right: rect.right,
      fit: style.objectFit, crop, occluded, intrinsicRatio: element.naturalWidth / element.naturalHeight,
      paintedWidth: element.naturalWidth * scale, paintedHeight: element.naturalHeight * scale };
  });
  assert.ok(geometry.left >= -1 && geometry.right <= (await page.viewportSize()).width + 1,
    `${label}: taxi photograph must fit horizontally.`);
  assert.deepEqual(geometry.crop, [], `${label}: ancestors must not clip the taxi or screen callout.`);
  assert.ok(geometry.paintedWidth <= geometry.width + 1 && geometry.paintedHeight <= geometry.height + 1,
    `${label}: object-fit must preserve the complete taxi and screen callout.`);
  assert.ok(geometry.fit !== 'fill' || Math.abs(geometry.width / geometry.height - geometry.intrinsicRatio) < 0.01,
    `${label}: preserve the photograph's intrinsic proportions.`);
  assert.deepEqual(geometry.occluded, [], `${label}: taxi and screen callout must not be covered.`);
  return source;
}

async function assertLabGeometry(page, label) {
  const failures = await page.locator('#calculadora').evaluate(section => {
    const layout = section.lastElementChild;
    const controls = layout.firstElementChild;
    const result = layout.lastElementChild;
    const edge = section.getBoundingClientRect();
    const failures = [];
    for (const [name, element] of Object.entries({ layout, controls,
      rangeNote: controls.lastElementChild, result })) {
      const rect = element.getBoundingClientRect();
      if (rect.left < edge.left - 1 || rect.right > edge.right + 1
        || rect.left < -1 || rect.right > innerWidth + 1
        || element.scrollWidth > element.clientWidth + 1) {
        failures.push(`${name}: box ${rect.left.toFixed(2)}..${rect.right.toFixed(2)}, `
          + `section ${edge.left.toFixed(2)}..${edge.right.toFixed(2)}, `
          + `content ${element.scrollWidth}px of ${element.clientWidth}px`);
      }
    }
    const breakdown = result.querySelector('output').nextElementSibling;
    for (const row of breakdown.children) {
      const label = row.firstElementChild.getBoundingClientRect();
      const price = row.lastElementChild.getBoundingClientRect();
      if (price.left < label.right - 1 && price.top < label.bottom - 1) {
        failures.push('breakdown: a price overlaps its descriptive label');
      }
    }
    // Inspect painted text fragments, not only their parent boxes: an ancestor
    // with overflow:clip can otherwise conceal an over-wide grid or price.
    for (const element of section.querySelectorAll('h2,h3,p,label,small,span,strong,output,dt,dd,a')) {
      if (!element.getClientRects().length) continue;
      const own = element.getBoundingClientRect();
      for (const node of element.childNodes) {
        if (node.nodeType !== Node.TEXT_NODE || !node.textContent.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const rect of range.getClientRects()) {
          if (rect.width < 1) continue;
          if (rect.left < edge.left - 1 || rect.right > edge.right + 1
            || rect.left < own.left - 1 || rect.right > own.right + 1
            || rect.left < -1 || rect.right > innerWidth + 1) {
            failures.push(`text ${node.textContent.trim().slice(0, 55)}: `
              + `${rect.left.toFixed(2)}..${rect.right.toFixed(2)} outside its row or section`);
          }
        }
      }
    }
    return failures;
  });
  assert.deepEqual(failures, [], `${label}: laboratory containers and painted text must fit without clipping.`);
}

async function main() {
  const base = localUrl(process.env.DRIVER_LANDING_BASE_URL);
  const screenshots = screenshotDirectory();
  const browser = await chromium().launch({ headless: true });
  const remote = [];
  const api = [];
  const errors = [];
  const failedRequests = [];
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
    recordErrors(page, errors, failedRequests);

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

    await check('Approved taxi image loads publicly, decodes and preserves its complete photograph', async () => {
      const image = await assertHeroImage(page, base, 'Driver desktop');
      assert.notEqual(image.loading, 'lazy', 'The hero must load eagerly.');
      assert.equal(image.preloaded, true, 'next/image must preload the priority hero image.');
      const response = await page.request.get(image.currentSrc);
      assert.equal(response.status(), 200, 'A guest must be able to fetch the emitted hero asset.');
      assert.match(response.headers()['content-type'], /^image\//);
      await page.evaluate(() => scrollTo(0, 0));
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

    await check('Driver opportunity choices update accessible content with keyboard, keep one active option and restore', async () => {
      const hero = page.locator('section[aria-labelledby="hero-title"]');
      const choices = hero.locator('ul[aria-label="Explora las tres oportunidades para conductores"] button');
      assert.equal(await choices.count(), 3);
      const summaries = new Set();
      for (const index of [0, 1, 2]) {
        const button = choices.nth(index);
        await button.focus();
        await button.press('Enter');
        assert.equal(await button.getAttribute('aria-pressed'), 'true');
        assert.equal(await hero.locator('ul[aria-label="Explora las tres oportunidades para conductores"] button[aria-pressed="true"]').count(), 1);
        assert.equal(await button.getAttribute('aria-controls'), 'driver-channel-summary');
        const summary = hero.locator('#driver-channel-summary');
        assert.equal(await summary.getAttribute('role'), 'status');
        assert.equal(await summary.getAttribute('aria-live'), 'polite');
        const text = (await summary.innerText()).trim();
        assert.match(text, [ /^Pantalla:/, /^Ventas:/, /^Referidos:/ ][index]);
        summaries.add(text);
        assert.ok(text.length > 40);
        assert.ok((await button.evaluate(element => element.getBoundingClientRect().height)) >= 44);
      }
      assert.equal(summaries.size, 3, 'Each opportunity needs distinct accessible explanatory content.');
      await choices.first().click();
      assert.match(await hero.locator('#driver-channel-summary').innerText(), /^Pantalla:/);
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

    await check('Driver landing and complete taxi image fit all required widths', async () => {
      for (const width of DRIVER_VIEWPORT_WIDTHS) {
        await page.setViewportSize({ width, height: width >= 1440 ? 1000 : 844 });
        await page.evaluate(() => { document.activeElement?.blur(); scrollTo(0, 0); });
        await assertNoHorizontalOverflow(page, `Driver ${width}px`);
        await assertLabGeometry(page, `Driver ${width}px`);
        await assertHeroImage(page, base, `Driver ${width}px`);
        if (width <= 800) {
          const order = await page.locator('section[aria-labelledby="hero-title"]').evaluate(hero => {
            const cta = hero.querySelector('a[href="#calculadora"]');
            const taxi = hero.querySelector('figure');
            const choices = hero.querySelector('ul[aria-label="Explora las tres oportunidades para conductores"]');
            if (!cta || !taxi || !choices) return null;
            return {
              ctaBottom: cta.getBoundingClientRect().bottom,
              taxiTop: taxi.getBoundingClientRect().top,
              taxiBottom: taxi.getBoundingClientRect().bottom,
              choicesTop: choices.getBoundingClientRect().top,
            };
          });
          assert.ok(order, `Driver ${width}px: missing CTA, taxi or earning choices.`);
          assert.ok(order.taxiTop >= order.ctaBottom - 2,
            `Driver ${width}px: approved taxi must follow the primary CTA.`);
          assert.ok(order.choicesTop >= order.taxiBottom - 2,
            `Driver ${width}px: earning chapters must follow the taxi image.`);
        }
        await page.evaluate(() => scrollTo(0, 0));
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
          await assertLabGeometry(page, scenario);
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
          const original = [];
          for (const id of ['driver-lab-ads', 'driver-lab-sales', 'driver-lab-referrals']) {
            const control = page.locator(`#${id}`);
            original.push([control, Number(await control.inputValue())]);
            await setRangeWithKeyboard(control, Number(await control.getAttribute('max')));
          }
          assert.equal(monetaryAmount(await page.locator(amountSelector).innerText()), 107500,
            `${scenario}: the largest educational UI example must remain complete.`);
          await assertLabGeometry(page, `${scenario} maximum example`);
          for (const [control, value] of original) await setRangeWithKeyboard(control, value);
          await assertLabGeometry(page, `${scenario} restored example`);
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
      recordErrors(normalPage, errors, failedRequests);
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

    await check('Without JavaScript, driver heading, taxi image, earnings controls and total remain visible at all required widths', async () => {
      const noJs = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: 'block',
        viewport: { width: 390, height: 844 } });
      await guardContext(noJs, base, { remote, api, workers });
      const staticPage = await noJs.newPage();
      recordErrors(staticPage, errors, failedRequests);
      try {
        const response = await staticPage.goto(base.href, { waitUntil: 'load', timeout: 60_000 });
        assert.equal(response.status(), 200);
        assert.equal(new URL(staticPage.url()).pathname, '/');
        for (const width of DRIVER_VIEWPORT_WIDTHS) {
          await staticPage.setViewportSize({ width, height: width >= 1440 ? 1000 : 844 });
          for (const selector of ['#hero-title', '#driver-lab-ads', '#driver-lab-sales', '#driver-lab-referrals',
            'output[for="driver-lab-ads driver-lab-sales driver-lab-referrals"]']) {
            await assertOpaque(staticPage.locator(selector), `Driver no-JS ${width}px ${selector}`);
          }
          await assertNoHorizontalOverflow(staticPage, `Driver no-JS ${width}px`);
          await assertHeroImage(staticPage, base, `Driver no-JS ${width}px`);
          await staticPage.evaluate(() => scrollTo(0, 0));
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
      assert.deepEqual(failedRequests, [], 'Requests failed or returned HTTP errors, including missing hero assets.');
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
