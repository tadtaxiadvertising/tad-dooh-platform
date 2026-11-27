#!/usr/bin/env node
'use strict';
// LANDING_BASE_URL=http://127.0.0.1:3003 node scripts/creative-preview-smoke.cjs
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = new URL(process.env.LANDING_BASE_URL || 'http://127.0.0.1:3003/');
assert.ok(['localhost', '127.0.0.1'].includes(base.hostname), 'Only loopback is allowed');
assert.equal(base.pathname, '/');
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const requests = [];
    await context.route('**/*', route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.protocol === 'blob:' || url.protocol === 'data:') return route.continue();
      if (url.origin !== base.origin || !['GET', 'HEAD'].includes(request.method()) || url.pathname.startsWith('/api/')) {
        requests.push(request.method() + ' ' + url.origin + url.pathname);
        return route.abort();
      }
      return route.continue();
    });
    const page = await context.newPage();
    await page.goto(base.href);
    const input = page.locator('#creative-preview-file');
    await input.waitFor();
    await input.setInputFiles({ name: 'sample.png', mimeType: 'image/png', buffer: Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63f87f95e13f00077f02d4680bdf0b0000000049454e44ae426082', 'hex') });
    const preview = page.getByAltText('Vista previa de la creatividad seleccionada');
    await page.waitForFunction(() => {
      const image = document.querySelector('img[alt="Vista previa de la creatividad seleccionada"]');
      return image && image.complete && image.naturalWidth > 0;
    });
    assert.equal(await preview.count(), 1);
    await page.getByRole('button', { name: 'Llenar pantalla' }).click();
    assert.equal(await page.getByRole('button', { name: 'Llenar pantalla' }).getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: 'Quitar' }).click();
    assert.equal(await page.getByAltText('Vista previa de la creatividad seleccionada').count(), 0);
    await input.setInputFiles({ name: 'bad.txt', mimeType: 'text/plain', buffer: Buffer.from('bad') });
    assert.match(await page.getByRole('alert').innerText(), /Formato no admitido/);
    await input.setInputFiles({ name: 'sample.png', mimeType: 'image/png', buffer: Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63f87f95e13f00077f02d4680bdf0b0000000049454e44ae426082', 'hex') });
    await page.waitForFunction(() => {
      const image = document.querySelector('img[alt="Vista previa de la creatividad seleccionada"]');
      return image && image.complete && image.naturalWidth > 0;
    });
    const corrupt = { name: 'corrupt.png', mimeType: 'image/png', buffer: Buffer.from('not a PNG') };
    for (let attempt = 0; attempt < 2; attempt++) {
      await input.setInputFiles(corrupt);
      const alert = page.getByRole('alert').filter({ hasText: 'El navegador no pudo abrir esta imagen' });
      await alert.waitFor({ state: 'visible' });
      await preview.waitFor({ state: 'detached' });
      assert.equal(await input.inputValue(), '', 'Invalid selection can be retried');
      await input.setInputFiles({ name: 'sample.png', mimeType: 'image/png', buffer: Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63f87f95e13f00077f02d4680bdf0b0000000049454e44ae426082', 'hex') });
      await page.waitForFunction(() => {
        const image = document.querySelector('img[alt="Vista previa de la creatividad seleccionada"]');
        return image && image.complete && image.naturalWidth > 0;
      });
      await alert.waitFor({ state: 'detached' });
    }
    assert.equal(await page.locator('body').evaluate(el => el.scrollWidth <= window.innerWidth), true, 'Mobile overflow');
    assert.deepEqual(requests, [], 'Preview must not send requests');
    await context.close();
    process.stdout.write('PASS creative preview smoke\n');
  } finally { await browser.close(); }
})().catch(error => { process.stderr.write(error.stack + '\n'); process.exitCode = 1; });
