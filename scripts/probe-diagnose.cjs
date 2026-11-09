'use strict';
const path = require('node:path');
const { chromium } = require(path.join(__dirname, '..', 'apps', 'advertiser', 'node_modules', '@playwright', 'test'));

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });
  const p = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  p.setDefaultTimeout(20000);
  const errors = [];
  p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const url = process.env.AD_URL || 'http://127.0.0.1:3000/';
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);

  const probes = [];
  probes.push('title=' + (await p.title()));
  probes.push('lang=' + (await p.getAttribute('html', 'lang')));
  try {
    const t1 = await p.evaluate(() => 'title=' + (document.title || ''));
    probes.push(t1);
  } catch (e) { probes.push('eval1 error=' + e.message); }
  try {
    const t2 = await p.evaluate(() => {
      const r = {};
      r.matchMedia = typeof window.matchMedia;
      try { r.mq = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e2) { r.mqErr = e2.message; }
      r.tagName = document.documentElement.tagName;
      r.lang = document.documentElement.lang;
      return r;
    });
    probes.push(t2);
  } catch (e) { probes.push('eval2 error=' + e.message); }
  try {
    const t3 = await p.evaluate(() => {
      const el = document.querySelector('[data-slot="driver-earnings-lab"]') || document.querySelector('[data-slot="earnings"]');
      return { found: !!el, text: el ? el.textContent.slice(0, 60) : '' };
    });
    probes.push('driverEarnings=' + JSON.stringify(t3));
  } catch (e) { probes.push('driverEarnings error=' + e.message); }
  try {
    const t4 = await p.evaluate(() => {
      const panel = document.querySelector('[data-slot="campaign-calculator"]') || document.querySelector('#budget-total');
      return { panel: !!panel, text: panel ? panel.textContent.slice(0, 60) : 'NONE' };
    });
    probes.push('calc=' + JSON.stringify(t4));
  } catch (e) { probes.push('calc error=' + e.message); }
  try {
    const t5 = await p.evaluate(() => {
      const h = document.querySelector('h1');
      return { h1: !!h, h1Text: h ? h.textContent.trim() : '', h1Parent: h ? h.parentElement.tagName : '' };
    });
    probes.push('h1=' + JSON.stringify(t5));
  } catch (e) { probes.push('h1 error=' + e.message); }
  probes.push('pageerrors=' + JSON.stringify(errors));
  console.log(probes.join('\n'));
  await browser.close();
})();
