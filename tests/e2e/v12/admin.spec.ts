/**
 * Suite E2E — Portal Admin (v12)
 * Casos:
 *   ADM_01 — Login y Command Center.
 *   ADM_02 — Crear conductor vía "Nuevo Socio" (prepara DRV_01/DRV_02).
 *
 * Requiere credenciales reales (auth contra Supabase):
 *   TAD_ADMIN_EMAIL (default admin@tad.do) y TAD_ADMIN_PASSWORD.
 */
import { test, expect } from '@playwright/test';
import { ENV_URLS } from '../playwright.config';
import { startCase, finalizeCase, installApiWatcher } from './lib/report';
import { loginAsAdmin } from './lib/admin-helpers';
import { snapshot, randomPhone, randomCedula, randomPlate, defaultDriverPassword } from './lib/helpers';
import { writeSharedState } from './lib/storage';

const ADMIN_EMAIL = process.env.TAD_ADMIN_EMAIL || 'admin@tad.do';
const ADMIN_PASSWORD = process.env.TAD_ADMIN_PASSWORD || '';

test.describe('Portal Admin', () => {
  test.skip(!ADMIN_PASSWORD, 'TAD_ADMIN_PASSWORD no configurada');

  test('ADM_01 — Login y Command Center', async ({ page }) => {
    const c = startCase('admin', 'ADM_01', 'Login y Command Center');
    installApiWatcher(page, c);
    const t0 = Date.now();
    try {
      await loginAsAdmin(page, c, ADMIN_EMAIL, ADMIN_PASSWORD);
      await expect(page.getByRole('heading', { name: 'Command Center' })).toBeVisible({
        timeout: 30_000,
      });
      c.addStep('Dashboard visible', 'pass', 'Command Center');
      const shots = [await snapshot(page, 'ADM_01', 'command-center')];
      finalizeCase(c, true, Date.now() - t0, shots);
    } catch (e) {
      const shots = [await snapshot(page, 'ADM_01', 'error')];
      finalizeCase(c, false, Date.now() - t0, shots);
      throw e;
    }
  });

  test('ADM_02 — Crear conductor (Nuevo Socio)', async ({ page }) => {
    const c = startCase('admin', 'ADM_02', 'Crear conductor (Nuevo Socio)');
    installApiWatcher(page, c);
    const t0 = Date.now();
    try {
      await loginAsAdmin(page, c, ADMIN_EMAIL, ADMIN_PASSWORD);

      await page.goto(`${ENV_URLS.admin}/admin/drivers`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'Nuevo Socio' }).click();

      const phone = randomPhone();
      const driverName = `E2E Conductor ${phone.slice(-4)}`;
      const plate = randomPlate();
      const password = defaultDriverPassword(phone);

      const modal = page.locator('div.fixed.inset-0.z-\\[1000\\]');
      await expect(modal).toBeVisible({ timeout: 30_000 });
      await modal.getByPlaceholder(/Juan P/).fill(driverName);
      await modal.getByPlaceholder('Ej: 8091234567').fill(phone);
      await modal.getByPlaceholder('001-0000000-0').fill(randomCedula());
      await modal.getByPlaceholder('Ej: A123456').fill(plate);

      await Promise.all([
        page.waitForResponse(
          (r) => r.url().includes('/api/proxy/drivers') && r.request().method() === 'POST' && r.status() < 400,
          { timeout: 45_000 },
        ),
        modal.getByRole('button', { name: 'Confirmar Registro' }).click(),
      ]);

      await expect(page.getByText('SOCIO REGISTRADO', { exact: false }).first()).toBeVisible({
        timeout: 30_000,
      });
      c.addStep('Conductor registrado', 'pass', `${driverName} · ${phone}`);

      writeSharedState({ driverPhone: phone, driverPassword: password, driverName });
      c.addNote(`Teléfono compartido para DRV: ${phone}`);

      const shots = [await snapshot(page, 'ADM_02', 'conductor-creado')];
      finalizeCase(c, true, Date.now() - t0, shots);
    } catch (e) {
      const shots = [await snapshot(page, 'ADM_02', 'error')];
      finalizeCase(c, false, Date.now() - t0, shots);
      throw e;
    }
  });
});
