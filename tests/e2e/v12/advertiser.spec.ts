/**
 * Suite E2E — Portal Advertiser (v12)
 * Casos:
 *   ADV_01 — Login y dashboard BI.
 *   ADV_02 — Solicitar una nueva campaña (portal-requests).
 *
 * Requiere credenciales reales (auth contra Supabase):
 *   TAD_ADVERTISER_EMAIL y TAD_ADVERTISER_PASSWORD.
 */
import { test, expect } from '@playwright/test';
import { ENV_URLS } from '../playwright.config';
import { startCase, finalizeCase, installApiWatcher } from './lib/report';
import { loginAsAdvertiser } from './lib/advertiser-helpers';
import { snapshot } from './lib/helpers';

const ADVERTISER_EMAIL = process.env.TAD_ADVERTISER_EMAIL || '';
const ADVERTISER_PASSWORD = process.env.TAD_ADVERTISER_PASSWORD || '';

test.describe('Portal Advertiser', () => {
  test.skip(!ADVERTISER_EMAIL || !ADVERTISER_PASSWORD, 'Credenciales advertiser no configuradas');

  test('ADV_01 — Login y dashboard BI', async ({ page }) => {
    const c = startCase('advertiser', 'ADV_01', 'Login y dashboard BI');
    installApiWatcher(page, c);
    const t0 = Date.now();
    try {
      await loginAsAdvertiser(page, c, ADVERTISER_EMAIL, ADVERTISER_PASSWORD);
      await expect(page.getByText('Military Grade Analytics')).toBeVisible({ timeout: 30_000 });
      c.addStep('Dashboard BI visible', 'pass', 'Military Grade Analytics');
      const shots = [await snapshot(page, 'ADV_01', 'dashboard-bi')];
      finalizeCase(c, true, Date.now() - t0, shots);
    } catch (e) {
      const shots = [await snapshot(page, 'ADV_01', 'error')];
      finalizeCase(c, false, Date.now() - t0, shots);
      throw e;
    }
  });

  test('ADV_02 — Solicitar nueva campaña', async ({ page }) => {
    const c = startCase('advertiser', 'ADV_02', 'Solicitar nueva campaña');
    installApiWatcher(page, c);
    const t0 = Date.now();
    try {
      await loginAsAdvertiser(page, c, ADVERTISER_EMAIL, ADVERTISER_PASSWORD);

      await page.goto(`${ENV_URLS.advertiser}/advertiser/campaigns`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'Nueva campaña' }).click();

      const modal = page.locator('div.fixed.inset-0.z-\\[1000\\]');
      await expect(modal).toBeVisible({ timeout: 30_000 });

      const name = `E2E Campaña ${Date.now().toString().slice(-6)}`;
      const today = new Date().toISOString().slice(0, 10);
      const end = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);

      await modal.getByPlaceholder('Ex: Ofertas Verano 2026').fill(name);
      await modal.locator('select').selectOption({ label: 'Retail' });
      await modal.locator('input[type="date"]').nth(0).fill(today);
      await modal.locator('input[type="date"]').nth(1).fill(end);
      await modal.getByPlaceholder('https://su-servidor.com/anuncio.mp4').fill(
        'https://media.example.com/tad-e2e.mp4',
      );
      await modal.getByPlaceholder('Describe el objetivo de tu pauta...').fill(
        'Campaña E2E de verificación del flujo de aprobación.',
      );

      let dialogText = '';
      page.once('dialog', async (dialog) => {
        dialogText = dialog.message();
        await dialog.accept();
      });

      await Promise.all([
        page.waitForResponse(
          (r) => r.url().includes('/api/proxy/portal-requests') && r.request().method() === 'POST' && r.status() < 400,
          { timeout: 45_000 },
        ),
        modal.getByRole('button', { name: 'Solicitar Aprobación' }).click(),
      ]);

      await expect(page.getByText('Nueva campaña')).toBeVisible({ timeout: 30_000 });
      c.addStep('Solicitud enviada', 'pass', name);
      if (dialogText) c.addNote(`Alert: ${dialogText.slice(0, 120)}`);

      const shots = [await snapshot(page, 'ADV_02', 'campana-solicitada')];
      finalizeCase(c, true, Date.now() - t0, shots);
    } catch (e) {
      const shots = [await snapshot(page, 'ADV_02', 'error')];
      finalizeCase(c, false, Date.now() - t0, shots);
      throw e;
    }
  });
});
