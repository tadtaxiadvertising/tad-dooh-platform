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

const ROOT = path.resolve(__dirname, '..');
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
const ROLE_LABELS = ['Anunciante', 'Conductor', 'Flota'];

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
  for (const [name, values] of Object.entries(evidence)) {
    if (name === 'devHmr') continue; // Explicitly opted-in development transport only.
    assert.deepEqual(values, [], `${name}: blocked requests or browser errors were observed.`);
  }
}

async function assertProfileLinks(page, base) {
  const links = await page.locator('#perfiles a[href]').evaluateAll(elements =>
    elements.map(element => ({ href: element.getAttribute('href'), text: element.textContent.trim() })));
  const destination = href => new URL(href, base.href);
  assert.ok(links.some(link => destination(link.href).pathname === '/advertiser/login'),
    'An indexable advertiser login link must survive without JavaScript.');
  assert.ok(links.some(link => destination(link.href).origin === 'https://tad.driver.ibusiness.com.do'
    && destination(link.href).pathname === '/'), 'The driver landing must be linked canonically.');
  assert.ok(links.some(link => destination(link.href).origin === 'https://tad.adm.ibusiness.com.do'
    && destination(link.href).pathname === '/admin/login'), 'A safe admin login link must be indexable.');
  assert.equal(links.some(link => /onboarding/.test(link.href)), false,
    'This smoke expects the default signup gate to remain disabled.');
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
    });

    await check('Fresh visitor may reject optional cookies', () => rejectCookies(page));

    await check('Both role selectors update the same hero, experience and FAQ', async () => {
      const titles = new Set();
      const questions = new Set();
      for (const role of ROLE_LABELS) {
        await selectRole(hero, role);
        assert.equal(await panel.getByRole('button', { name: role, exact: true })
          .getAttribute('aria-pressed'), 'true');
        titles.add(await page.locator('#hero-title').innerText());
        questions.add(await page.locator('#preguntas summary').first().innerText());
      }
      assert.equal(titles.size, 3, 'Hero must tell a distinct story for each perspective.');
      assert.equal(questions.size, 3, 'The first FAQ must reflect the active perspective.');
      await selectRole(panel, 'Anunciante', true);
      assert.equal(await hero.getByRole('button', { name: 'Anunciante', exact: true })
        .getAttribute('aria-pressed'), 'true');
    });

    await check('Campaign story has four controllable keyboard steps', async () => {
      const story = page.locator('#recorrido-campana');
      const steps = story.locator('button[aria-pressed]');
      assert.equal(await steps.count(), 4);
      const stageTitles = new Set();
      for (let index = 0; index < 4; index += 1) {
        const step = steps.nth(index);
        await step.focus();
        await step.press('Enter');
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
    });

    await check('Advertiser lab exposes honest bounded budget, city and objective', async () => {
      await selectRole(panel, 'Anunciante');
      const budget = panel.getByLabel('Presupuesto de campaña', { exact: true });
      assert.equal(await budget.getAttribute('min'), '5000');
      assert.equal(await budget.getAttribute('max'), '150000');
      assert.equal(amount(await panel.locator('#budget-total').innerText()), 25000);
      assert.ok(await budget.getAttribute('aria-valuetext'), 'Currency range needs a spoken value.');
      await pressRange(budget, 'End', 150000);
      assert.equal(amount(await panel.locator('#budget-total').innerText()), 150000);
      await pressRange(budget, 'Home', 5000);
      assert.equal(amount(await panel.locator('#budget-total').innerText()), 5000);
      const city = panel.getByLabel('Ciudad de tu campaña', { exact: true });
      await city.selectOption('stgo');
      assert.equal(await city.inputValue(), 'stgo');
      const objective = panel.getByLabel('Objetivo del ejemplo', { exact: true });
      const options = await objective.locator('option').evaluateAll(elements => elements.map(element => element.value));
      assert.equal(options.length, 3);
      for (const value of options) {
        await objective.selectOption(value);
        assert.equal(await objective.inputValue(), value);
      }
      await panel.getByText('No estima alcance ni confirma disponibilidad', { exact: false })
        .waitFor({ state: 'visible' });
    });

    await check('Driver lab has 15 visual slots, CPA bounds and an exact gross breakdown', async () => {
      await selectRole(panel, 'Conductor');
      const slots = panel.getByLabel('Slots publicitarios', { exact: true });
      const cpa = panel.getByLabel('Eventos CPA validados', { exact: true });
      assert.equal(await slots.getAttribute('min'), '0');
      assert.equal(await slots.getAttribute('max'), '15');
      assert.equal(await cpa.getAttribute('max'), '100');
      assert.equal(await panel.locator('[data-slot-active]').count(), 15);
      assert.equal(amount(await panel.locator('#driver-total').innerText()), 4000);
      assert.equal(await panel.locator('[data-slot-active="true"]').count(), 8);
      await pressRange(slots, 'End', 15);
      await pressRange(cpa, 'Home', 0);
      await pressRange(cpa, 'ArrowRight', 1);
      await pressRange(cpa, 'ArrowRight', 2);
      assert.equal(amount(await panel.locator('#driver-total').innerText()), 8500);
      assert.equal(await panel.locator('[data-slot-active="true"]').count(), 15);
      await pressRange(cpa, 'End', 100);
      assert.equal(amount(await panel.locator('#driver-total').innerText()), 57500);
      await pressRange(slots, 'Home', 0);
      await pressRange(cpa, 'Home', 0);
      assert.equal(amount(await panel.locator('#driver-total').innerText()), 0);
      assert.equal(await panel.locator('[data-slot-active="true"]').count(), 0);
      await panel.getByText('No es una nómina ni un saldo', { exact: false }).waitFor({ state: 'visible' });
    });

    await check('Fleet demo stays synthetic, has two city scenarios and a local map', async () => {
      await selectRole(panel, 'Flota');
      await panel.getByText('Datos de demostración', { exact: false }).first().waitFor({ state: 'visible' });
      await panel.getByText('Esquema ilustrativo · sin GPS real', { exact: true }).waitFor({ state: 'visible' });
      for (const city of ['Santiago', 'Santo Domingo']) {
        const button = panel.getByRole('button', { name: city, exact: true });
        await button.click();
        assert.equal(await button.getAttribute('aria-pressed'), 'true');
      }
      await panel.getByText('un pago pendiente no cambia el color de conexión', { exact: false })
        .waitFor({ state: 'visible' });
      const devices = panel.getByRole('list', { name: 'Selecciona un dispositivo de demostración', exact: true });
      assert.equal(await devices.getByRole('button').count(), 5);
      for (const [device, answer, explanation] of [
        ['DEMO-01', 'Tiene una señal válida', /verde/],
        ['DEMO-02', 'Lleva menos de 24 h sin conexión', /amarillo/],
        ['DEMO-03', 'Pasaron 24 h o falta un dato válido', /Desde las 24 h/],
        ['DEMO-04', 'Pasaron 24 h o falta un dato válido', /No hay registro/],
        ['DEMO-05', 'Pasaron 24 h o falta un dato válido', /fecha.*no es válida/],
      ]) {
        await devices.getByRole('button', { name: new RegExp(device) }).click();
        await panel.getByRole('button', { name: answer, exact: true }).click();
        const feedback = await panel.locator('fieldset').getByRole('status').innerText();
        assert.match(feedback, /^Correcto\./);
        assert.match(feedback, explanation);
      }
      await panel.getByRole('button', { name: 'Santiago', exact: true }).click();
      assert.equal(await panel.locator('fieldset button[aria-pressed="true"]').count(), 0,
        'Changing city must reset the previous diagnosis.');
    });

    await check('Measurement education and contextual FAQ are accessible', async () => {
      assert.equal(await page.locator('#medicion article').count(), 3);
      const question = page.locator('#preguntas summary').first();
      await question.focus();
      await question.press('Enter');
      assert.equal(await question.evaluate(element => element.parentElement.open), true);
      assert.equal(await page.locator('input[type="password"], input[type="email"], input[type="tel"]').count(), 0,
        'Public demo must not collect identity or banking information.');
      await assertProfileLinks(page, base);
    });

    await check('Consent gates analytics and revocation stops new events', async () => {
      await page.evaluate(() => {
        window.__landingEvents = [];
        window.umami = { track: callback => window.__landingEvents.push(callback({})) };
      });
      await selectRole(panel, 'Anunciante');
      assert.equal(await page.evaluate(() => window.__landingEvents.length), 0);
      await page.getByRole('button', { name: 'Configuración de cookies', exact: true }).click();
      await page.getByRole('button', { name: 'Aceptar opcionales', exact: true }).click();
      const budget = panel.getByLabel('Presupuesto de campaña', { exact: true });
      await pressRange(budget, 'End', 150000);
      await selectRole(panel, 'Conductor', true);
      const slots = panel.getByLabel('Slots publicitarios', { exact: true });
      await pressRange(slots, 'End', 15);
      await hero.locator('a[href="#experiencia"]').click();
      const events = await page.evaluate(() => window.__landingEvents);
      assert.ok(events.length > 0, 'Consented interactions must produce analytics events.');
      assert.equal(events.find(event => event.name === 'budget_demo_used')?.data.budget, 150000);
      assert.equal(events.filter(event => event.name === 'perspective_selected').at(-1)?.data.role, 'driver');
      assert.equal(events.filter(event => event.name === 'earnings_demo_used').at(-1)?.data.slots, 15);
      assert.equal(events.filter(event => event.name === 'cta_clicked').at(-1)?.data.role, 'driver');
      assert.equal(events.some(event => /onboarding_(started|completed)/.test(event.name || '')), false,
        'Exploring a public demo must not claim an official onboarding transition.');
      for (const event of events) {
        const fields = Object.keys(event.data || {});
        assert.equal(fields.some(field => /email|phone|password|token|rnc|bank|cedula|cédula/i.test(field)), false);
        assert.equal(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(JSON.stringify(event)), false);
      }
      const count = events.length;
      await slots.focus();
      await slots.press('Tab');
      assert.equal(await page.evaluate(() => window.__landingEvents.length), count,
        'Leaving an unchanged slider must not duplicate the event.');
      await page.getByRole('button', { name: 'Configuración de cookies', exact: true }).click();
      await rejectCookies(page);
      await selectRole(panel, 'Flota');
      assert.equal(await page.evaluate(() => window.__landingEvents.length), count);
    });

    await check('All perspectives fit 320, 390, 768 and 1440 pixel viewports', async () => {
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: width >= 1440 ? 1000 : 844 });
        for (const role of ROLE_LABELS) {
          await selectRole(panel, role);
          const sizes = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: innerWidth }));
          assert.ok(sizes.document <= sizes.viewport + 1,
            `${width}px ${role}: ${sizes.document}px content exceeds viewport.`);
          if (screenshots && [390, 1440].includes(width)) {
            await page.screenshot({ path: path.join(screenshots,
              `landing-v3-${width}-${role.toLowerCase()}.png`), fullPage: true });
          }
        }
      }
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
    });

    await check('Without JavaScript, all three profiles retain copy and safe links', async () => {
      const noJs = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: 'block',
        viewport: { width: 390, height: 844 } });
      const noJsEvidence = evidenceCollector();
      await guardContext(noJs, base, noJsEvidence);
      const staticPage = await noJs.newPage();
      const response = await staticPage.goto(base.href, { waitUntil: 'load', timeout: 60_000 });
      assert.equal(response.status(), 200);
      await staticPage.getByRole('heading', { level: 1 }).waitFor({ state: 'visible' });
      assert.equal(await staticPage.locator('#perfiles article').count(), 3);
      await assertProfileLinks(staticPage, base);
      const profiles = await staticPage.locator('#perfiles').innerText();
      for (const term of [/anunciant/i, /conductor|taxista/i, /flota/i]) assert.match(profiles, term);
      assert.equal(await staticPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      await assertNoSideEffects(noJs, noJsEvidence);
      await noJs.close();
    });

    await check('Slow 3G and CPU slowdown preserve root content and a working selector', async () => {
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
      await slowPage.getByRole('heading', { level: 1 }).waitFor({ state: 'visible' });
      await rejectCookies(slowPage);
      await selectRole(slowPage.locator('#experiencia'), 'Conductor', true);
      assert.equal(await slowPage.locator('#driver-total').count(), 1);
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
        'Lighthouse and field Core Web Vitals', 'Player offline licensing'] }, null, 2) + '\n');
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
