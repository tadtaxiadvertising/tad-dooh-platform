#!/usr/bin/env node
'use strict';

// Read-only public landing acceptance. Start a server separately with isolated config.
// LANDING_BASE_URL=http://127.0.0.1:3003 node scripts/landing-v3-smoke.cjs
// LANDING_SCREENSHOT_DIR is optional and must be absolute, outside this repository.
// No portal navigation, API calls, service workers or remote requests are allowed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { VIEWPORT_WIDTHS, assertOpaque, assertNoHorizontalOverflow,
  assertCssZoomReflow, setRangeWithKeyboard, installAmountFeedbackProbe, assertAmountFeedback } = require('./landing-browser-contracts.cjs');

const ROOT = path.resolve(__dirname, '..');
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
const ROLE_LABELS = ['Anunciante', 'Conductor'];

function localBaseUrl(raw) {
  assert.ok(raw, 'Set LANDING_BASE_URL explicitly to an already running local landing.');
  const url = new URL(raw);
  assert.ok(['http:', 'https:'].includes(url.protocol) && LOOPBACK.has(url.hostname),
    'LANDING_BASE_URL must be HTTP(S) loopback.');
  assert.ok(!url.username && !url.password, 'URL credentials are forbidden.');
  assert.equal(url.pathname, '/', 'Use the local site root.');
  assert.ok(!url.search && !url.hash, 'Use a root URL without query or fragment.');
  return url;
}

function loadChromium() {
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
  throw new Error('Playwright is unavailable. No dependency installation was attempted.');
}

function outsideDirectory(supplied, label) {
  if (!supplied) return null;
  assert.ok(path.isAbsolute(supplied), `${label} must be absolute.`);
  const directory = path.resolve(supplied);
  const relative = path.relative(ROOT, directory);
  assert.ok(relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative),
    `${label} must be outside the repository.`);
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}

function gitSha() {
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
}

function amount(text) {
  const digits = text.replace(/[^\d.,]/g, '').replace(/[.,]\d{2}$/, '').replace(/\D/g, '');
  assert.ok(digits, 'The calculator must show a monetary amount.');
  return Number(digits);
}

async function guardContext(context, base, evidence) {
  await context.route('**/*', route => {
    const target = new URL(route.request().url());
    const address = `${target.origin}${target.pathname}`; // Never retain queries.
    if (['data:', 'blob:'].includes(target.protocol)) return route.continue();
    if (target.origin !== base.origin) {
      evidence.remote.push(address);
      return route.abort('blockedbyclient');
    }
    if (!['GET', 'HEAD'].includes(route.request().method()) || target.pathname === '/api'
      || ['/api/', '/auth/v1/', '/rest/v1/', '/realtime/']
      .some(prefix => target.pathname.startsWith(prefix))) {
      evidence.api.push(address);
      return route.abort('blockedbyclient');
    }
    return route.continue();
  });
  if (context.routeWebSocket) {
    await context.routeWebSocket(/.*/, socket => {
      const target = new URL(socket.url());
      const devHmr = process.env.LANDING_ALLOW_DEV_HMR === 'true'
        && ['ws:', 'wss:'].includes(target.protocol) && target.hostname === base.hostname
        && target.port === base.port && !target.username && !target.password
        && target.pathname === '/_next/webpack-hmr';
      if (devHmr) {
        evidence.devHmr.push(`${target.origin}${target.pathname}`);
        socket.connectToServer();
        return;
      }
      evidence.sockets.push(`${target.origin}${target.pathname}`);
      socket.close();
    });
  }
  await context.addInitScript(() => {
    window.__landingWorkerRegistrations = [];
    if ('serviceWorker' in navigator) {
      Object.defineProperty(navigator.serviceWorker, 'register', { configurable: true,
        value: script => {
          window.__landingWorkerRegistrations.push(String(script).split('?')[0]);
          return Promise.reject(new Error('The public smoke forbids service worker registration.'));
        },
      });
    }
  });
  context.on('serviceworker', worker => evidence.workers.push(worker.url().split('?')[0]));
}

function evidenceCollector() {
  return { remote: [], api: [], sockets: [], workers: [], errors: [], console: [], devHmr: [] };
}

function recordErrors(page, evidence) {
  page.on('pageerror', error => evidence.errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') evidence.console.push(message.text());
  });
}

async function selectRole(scope, name, keyboard = false) {
  const button = scope.getByRole('button', { name, exact: true });
  assert.equal(await button.count(), 1, `Expected exactly one ${name} selector in this section.`);
  if (keyboard) {
    await button.focus();
    assert.equal(await button.evaluate(element => element === document.activeElement), true);
    await button.press('Enter');
  } else await button.click();
  assert.equal(await button.getAttribute('aria-pressed'), 'true');
  for (const other of ROLE_LABELS.filter(role => role !== name)) {
    assert.equal(await scope.getByRole('button', { name: other, exact: true })
      .getAttribute('aria-pressed'), 'false');
  }
}

async function pressRange(input, key, expected) {
  await input.focus();
  await input.press(key);
  assert.equal(await input.inputValue(), String(expected));
}

async function rejectCookies(page) {
  const reject = page.getByRole('button', { name: 'Rechazar opcionales', exact: true });
  await reject.waitFor({ state: 'visible' });
  await reject.click();
  await reject.waitFor({ state: 'hidden' });
  const close = page.getByRole('button', { name: 'Cerrar', exact: true });
  if (await close.isVisible()) await close.click();
}

async function assertNoSideEffects(context, evidence) {
  const workerCalls = [];
  for (const page of context.pages()) workerCalls.push(...await page.evaluate(() =>
    window.__landingWorkerRegistrations || []));
  assert.deepEqual(workerCalls, [], 'Public landing attempted to register a service worker.');
  // Show every failure together: a blocked dev diagnostic must not obscure the
  // JavaScript error that caused it. Explicit development HMR is the sole exception.
  const failures = Object.entries(evidence).filter(([name, values]) => name !== 'devHmr' && values.length > 0);
  assert.deepEqual(failures, [], 'Blocked requests or browser errors were observed.');
}

async function assertAdvertiserLinks(page) {
  const links = await page.locator('a[href]').evaluateAll(nodes =>
    nodes.map(node => node.getAttribute('href')));
  assert.ok(links.includes('/advertiser/login'),
    'Advertiser login must remain discoverable without JavaScript.');
  assert.equal(links.some(link => /tad\.driver\.ibusiness\.com\.do|tad\.adm\.ibusiness\.com\.do|\/driver\/login|\/admin\/login/.test(link)), false,
    'Advertiser public landing must not contain other portals.');
  assert.equal(links.some(link => /\/advertiser\/onboarding/.test(link)), false,
    'Signup should remain gated by default in the isolated smoke environment.');
}

async function main() {
  const base = localBaseUrl(process.env.LANDING_BASE_URL);
  const screenshots = outsideDirectory(process.env.LANDING_SCREENSHOT_DIR, 'LANDING_SCREENSHOT_DIR');
  const browser = await loadChromium().launch({ headless: true });
  const results = [];
  const check = async (name, action) => {
    await action();
    results.push({ check: name, result: 'PASS' });
    process.stdout.write(`PASS ${name}\n`);
  };
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 },
      reducedMotion: 'reduce', serviceWorkers: 'block' });
    const evidence = evidenceCollector();
    await guardContext(context, base, evidence);
    await installAmountFeedbackProbe(context, '#budget-total');
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);
    recordErrors(page, evidence);
    const panel = page.locator('#experiencia');
    const hero = page.locator('section').filter({ has: page.locator('#hero-title') });

    await check('Guest root is public with title, locale and SEO metadata', async () => {
      const response = await page.goto(base.href, { waitUntil: 'networkidle', timeout: 60_000 });
      assert.ok(response);
      assert.equal(response.status(), 200);
      assert.equal(new URL(page.url()).pathname, '/');
      assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1);
      assert.equal(await page.locator('html').getAttribute('lang'), 'es-DO');
      assert.ok((await page.title()).trim());
      assert.ok(await page.locator('meta[name="description"]').getAttribute('content'));
      assert.ok(await page.locator('meta[property="og:title"]').getAttribute('content'));
      const canonical = new URL(await page.locator('link[rel="canonical"]').getAttribute('href'));
      assert.equal(canonical.pathname, '/');
      assert.equal(canonical.search, '');
      assert.match(await page.locator('header a.landing-brand').getAttribute('aria-label'),
        /TAD Taxi Advertising/i, 'The accessible brand name must include its visible desktop tagline.');
    });

    await check('Advertiser white motion narrative has accessible reduced-motion chapters', async () => {
      const story = page.locator('#motion-story');
      assert.equal(await story.count(), 1, 'The scroll story must have one anchor.');
      assert.equal(await story.evaluate(element => getComputedStyle(element).backgroundColor),
        'rgb(255, 255, 255)', 'The narrative should sit on the white page canvas.');
      assert.equal(await story.locator('article').count(), 3, 'All three chapters must remain in the DOM.');
      assert.equal(await story.locator('article').first().isVisible(), true,
        'Reduced-motion visitors must receive a readable static sequence.');
      assert.equal(await story.locator('a[href="#creative-preview-title"]').last().isVisible(), true,
        'The static sequence must retain its CTA.');
    });

    await check('Fresh visitor may reject optional cookies', async () => {
      const policy = page.getByRole('link', { name: 'Ver política e inventario', exact: true });
      assert.match(await policy.evaluate(element => getComputedStyle(element).textDecorationLine),
        /underline/, 'The cookie policy link must remain distinguishable without relying on color.');
      await rejectCookies(page);
    });

    await check('Advertiser-only landing has no role selector or driver simulator', async () => {
      assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1);
      assert.equal(await page.getByText('Simular mi campaña').count(), 1);
      assert.equal(await page.locator('[data-slot-active], #driver-total, .landing-perspectives, .landing-roles').count(), 0);
      await assertAdvertiserLinks(page);
    });

    await check('Cinematic city selection is keyboard-accessible, reversible and synchronized with the campaign', async () => {
      const choices = page.locator('.landing-hero-cities button');
      assert.equal(await choices.count(), 2);
      const santoDomingo = choices.getByText('Santo Domingo');
      const santiago = choices.getByText('Santiago');
      assert.equal(await santoDomingo.getAttribute('aria-pressed'), 'true');
      await santiago.focus();
      await santiago.press('Enter');
      assert.equal(await santiago.getAttribute('aria-pressed'), 'true');
      assert.equal(await santoDomingo.getAttribute('aria-pressed'), 'false');
      assert.equal(await page.locator('.landing-scene').getAttribute('data-city'), 'stgo');
      assert.equal(await page.locator('#campaign-city').inputValue(), 'stgo');
      assert.ok((await santiago.evaluate(element => element.getBoundingClientRect().height)) >= 44);
      await santoDomingo.click();
      assert.equal(await santoDomingo.getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('.landing-scene').getAttribute('data-city'), 'sd');
      assert.equal(await page.locator('#campaign-city').inputValue(), 'sd');
    });

    await check('Illustrative brand preview updates locally without changing the campaign price', async () => {
      const brand = page.locator('#hero-brand-name');
      const screen = page.locator('.landing-screen-content > strong');
      const scene = page.locator('.landing-scene');
      const objective = page.locator('#hero-campaign-objective');
      const totalBefore = await panel.locator('#budget-total').innerText();
      assert.equal(await brand.inputValue(), '');
      assert.equal(await brand.getAttribute('maxlength'), '24');
      assert.equal(await scene.locator('[data-cabin-illustration]').count(), 1);
      assert.match(await scene.getAttribute('aria-label'), /reposacabezas del copiloto/);
      const mounted = await scene.evaluate(element => {
        const display = element.querySelector('.landing-screen');
        const outer = element.getBoundingClientRect();
        const inner = display.getBoundingClientRect();
        return {
          contained: inner.left >= outer.left && inner.right <= outer.right &&
            inner.top >= outer.top && inner.bottom <= outer.bottom,
          animation: getComputedStyle(display).animationName,
        };
      });
      assert.ok(mounted.contained, 'Mounted screen remains inside the cabin');
      assert.equal(mounted.animation, 'none', 'Mounted screen must not float');
      await brand.fill('Café TAD');
      assert.ok((await screen.innerText()).includes('Café TAD'));
      assert.match(await scene.getAttribute('aria-label'), /marca de ejemplo Café TAD/);
      assert.equal(await panel.locator('#budget-total').innerText(), totalBefore);
      await objective.selectOption('launch');
      assert.equal(await panel.locator('#campaign-objective').inputValue(), 'launch');
      assert.ok((await screen.innerText()).includes('Café TAD'));
      await brand.fill('<img src=x onerror=1>');
      assert.ok((await screen.innerText()).includes('<img src=x onerror=1>'));
      assert.equal(await scene.locator('img').count(), 0, 'Brand text must not become markup.');
      await brand.fill('M'.repeat(24));
      await brand.press('End');
      await brand.press('N');
      assert.equal(await brand.inputValue(), 'M'.repeat(24), 'Typing past the limit must be blocked.');
      await brand.fill('');
      assert.equal(await scene.getAttribute('data-brand-custom'), null);
      await objective.selectOption('awareness');
      assert.equal(await panel.locator('#budget-total').innerText(), totalBefore);
    });

    await check('Passenger QR simulation opens and resets the local offer by keyboard', async () => {
      const story = page.locator('#interaccion-qr');
      const controls = story.getByRole('group', { name: 'Tipo de promoción ilustrativa' });
      const restaurant = controls.getByRole('button', { name: 'Restaurante' });
      const commerce = controls.getByRole('button', { name: 'Comercio' });
      const event = controls.getByRole('button', { name: 'Evento' });
      assert.equal(await story.count(), 1);
      assert.equal(await controls.getByRole('button').count(), 6);
      assert.equal(await restaurant.getAttribute('aria-pressed'), 'true');
      assert.equal(await story.locator('[data-promotion]').getAttribute('data-promotion'), 'restaurante');
      assert.match(await story.innerText(), /Tu próxima parada tiene mucho sabor/);
      const illustration = story.locator('img[src="/qr-passenger-journey.svg"]');
      assert.equal(await illustration.count(), 1, 'The storyboard must use a local illustrated asset.');
      assert.ok((await illustration.getAttribute('alt')).includes('copiloto'));
      const illustrationResponse = await page.request.get(new URL('/qr-passenger-journey.svg', base).href, {
        maxRedirects: 0,
      });
      assert.equal(illustrationResponse.status(), 200, 'Public image must not redirect to login');
      assert.equal((illustrationResponse.headers()['content-type'] || '').split(';')[0].trim().toLowerCase(), 'image/svg+xml');
      await illustration.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => {
        const image = document.querySelector('#interaccion-qr img[src="/qr-passenger-journey.svg"]');
        return image && image.complete && image.naturalWidth > 0;
      });

      // Measure rendered text against its actual solid background, not token names.
      const contrast = await story.evaluate(section => {
        const luminance = color => {
          const channels = color.match(/[\d.]+/g).slice(0, 3).map(value => Number(value) / 255);
          return channels.map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
            .reduce((total, value, i) => total + value * [0.2126, 0.7152, 0.0722][i], 0);
        };
        const selectors = ['h2', 'h2 span', 'figure figcaption', 'figure + p', 'h3', '[aria-live="polite"]', 'ol h3', 'ol p'];
        const nodes = selectors.flatMap(selector => [...section.querySelectorAll(selector)]);
        // Include lead, eyebrow, scan instructions and disclaimer without CSS-module hashes.
        nodes.push(...section.querySelectorAll(':scope > p, :scope > div:first-child p, button + p'));
        return [...new Set(nodes)].map(node => {
          let background = node;
          while (background && getComputedStyle(background).backgroundColor === 'rgba(0, 0, 0, 0)') {
            background = background.parentElement;
          }
          const fg = luminance(getComputedStyle(node).color);
          const bg = luminance(getComputedStyle(background || section).backgroundColor);
          return { label: node.textContent.trim().slice(0, 70), ratio: (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05) };
        });
      });
      assert.ok(contrast.length >= 10, 'Measure actual QR section text');
      for (const entry of contrast) assert.ok(entry.ratio >= 4.5, 'QR contrast: ' + JSON.stringify(entry));

      const brand = page.locator('#hero-brand-name');
      await brand.fill('Café TAD');
      assert.ok((await story.innerText()).includes('Café TAD'),
        'Brand customization must be shared between hero and QR preview.');
      await commerce.focus();
      await commerce.press('Enter');
      assert.equal(await commerce.getAttribute('aria-pressed'), 'true');
      assert.equal(await restaurant.getAttribute('aria-pressed'), 'false');
      assert.equal(await story.locator('[data-promotion]').getAttribute('data-promotion'), 'comercio');
      const visual = story.locator('[data-promotion]');
      const destination = story.locator('#qr-demo-destination');
      const scan = story.getByRole('button', { name: 'Simular escaneo del QR', exact: true });
      assert.equal(await visual.getAttribute('data-scanned'), 'false');
      assert.match(await destination.innerText(), /Tu oferta, a un escaneo/);
      assert.ok((await scan.boundingBox()).height >= 44);
      await scan.focus();
      await scan.press('Enter');
      assert.equal(await visual.getAttribute('data-scanned'), 'true');
      assert.match(await destination.innerText(), /Explora el catálogo/);
      assert.match(await story.locator('[aria-live="polite"]').innerText(), /Escaneo simulado/);
      const reset = story.getByRole('button', { name: 'Reiniciar demostración', exact: true });
      assert.equal(await reset.evaluate(el => document.activeElement === el), true);
      await reset.press('Enter');
      assert.equal(await visual.getAttribute('data-scanned'), 'false');
      await scan.click();
      await event.click();
      assert.equal(await event.getAttribute('aria-pressed'), 'true');
      assert.equal(await visual.getAttribute('data-scanned'), 'false', 'Changing promotion resets scan');
      await scan.click();
      assert.match(await destination.innerText(), /Conoce la programación/);
      for (const [label, key, copy] of [
        ['Inmobiliaria', 'inmobiliaria', /Explora propiedades/],
        ['Hotel', 'hotel', /Descubre tu estancia/],
        ['Servicios', 'servicios', /Conoce nuestros servicios/],
      ]) {
        const previousColor = await visual.locator('[data-qr-creative]').evaluate(el => getComputedStyle(el).backgroundColor);
        const choice = controls.getByRole('button', { name: label, exact: true });
        await choice.focus();
        await choice.press('Enter');
        assert.equal(await choice.getAttribute('aria-pressed'), 'true');
        assert.equal(await visual.getAttribute('data-promotion'), key);
        assert.equal(await visual.getAttribute('data-scanned'), 'false');
        const nextColor = await visual.locator('[data-qr-creative]').evaluate(el => getComputedStyle(el).backgroundColor);
        assert.notEqual(previousColor, nextColor, 'Sector has a distinct creative palette');
        await scan.click();
        assert.match(await destination.innerText(), copy);
      }
      assert.equal(await story.locator('a[href^="http"]').count(), 0,
        'The QR demo must not redirect to a fabricated advertiser URL.');
      assert.match(await story.innerText(), /no son escaneables/i);
      await brand.fill('');
      await restaurant.click();
      assert.equal(await story.locator('[data-promotion]').getAttribute('data-promotion'), 'restaurante');
      assert.equal(await visual.getAttribute('data-scanned'), 'false');
    });

    await check('Campaign story has four controllable keyboard steps', async () => {
      const story = page.locator('#recorrido-campana');
      const steps = story.locator('button[aria-pressed]');
      assert.equal(await steps.count(), 4);
      const assertJourneyFocus = async control => {
        const focus = await control.evaluate(element => {
          const style = getComputedStyle(element);
          return {
            visible: element.matches(':focus-visible'),
            color: style.outlineColor,
            style: style.outlineStyle,
            width: Number.parseFloat(style.outlineWidth),
          };
        });
        assert.equal(focus.visible, true, 'Keyboard navigation must show a focus indicator');
        assert.equal(focus.color, 'rgb(23, 23, 23)', 'Light journey requires a dark focus ring');
        assert.equal(focus.style, 'solid');
        assert.ok(focus.width >= 3, 'Focus indicator must remain clearly visible');
      };
      const stageTitles = new Set();
      for (let index = 0; index < 4; index += 1) {
        const step = steps.nth(index);
        await step.focus();
        await step.press('Enter');
        await assertJourneyFocus(step);
        assert.equal(await step.getAttribute('aria-pressed'), 'true');
        assert.equal(await story.locator('button[aria-pressed="true"]').count(), 1);
        stageTitles.add(await story.getByRole('heading', { level: 3 }).innerText());
      }
      assert.equal(stageTitles.size, 4, 'Each story step must explain a distinct stage.');
      await steps.nth(3).press('Home');
      assert.equal(await steps.nth(0).getAttribute('aria-pressed'), 'true');
      await steps.nth(0).press('ArrowRight');
      assert.equal(await steps.nth(1).evaluate(element => element === document.activeElement), true);
      assert.equal(await steps.nth(1).getAttribute('aria-pressed'), 'true');
      await assertJourneyFocus(steps.nth(1));
      const next = story.getByRole('button', { name: 'Siguiente', exact: true });
      await next.focus();
      await assertJourneyFocus(next);
      await next.press('Enter');
      assert.equal(await steps.nth(2).getAttribute('aria-pressed'), 'true');
      await assertJourneyFocus(steps.nth(2));
    });

    await check('Creative Studio keeps keyboard focus and previews a local image', async () => {
      const input = page.locator('#creative-preview-file');
      const studio = page.locator('section[aria-labelledby="creative-preview-title"]');
      const preview = studio.getByAltText('Vista previa de la creatividad seleccionada');
      const status = studio.getByRole('status');
      await input.scrollIntoViewIfNeeded();
      await input.setInputFiles({
        name: 'fixture.png',
        mimeType: 'image/png',
        buffer: Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63f87f95e13f00077f02d4680bdf0b0000000049454e44ae426082', 'hex'),
      });
      await page.waitForFunction(() => {
        const image = document.querySelector('img[alt="Vista previa de la creatividad seleccionada"]');
        return image && image.complete && image.naturalWidth > 0;
      });
      assert.match(await status.innerText(), /Archivo seleccionado/);
      const fill = studio.getByRole('button', { name: 'Llenar pantalla' });
      await fill.focus();
      await fill.press('Enter');
      assert.equal(await fill.getAttribute('aria-pressed'), 'true');
      assert.equal(await preview.evaluate(image => getComputedStyle(image).objectFit), 'cover');
      const remove = studio.getByRole('button', { name: 'Quitar', exact: true });
      assert.ok((await remove.boundingBox()).height >= 44, 'Remove control touch target');
      await remove.focus();
      await remove.press('Enter');
      await preview.waitFor({ state: 'detached' });
      assert.equal(await input.evaluate(element => element === document.activeElement), true, 'Return focus to the file picker');
      assert.equal(await input.inputValue(), '');
      assert.match(await status.innerText(), /Ningún archivo seleccionado/);
      await assertNoHorizontalOverflow(page, 'Advertiser after creative removal');
    });

    await check('Advertiser campaign calculator shares screen/month pricing and optional production', async () => {
      const screens = panel.getByLabel('Pantallas del ejemplo');
      const months = panel.getByLabel('Duración');
      const production = panel.getByRole('checkbox', { name: /producción creativa opcional/i });
      assert.equal(await screens.getAttribute('max'), '15');
      assert.equal(await months.getAttribute('max'), '12');
      assert.equal(await production.isChecked(), false);
      assert.equal(amount(await panel.locator('#budget-total').innerText()), 15000);
      await production.check();
      assert.equal(amount(await panel.locator('#budget-total').innerText()), 17500);
      await production.uncheck();
      assert.equal(amount(await panel.locator('#budget-total').innerText()), 15000);
      await pressRange(screens, 'End', 15);
      assert.equal(amount(await panel.locator('#budget-total').innerText()), 75000);
      await pressRange(months, 'Home', 1);
      assert.equal(amount(await panel.locator('#budget-total').innerText()), 37500);
      const city = panel.getByLabel('Ciudad del ejemplo');
      await city.selectOption('stgo');
      assert.equal(await city.inputValue(), 'stgo');
      const objective = panel.getByLabel('Objetivo de comunicación');
      await objective.selectOption('local');
      assert.equal(await objective.inputValue(), 'local');
      assert.match(await panel.innerText(), /benchmarks internacionales/i);
    });

    await check('Measurement education and contextual FAQ are accessible', async () => {
      assert.equal(await page.locator('#medicion article').count(), 3);
      const question = page.locator('#preguntas summary').first();
      await question.focus();
      await question.press('Enter');
      assert.equal(await question.evaluate(element => element.parentElement.open), true);
      assert.equal(await page.locator('input[type="password"], input[type="email"], input[type="tel"]').count(), 0,
        'Public demo must not collect identity or banking information.');
      await assertAdvertiserLinks(page);
    });

    await check('Real consent helper gates accurate city, objective and production events with deduplication', async () => {
      await page.evaluate(() => {
        window.__landingEvents = [];
        // Replace the transport only. Application handlers and the real shared
        // consent helper still decide whether/what to send on every interaction.
        window.umami = { track: callback => window.__landingEvents.push(callback({
          url: '/fixture-private?token=fixture', referrer: 'fixture-private', title: 'fixture-private',
        })) };
      });
      const city = panel.getByLabel('Ciudad del ejemplo');
      const objective = panel.getByLabel('Objetivo de comunicación');
      const production = panel.getByRole('checkbox', { name: /producción creativa opcional/i });
      const screens = panel.getByLabel('Pantallas del ejemplo');
      const months = panel.getByLabel('Duración');
      const readBudgetEvents = () => page.evaluate(() => window.__landingEvents.filter(event => event.name === 'budget_demo_used'));
      const state = async () => ({ city: await city.inputValue(), objective: await objective.inputValue(),
        screens: Number(await screens.inputValue()), months: Number(await months.inputValue()),
        includeProduction: await production.isChecked() });
      const oneEvent = async action => {
        const before = (await readBudgetEvents()).length;
        await action();
        const events = await readBudgetEvents();
        assert.equal(events.length, before + 1, 'One changed preview must emit exactly one event.');
        assert.deepEqual(events.at(-1).data, await state(), 'Event must describe the committed control values.');
      };
      await city.selectOption('sd');
      await objective.selectOption('awareness');
      await production.check();
      assert.equal(await page.evaluate(() => window.__landingEvents.length), 0,
        'Actual control changes must remain silent before opt-in.');
      await page.getByRole('button', { name: 'Configuración de cookies', exact: true }).click();
      await page.getByRole('button', { name: 'Aceptar opcionales', exact: true }).click();
      await oneEvent(() => city.selectOption('stgo'));
      await oneEvent(() => objective.selectOption('launch'));
      await oneEvent(() => production.uncheck());
      await oneEvent(() => pressRange(screens, 'Home', 1));
      const afterHome = (await readBudgetEvents()).length;
      await screens.press('Tab');
      await screens.focus();
      await screens.press('Home'); // Same boundary: keyup is real but state is unchanged.
      await screens.press('Tab');
      assert.equal((await readBudgetEvents()).length, afterHome,
        'Blur, Tab and a repeated boundary key must not duplicate the same preview.');
      await oneEvent(() => pressRange(months, 'ArrowRight', 2));
      const afterMonth = (await readBudgetEvents()).length;
      await months.press('Tab');
      assert.equal((await readBudgetEvents()).length, afterMonth, 'Month blur must not duplicate its key event.');
      const ctaBefore = await page.evaluate(() => window.__landingEvents.filter(event => event.name === 'cta_clicked').length);
      await hero.locator('a[href="#experiencia"]').click();
      const heroEvents = await page.evaluate(() => window.__landingEvents);
      const ctas = heroEvents.filter(event => event.name === 'cta_clicked');
      assert.equal(ctas.length, ctaBefore + 1);
      assert.deepEqual(ctas.at(-1).data, { role: 'advertiser', destination: 'advertiser_lab', placement: 'hero' });
      const next = panel.locator('#campaign-next');
      assert.equal(await next.getAttribute('href'), '/advertiser/login');
      await next.scrollIntoViewIfNeeded();
      assert.ok((await next.boundingBox()).height >= 44, 'Budget action must have a usable touch target');
      // Observe the real handler without navigating into an authenticated flow.
      await next.evaluate(element => element.addEventListener('click', event => event.preventDefault(), { once: true }));
      await next.focus();
      await next.press('Enter');
      const events = await page.evaluate(() => window.__landingEvents);
      const budgetCtas = events.filter(event => event.name === 'cta_clicked');
      assert.equal(budgetCtas.length, ctaBefore + 2, 'Each CTA emits exactly one event');
      assert.deepEqual(budgetCtas.at(-1).data, { role: 'advertiser', destination: 'advertiser_login', placement: 'simulator_result' });
      assert.equal(events.some(event => /onboarding_(started|completed)/.test(event.name || '')), false);
      for (const event of events) {
        assert.equal(event.url, '/');
        assert.equal(event.referrer, '');
        assert.equal(event.title, '');
        assert.equal(Object.keys(event.data || {}).some(field =>
          /email|phone|password|token|rnc|bank|cedula/i.test(field)), false);
        assert.equal(JSON.stringify(event).includes('fixture-private'), false,
          'The real helper must discard transport URL, title and referrer fixtures.');
      }
      const previousCount = events.length;
      await page.getByRole('button', { name: 'Configuración de cookies', exact: true }).click();
      await rejectCookies(page);
      await city.selectOption('sd');
      await objective.selectOption('local');
      await production.check();
      await pressRange(screens, 'End', 15);
      await screens.press('Tab');
      await hero.locator('a[href="#experiencia"]').click();
      await next.evaluate(element => element.addEventListener('click', event => event.preventDefault(), { once: true }));
      await next.focus();
      await next.press('Enter');
      assert.equal(await page.evaluate(() => window.__landingEvents.length), previousCount, 'Both CTA placements remain silent after revocation');
      await setRangeWithKeyboard(screens, 3);
      await setRangeWithKeyboard(months, 2);
      await objective.selectOption('awareness');
      await production.uncheck();
      assert.equal(amount(await panel.locator('#budget-total').innerText()), 15000);
      assert.equal(await page.evaluate(() => window.__landingEvents.length), previousCount,
        'Restoring the default preview after revocation must also remain silent.');
    });

    await check('Native mobile menu reaches simulator with keyboard and closes after navigation', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      const menu = page.locator('header details.landing-mobile-menu');
      assert.equal(await menu.count(), 1, 'Mobile sections navigation must be present.');
      const summary = menu.locator('summary');
      await summary.focus();
      await summary.press('Enter');
      assert.equal(await menu.evaluate(element => element.open), true);
      const qrTarget = menu.locator('a[href="#interaccion-qr"]');
      assert.ok(await qrTarget.count(), 'Mobile navigation must expose the passenger QR section.');
      const qrHeight = await qrTarget.evaluate(element => element.getBoundingClientRect().height);
      assert.ok(qrHeight >= 44, 'QR navigation link touch target must be >=44px.');
      await qrTarget.click();
      assert.equal(new URL(page.url()).hash, '#interaccion-qr');
      assert.equal(await menu.evaluate(element => element.open), false);
      await summary.focus();
      await summary.press('Enter');
      assert.equal(await menu.evaluate(element => element.open), true);
      const target = menu.locator('a[href="#experiencia"]');
      const height = await target.evaluate(element => element.getBoundingClientRect().height);
      assert.ok(height >= 44, 'Mobile navigation link touch target must be >=44px.');
      await target.click();
      assert.equal(new URL(page.url()).hash, '#experiencia');
      assert.equal(await menu.evaluate(element => element.open), false);
      await page.goto(base.href, { waitUntil: 'networkidle', timeout: 60_000 });
      await assertNoHorizontalOverflow(page, 'Advertiser after mobile menu navigation');
    });

    await check('Advertiser landing fits all eight required widths', async () => {
      for (const width of VIEWPORT_WIDTHS) {
        await page.setViewportSize({ width, height: width >= 1440 ? 1000 : 844 });
        await assertNoHorizontalOverflow(page, `Advertiser ${width}px`);
        if (screenshots) {
          await page.screenshot({ path: path.join(screenshots, `landing-v5-${width}-advertiser.png`), fullPage: true });
        }
      }
    });

    await check('Advertiser CSS zoom200% stress preserves reflow and keyboard controls in portrait, landscape and desktop', async () => {
      await assertCssZoomReflow(page, {
        label: 'Advertiser',
        essentialSelectors: ['#hero-title', '#budget-total', '#campaign-city', '#campaign-objective',
          '#campaign-screens', '#campaign-months', '#campaign-production'],
        controlSelectors: ['.landing-hero-actions a[href="#experiencia"]', 'header a[href="/advertiser/login"]',
          '#campaign-city', '#campaign-objective', '#campaign-screens', '#campaign-months', '#campaign-production'],
        exerciseControls: async scenario => {
          const assertNarrowPreviewFlow = async () => {
            const summary = await page.locator('.landing-preview-summary').evaluate(element => {
              const entries = Array.from(element.children);
              const box = node => {
                const rect = node.getBoundingClientRect();
                return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
              };
              return { width: element.clientWidth, box: box(element), pairs: entries
                .filter((_, index) => index % 2 === 0)
                .map((label, index) => ({ label: box(label), price: box(entries[index * 2 + 1]) })) };
            });
            assert.equal(summary.pairs.length, 2, `${scenario}: keep each of the two price/label pairs.`);
            if (summary.width <= 220) {
              for (const [index, pair] of summary.pairs.entries()) {
                assert.ok(pair.price.top >= pair.label.bottom - 1,
                  `${scenario}: narrow summary price ${index + 1} must appear below its label.`);
                assert.ok(pair.price.left >= summary.box.left - 1 && pair.price.right <= summary.box.right + 1,
                  `${scenario}: narrow summary price ${index + 1} must remain inside its row.`);
                if (index > 0) assert.ok(pair.label.top >= summary.pairs[index - 1].price.bottom - 1,
                  `${scenario}: the next summary label must not overlap the preceding price.`);
              }
              const option = await page.locator('.landing-production-option').evaluate(element => {
                const text = element.querySelector('span');
                const rect = text.getBoundingClientRect();
                const card = element.getBoundingClientRect();
                return { left: rect.left, right: rect.right, cardLeft: card.left, cardRight: card.right,
                  content: text.scrollWidth, width: text.clientWidth };
              });
              assert.ok(option.left >= option.cardLeft - 1 && option.right <= option.cardRight + 1
                && option.content <= option.width + 1,
              `${scenario}: production label text must fit inside its option without clipping.`);
            }
          };
          await assertNarrowPreviewFlow();
          for (const [id, alternate] of [['campaign-city', 'stgo'], ['campaign-objective', 'launch']]) {
            const control = page.locator(`#${id}`);
            const original = await control.inputValue();
            await control.selectOption(alternate);
            assert.equal(await control.inputValue(), alternate, `${scenario}: ${id} remains usable.`);
            await control.selectOption(original);
          }
          for (const id of ['campaign-screens', 'campaign-months']) {
            const control = page.locator(`#${id}`);
            const original = Number(await control.inputValue());
            const before = amount(await page.locator('#budget-total').innerText());
            const next = original < Number(await control.getAttribute('max')) ? original + 1 : original - 1;
            await setRangeWithKeyboard(control, next);
            assert.notEqual(amount(await page.locator('#budget-total').innerText()), before,
              `${scenario}: ${id} must update the estimate.`);
            await setRangeWithKeyboard(control, original);
            assert.equal(amount(await page.locator('#budget-total').innerText()), before);
          }
          const production = page.locator('#campaign-production');
          const checked = await production.isChecked();
          const before = amount(await page.locator('#budget-total').innerText());
          await production.focus();
          await production.press('Space');
          assert.equal(await production.isChecked(), !checked);
          assert.notEqual(amount(await page.locator('#budget-total').innerText()), before);
          assert.equal(await production.evaluate(element => document.activeElement === element), true);
          await assertNarrowPreviewFlow();
          await production.press('Space');
          assert.equal(await production.isChecked(), checked);
          assert.equal(amount(await page.locator('#budget-total').innerText()), before);
          assert.equal(await production.evaluate(element => document.activeElement === element), true);
          await assertNarrowPreviewFlow();
        },
        capture: screenshots ? size => page.screenshot({
          path: path.join(screenshots, `landing-v5-${size.width}x${size.height}-advertiser-css-zoom200-stress.png`),
          fullPage: true,
        }) : undefined,
      });
    });

    await check('Reduced motion suppresses nontrivial running animation', async () => {
      assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
      assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto');
      const moving = await page.evaluate(() => document.querySelector('main').parentElement
        .getAnimations({ subtree: true }).filter(animation => {
        const duration = animation.effect?.getComputedTiming().duration;
        return animation.playState === 'running' && typeof duration === 'number' && duration > 1;
      }).length);
      assert.equal(moving, 0);
      assert.equal(await page.evaluate(() => window.__landingAmountAnimations.length), 0,
        'Reduced motion must skip amount feedback for every preceding keyboard interaction.');
    });

    await check('Normal motion gives one 180ms amount response after a change, with no entrance animation or focus loss', async () => {
      const normal = await browser.newContext({ viewport: { width: 1440, height: 1000 },
        reducedMotion: 'no-preference', serviceWorkers: 'block' });
      const normalEvidence = evidenceCollector();
      await guardContext(normal, base, normalEvidence);
      await installAmountFeedbackProbe(normal, '#budget-total');
      const normalPage = await normal.newPage();
      recordErrors(normalPage, normalEvidence);
      try {
        const response = await normalPage.goto(base.href, { waitUntil: 'networkidle', timeout: 60_000 });
        assert.equal(response.status(), 200);
        await rejectCookies(normalPage);
        await assertAmountFeedback(normalPage, { outputSelector: '#budget-total',
          inputSelector: '#campaign-screens', nextValue: 4, nextAmount: 20000 });

        // Real scroll in both directions, not just source-level assertions.
        const motionStory = normalPage.locator('#motion-story');
        assert.equal(await motionStory.count(), 1);
        await normalPage.waitForFunction(() =>
          document.querySelector('#motion-story')?.getAttribute('data-motion-ready') === 'true');
        const motionOpacityAt = async (fraction, stage) => {
          await normalPage.evaluate(async ratio => {
            const element = document.querySelector('#motion-story');
            if (!element) throw new Error('Missing public scroll story.');
            document.documentElement.style.scrollBehavior = 'auto';
            const start = scrollY + element.getBoundingClientRect().top;
            const span = element.getBoundingClientRect().height - innerHeight;
            window.scrollTo(0, start + Math.max(1, span) * ratio);
            await new Promise(resolve => requestAnimationFrame(() =>
              requestAnimationFrame(resolve)));
          }, fraction);
          return normalPage.locator('[data-tad-stage="' + stage + '"]').evaluate(
            element => Number.parseFloat(getComputedStyle(element).opacity));
        };
        for (const [fraction, dominant] of [[0.07, 'taxi'], [0.52, 'tablet'], [0.92, 'report'], [0.07, 'taxi']]) {
          const opacity = await motionOpacityAt(fraction, dominant);
          assert.ok(opacity >= 0.7, dominant + ' should be the visible stage at progress ' + fraction + ': ' + opacity);
        }
        const stickyTop = await normalPage.locator('#motion-story > div:first-child')
          .evaluate(element => Number.parseFloat(getComputedStyle(element).top));
        assert.ok(stickyTop >= 88 && stickyTop <= 92,
          'Pinned narrative must respect the 90px sticky navigation.');

        await assertNoSideEffects(normal, normalEvidence);
      } finally { await normal.close(); }
    });

    await check('Without JavaScript, advertiser heading and all controls remain opaque at all eight widths', async () => {
      const noJs = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: 'block',
        viewport: { width: 390, height: 844 } });
      const noJsEvidence = evidenceCollector();
      await guardContext(noJs, base, noJsEvidence);
      const staticPage = await noJs.newPage();
      const response = await staticPage.goto(base.href, { waitUntil: 'load', timeout: 60_000 });
      assert.equal(response.status(), 200);
      try {
        for (const width of VIEWPORT_WIDTHS) {
          await staticPage.setViewportSize({ width, height: width >= 1440 ? 1000 : 844 });
          for (const selector of ['#hero-title', '#campaign-city', '#campaign-objective',
            '#campaign-screens', '#campaign-months', '#campaign-production', '#budget-total']) {
            await assertOpaque(staticPage.locator(selector), `Advertiser no-JS ${width}px ${selector}`);
          }
          await assertAdvertiserLinks(staticPage);
          const chapters = staticPage.locator('#motion-story article');
          const art = chapters.locator('[data-static-art] svg');
          assert.equal(await art.count(), 3, 'Each static chapter must retain its editorial illustration');
          for (const illustration of await art.all()) {
            assert.equal(await illustration.getAttribute('aria-hidden'), 'true');
            const box = await illustration.boundingBox();
            assert.ok(box && box.width > 0 && box.height > 0, 'Static illustration is visible without JavaScript');
            assert.ok(Math.abs(box.width / box.height - 2) < 0.05, 'Static art keeps its intrinsic aspect ratio');
          }
          assert.equal(await chapters.count(), 3,
            'No-JS browser must retain all narrative chapters.');
          assert.equal(await chapters.first().isVisible(), true,
            'No-JS narrative may not disappear on any supported viewport.');
          await assertNoHorizontalOverflow(staticPage, `Advertiser no-JS ${width}px`);
          if (screenshots) await staticPage.screenshot({
            path: path.join(screenshots, `landing-v5-${width}-advertiser-no-js.png`), fullPage: true });
        }
        await assertNoSideEffects(noJs, noJsEvidence);
      } finally { await noJs.close(); }
    });

    await check('Slow 3G preserves content and readable simulation', async () => {
      const slow = await browser.newContext({ viewport: { width: 390, height: 844 },
        reducedMotion: 'reduce', serviceWorkers: 'block' });
      const slowEvidence = evidenceCollector();
      await guardContext(slow, base, slowEvidence);
      const slowPage = await slow.newPage();
      recordErrors(slowPage, slowEvidence);
      const session = await slow.newCDPSession(slowPage);
      await session.send('Network.enable');
      await session.send('Network.emulateNetworkConditions', { offline: false, latency: 400,
        downloadThroughput: 50 * 1024, uploadThroughput: 50 * 1024, connectionType: 'cellular3g' });
      await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await slowPage.goto(base.href, { waitUntil: 'load', timeout: 120_000 });
      await assertOpaque(slowPage.getByRole('heading', { level: 1 }), 'Advertiser slow-3G heading');
      await rejectCookies(slowPage);
      assert.equal(await slowPage.locator('#budget-total').count(), 1);
      assert.equal(await slowPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      await assertNoSideEffects(slow, slowEvidence);
      await slow.close();
    });

    await check('No private, remote or service worker side effects occurred', async () => {
      await assertNoSideEffects(context, evidence);
    });
    process.stdout.write(JSON.stringify({ result: 'PASS', utc: new Date().toISOString(),
      sha: gitSha(), dirtyWorkingTree: execFileSync('git', ['status', '--porcelain'],
        { cwd: ROOT, encoding: 'utf8' }).trim().length > 0,
      baseUrl: base.href, checks: results.length, screenshots,
      developmentHmrAllowed: process.env.LANDING_ALLOW_DEV_HMR === 'true',
      allowedDevelopmentHmrConnections: evidence.devHmr.length,
      checksRun: results,
      omitted: ['Authenticated portal sessions and RBAC backend execution', 'Real signup or payment',
        'Production and staging hosts', 'Full WCAG audit and assistive technology',
        'Native browser zoom certification', 'Lighthouse and field Core Web Vitals', 'Player offline licensing'] }, null, 2) + '\n');
  } catch (error) {
    process.stderr.write(`FAIL ${error.message}\n${results.length} earlier checks passed; remaining checks NOT RUN.\n`);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

module.exports = { localBaseUrl, loadChromium, outsideDirectory, gitSha, guardContext,
  evidenceCollector, recordErrors, assertNoSideEffects, main };
if (require.main === module) main().catch(error => {
  process.stderr.write(`FAIL ${error.message}\n`);
  process.exitCode = 1;
});
