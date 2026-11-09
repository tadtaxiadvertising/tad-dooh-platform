'use strict';
// Minimal launcher: launch system Chrome via playwright-executablePath and run a tiny check.
const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const url = process.env.AD_URL || 'http://127.0.0.1:3000/';
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => ({
    title: document.title,
    htmlLang: document.documentElement.lang,
    overflow: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0),
    innerWidth: window.innerWidth,
    htmlClass: (document.documentElement.className || '').slice(0, 80),
    reducedMotionMedia: getComputedStyle(document.documentElement).getPropertyValue('transition') === 'all 0.2s',
  }));
  console.log(JSON.stringify({ url, info, errors: errors.slice(0, 5) }, null, 2));
  await browser.close();
})();
