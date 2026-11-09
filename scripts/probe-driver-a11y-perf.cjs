'use strict';
// Probe: driver income/earnings section + a11y + performance metric landscape.
const path = require('node:path');
const { chromium } = require(path.join(__dirname, '..', 'apps', 'advertiser', 'node_modules', '@playwright', 'test'));

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });
  const p = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  p.setDefaultTimeout(25000);
  const url = process.env.AD_URL || 'http://127.0.0.1:3001/';
  await p.goto(url, { waitUntil: 'networkidle', timeout: 40000 });
  await p.waitForTimeout(1500);

  const r = await p.evaluate(() => {
    const slots = [...document.querySelectorAll('[data-slot]')].map(el => ({
      slot: el.getAttribute('data-slot'),
      text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
      tag: el.tagName.toLowerCase(),
    }));
    // income/earnings-related labels
    const econ = [...document.querySelectorAll('label, [data-testid], [role="status"], [role="progressbar"], [role="timer"]')];
    const econTxt = econ.map(el => ({
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute('role'),
      text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
      testid: el.getAttribute('data-testid'),
    }));
    const a11y = {
      ariaCount: document.querySelectorAll('[aria-]').length,
      roleCount: document.querySelectorAll('[role]').length,
      tabIndexGt0: [...document.querySelectorAll('body *')].filter(el => el.getAttribute('tabindex') && Number(el.getAttribute('tabindex')) > 0).length,
      hasFocusableSkip: !!document.querySelector('a[href="#main"]'),
      lang: document.documentElement.lang,
    };
    // performance metrics
    const perf = {
      fcp: null, lcp: null, cls: null, clsVal: null, longTask: null,
    };
    try {
      const fcpEntries = performance.getEntriesByName('first-contentful-paint');
      if (fcpEntries.length) perf.fcp = Math.round(fcpEntries[0].startTime || fcpEntries[0].loadTime);
    } catch (e) {}
    try {
      const lcpEntries = performance.getEntriesByName('largest-contentful-paint');
      if (lcpEntries.length) perf.lcp = Math.round(lcpEntries[lcpEntries.length - 1].startTime || lcpEntries[lcpEntries.length - 1].loadTime);
    } catch (e) {}
    try {
      const clsVal = performance.getEntriesByName('cumulative-layout-shift')[0]?.value;
      if (clsVal != null) perf.cls = clsVal;
    } catch (e) {}
    try {
      const lt = performance.getEntriesByType('longtask');
      if (lt.length) perf.longTask = Math.round(lt[0].duration);
    } catch (e) {}
    return { slots, econTxt, a11y, perf };
  });

  console.log('data-slots:');
  r.slots.forEach(s => console.log('  -', s.slot, '::', s.text));
  console.log('economic/earnings elements:');
  r.econTxt.forEach(e => console.log('  -', e.tag, 'role='+e.role, 'testid='+e.testid, '::', e.text));
  console.log('a11y:', JSON.stringify(r.a11y));
  console.log('perf:', JSON.stringify(r.perf));
  await browser.close();
})();
