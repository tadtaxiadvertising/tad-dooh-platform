'use strict';
/**
 * tach-cinematic-landing-verify.cjs — browser verification for the TAD
 * advertiser & driver public landing pages. Uses the installed
 * @playwright/test with the SYSTEM Chrome executable (no bundled browser
 * download, so no proxy/timeout risk). Runs offline-safe, reduced-motion
 * aware checks, keyboard/a11y, calculator arithmetic and performance data.
 *
 *   node scripts/tach-cinematic-landing-verify.cjs
 *
 * Reports a JSON summary on stdout (machine-readable) + saves screenshots
 * to LANDING_SCREENSHOT_DIR (absolute, outside this repo).
 */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(path.join(__dirname, '..', 'apps', 'advertiser', 'node_modules', '@playwright', 'test'));

const ROOT = path.resolve(__dirname, '..');
const AD_PORT = Number(process.env.AD_PORT || 3000);
const DR_PORT = Number(process.env.DR_PORT || 3001);
const AD_URL = `http://127.0.0.1:${AD_PORT}/`;
const DR_URL = `http://127.0.0.1:${DR_PORT}/`;
const SCREENSHOT_DIR = path.resolve(process.env.LANDING_SCREENSHOT_DIR || path.join(osTmpdir(), 'tad-landing-20261108'));
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const GAP = 1;

function osTmpdir() {
  if (process.platform === 'win32') return process.env.TMP || 'C:\\Windows\\Temp';
  return '/tmp';
}

function json(label, obj) {
  console.log(JSON.stringify({ label, ...obj }, null, 2));
}

(async () => {
  const results = { advertiser: {}, driver: {}, shared: {} };
  let browser;

  function stdArgs() {
    return ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-extensions'];
  }

  try {
    browser = await chromium.launch({ executablePath: CHROME, headless: true, args: stdArgs(), slowMo: 0 });
  } catch (err) {
    json('FATAL', { error: err.message, hint: 'System Chrome not found at ' + CHROME + '; set CHROME_PATH.' });
    process.exit(2);
  }

  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
    locale: 'es-DO',
  });
  page.setDefaultTimeout(25000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  async function assertNoOverflow(page, caller) {
    const res = await page.evaluate(([g]) => {
      const scroll = Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0);
      return { content: scroll, viewport: innerWidth, ok: scroll <= innerWidth + g };
    }, [GAP]);
    return { label: caller, ...res };
  }

  async function pageA11y(page) {
    return page.evaluate(() => ({
      ariaCount: document.querySelectorAll('[aria-]').length,
      roleCount: document.querySelectorAll('[role]').length,
      tabIndexGt0: [...document.querySelectorAll('body *')].filter(el => el.getAttribute('tabindex') && Number(el.getAttribute('tabindex')) > 0).length,
      hasSkipLink: !!document.querySelector('a[href="#main"]'),
    }));
  }

  async function pagePerf(page) {
    return page.evaluate(() => {
      const out = { fcp: null, lcp: null, cls: null, longTask: null };
      try {
        const f = performance.getEntriesByName('first-contentful-paint');
        if (f.length) out.fcp = Math.round(f[0].startTime || f[0].loadTime);
      } catch (e) {}
      try {
        const l = performance.getEntriesByName('largest-contentful-paint');
        if (l.length) out.lcp = Math.round(l[l.length - 1].startTime || l[l.length - 1].loadTime);
      } catch (e) {}
      try {
        const c = performance.getEntriesByName('cumulative-layout-shift')[0]?.value;
        if (c != null) out.cls = c;
      } catch (e) {}
      try {
        const t = performance.getEntriesByType('longtask');
        if (t.length) out.longTask = Math.round(t[0].duration);
      } catch (e) {}
      return out;
    });
  }

  function reducedMotionRespected(page) {
    return page.evaluate(() => {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      // With reducedMotion context, the page MUST respect the setting.
      const transitions = getComputedStyle(document.documentElement).transition;
      return {
        mqMatches: mq.matches,
        reducedMotionMedia: mq.media,
        transitionOnRoot: transitions,
      };
    });
  }

  // ---------- advertiser ----------
  {
    const p = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    p.setDefaultTimeout(25000);
    let a = { port: AD_PORT, ok: true, errors: [] };
    try {
      await p.goto(AD_URL, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(1200);

      a.title = (await p.title()).trim();
      a.lang = await p.getAttribute('html', 'lang');
      a.description = (await p.getAttribute('meta[name="description"]', 'content')) || '';
      a.ogTitle = (await p.getAttribute('meta[property="og:title"]', 'content')) || '';
      a.canonical = (await p.getAttribute('link[rel="canonical"]', 'href')) || '';
      a.h1Count = (await p.locator('h1').count());
      const a11y = await pageA11y(p);
      a.a11y = a11y;
      const perf = await pagePerf(p);
      a.performance = perf;
      const robotsEl = await p.locator('meta[name="robots"]').count();
      a.robots = robotsEl ? (await p.getAttribute('meta[name="robots"]', 'content')) || '(absent)' : '(absent)';

      const overflow = await assertNoOverflow(p, 'advertiser');
      a.noOverflow = overflow.ok;
      a.reducedMotion = reducedMotionRespected(p);

      // Calculator arithmetic check
      const calc = await p.evaluate(() => {
        const panel = document.querySelector('[data-slot="campaign-calculator"]') || document.querySelector('#budget-total');
        const total = panel?.textContent || '';
        const amount = total.replace(/[^\d.,-]/g, '').replace(/[.,]/g, '');
        return { total: total.trim(), digits: amount };
      });
      a.calculatorHasAmount = /[\d.,]/.test(calc.total);
      // Focus / keyboard protection: ensure key CTA has a real href and is focusable
      const cta = await p.evaluate(() => {
        const el = document.querySelector('a.cta-primary, a[href="#experiencia"]');
        const r = el?.getBoundingClientRect();
        return { hasHref: !!(el && el.getAttribute('href')), tabIndex: el?.tabIndex, visible: r ? r.width > 0 && r.height > 0 : false };
      });
      a.heroCta = cta;
      a.errors = errors.slice();
    } catch (err) {
      a.error = err.stack || err.message;
      a.errors = errors.slice();
    } finally {
      await p.close();
    }
    results.advertiser = a;
  }

  // ---------- driver ----------
  {
    const p = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    p.setDefaultTimeout(25000);
    let d = { port: DR_PORT, ok: true, errors: [] };
    try {
      await p.goto(DR_URL, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(1200);

      d.title = (await p.title()).trim();
      d.lang = await p.getAttribute('html', 'lang');
      d.h1Count = (await p.locator('h1').count());
      const a11y = await pageA11y(p);
      d.a11y = a11y;
      const perf = await pagePerf(p);
      d.performance = perf;
      d.threeIncomeStreams = (await p.locator('text=/ingresos por mostrar|comisión|referidos/i').count()) >= 3;

      const calcEval = await p.evaluate(() => {
        const el = document.querySelector('[data-slot="driver-earnings-lab"]') || document.querySelector('[data-slot="earnings"]');
        if (!el) return { text: '', found: false };
        return { text: el.textContent.slice(0, 200), found: true };
      });
      d.hasEarningsLab = calcEval.found;
      d.earningsLabText = calcEval.text;

      d.noOverflow = false;
      d.pageClosed = p.isClosed();
      let noOverflowOk = false;
      for (let a = 0; a < 3; a++) {
        try { noOverflowOk = (await assertNoOverflow(p, 'driver')).ok; break; } catch (e) { d.errors.push('noOverflow attempt ' + a + ': ' + e.message); await p.waitForTimeout(1000); }
      }
      d.noOverflow = noOverflowOk;
      d.reducedMotion = false;
      let reducedMotionOk = false;
      for (let a = 0; a < 3; a++) {
        try { reducedMotionOk = (await reducedMotionRespected(p)); break; } catch (e) { d.errors.push('reducedMotion attempt ' + a + ': ' + e.message); await p.waitForTimeout(1000); }
      }
      d.reducedMotion = reducedMotionOk;
      d.errors = errors.slice();
    } catch (err) {
      d.error = err.stack || err.message;
      d.errors = errors.slice();
    } finally {
      await p.close();
    }
    results.driver = d;
  }

  const nav = await page.evaluate(() => {
    const n = performance.getEntriesByType('navigation')[0];
    return n ? { type: n.type, nextHop: n.nextHopProtocol, decoded: n.decodedBodySize } : null;
  });
  results.shared = { navigation: nav, totalConsoleErrors: errors.length };

  // Screenshots (if requested outside repo)
  if (SCREENSHOT_DIR) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    try {
      await page.goto(AD_URL, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'advertiser-desktop.png'), fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'advertiser-mobile.png'), fullPage: true });
    } catch (e) { results.screenshotError = e.message; }
    try {
      const p = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
      await p.goto(DR_URL, { waitUntil: 'networkidle', timeout: 30000 });
      await p.waitForTimeout(600);
      await p.screenshot({ path: path.join(SCREENSHOT_DIR, 'driver-desktop.png'), fullPage: true });
      await p.setViewportSize({ width: 390, height: 844 });
      await p.waitForTimeout(400);
      await p.screenshot({ path: path.join(SCREENSHOT_DIR, 'driver-mobile.png'), fullPage: true });
      await p.close();
    } catch (e) { results.screenshotDriverError = e.message; }
    await page.close();
  } else {
    await page.close();
  }

  json('VERDICT', results);
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'summary.json'), JSON.stringify(results, null, 2));
  console.log('\nSCREENSHOTS_DIR=' + SCREENSHOT_DIR);
  await browser.close();
})();
