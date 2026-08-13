/**
 * Suite E2E — Portal Driver (v12)
 * Casos:
 *   DRV_01 — Login por teléfono + aceptación del contrato V2.
 *   DRV_02 — Flujo bancario offline-first: guardado local sin red, auto-sync
 *            al reconectar y verificación de extremo a extremo.
 *
 * Requiere que ADM_02 haya creado el conductor (estado compartido).
 */
import { test, expect } from '@playwright/test';
import { startCase, finalizeCase, installApiWatcher } from './lib/report';
import {
  loginAsDriver,
  waitForOnboardingModal,
  acceptContractIfNeeded,
  waitForStage,
  fillBankWizard,
  setOffline,
  setOnline,
  anyBankPendingValue,
} from './lib/driver-helpers';
import { snapshot } from './lib/helpers';
import { readSharedState } from './lib/storage';

test.describe('Portal Driver', () => {
  test('DRV_01 — Login y aceptación de contrato', async ({ page }) => {
    const state = readSharedState();
    test.skip(!state.driverPhone || !state.driverPassword, 'Requiere ADM_02 (conductor creado)');

    const c = startCase('driver', 'DRV_01', 'Login y aceptación de contrato');
    installApiWatcher(page, c);
    const t0 = Date.now();
    try {
      await loginAsDriver(page, c, state.driverPhone!, state.driverPassword!);
      await waitForOnboardingModal(page);
      await acceptContractIfNeeded(page, c);
      await waitForStage(page, 'Configura tu banco con modo offline-first');
      c.addStep('Etapa bank alcanzada', 'pass', 'Después del contrato V2');
      const shots = [await snapshot(page, 'DRV_01', 'onboarding-bank')];
      finalizeCase(c, true, Date.now() - t0, shots);
    } catch (e) {
      const shots = [await snapshot(page, 'DRV_01', 'error')];
      finalizeCase(c, false, Date.now() - t0, shots);
      throw e;
    }
  });

  test('DRV_02 — Banco offline-first y sincronización', async ({ page }) => {
    const state = readSharedState();
    test.skip(!state.driverPhone || !state.driverPassword, 'Requiere ADM_02 (conductor creado)');

    const c = startCase('driver', 'DRV_02', 'Banco offline-first y sincronización');
    installApiWatcher(page, c);
    const t0 = Date.now();
    try {
      await loginAsDriver(page, c, state.driverPhone!, state.driverPassword!);
      await waitForOnboardingModal(page);
      await acceptContractIfNeeded(page, c);
      await waitForStage(page, 'Configura tu banco con modo offline-first');

      // ── Fase offline ──────────────────────────────────────────────────────
      await setOffline(page);
      await expect(page.getByText('Sin conexión · los datos se guardarán localmente')).toBeVisible({
        timeout: 15_000,
      });
      c.addStep('Red desconectada', 'pass', 'navigator.onLine=false');

      await fillBankWizard(page, c, {
        banco: 'Banco Popular Dominicano',
        cuenta: '012345678901',
        tipo: 'Ahorros',
        owner: 'E2E Conductor',
        cedula: '00123456789',
      });

      await expect(page.getByText('Guardado sin conexión')).toBeVisible({ timeout: 30_000 });
      c.addStep('Guardado offline confirmado', 'pass', 'panel "Guardado sin conexión"');

      expect(await anyBankPendingValue(page)).toBe('1');
      c.addStep('Pending key en localStorage', 'pass', 'tad_driver_bank_pending_*=1');

      // El modal avanza a 'payment' tras onSuccess (1800ms) con bankPendingSync=true.
      await waitForStage(page, 'Solo falta activar la anualidad del Starter Kit');
      c.addStep('Stage payment (pendiente de sync)', 'pass');

      // ── Reconexión + auto-sync ────────────────────────────────────────────
      const putResp = page.waitForResponse(
        (r) => r.url().includes('/api/proxy/wallet/bank') && r.request().method() === 'PUT',
        { timeout: 60_000 },
      );
      await setOnline(page);
      const resp = await putResp;
      c.addStep('Reconexión + sync', resp.ok() ? 'pass' : 'fail', `PUT /wallet/bank → ${resp.status()}`);

      expect(resp.ok(), `Sync PUT /wallet/bank devolvió ${resp.status()}`).toBe(true);

      // La app recarga automáticamente al reconectar tras sincronizar la cola
      // offline (fix a5f6c955: offlineQueue.ts). NO forzamos page.reload()
      // manual para no colisionar con esa navegación (net::ERR_ABORTED).
      // Esperamos el hub refrescado: bankAccountConfigured=true y la clave
      // pendiente debe desaparecer. Verificación de extremo a extremo.
      await expect(page.getByText('Preparación operativa del conductor')).toBeVisible({ timeout: 60_000 });
      await expect(page.getByText('Cuenta registrada y confirmada por el backend.')).toBeVisible({
        timeout: 60_000,
      });
      await page.waitForFunction(
        () => !Object.keys(localStorage).some((k) => k.startsWith('tad_driver_bank_pending_')),
        undefined,
        { timeout: 60_000 },
      );
      expect(await anyBankPendingValue(page)).toBeNull();
      c.addStep('Sync verificado en UI', 'pass', 'Cuenta registrada por el backend');

      const shots = [await snapshot(page, 'DRV_02', 'offline-first-synced')];
      finalizeCase(c, true, Date.now() - t0, shots);
    } catch (e) {
      const shots = [await snapshot(page, 'DRV_02', 'error')];
      finalizeCase(c, false, Date.now() - t0, shots);
      throw e;
    }
  });
});
