/**
 * Helpers del portal Driver: login por teléfono, onboarding (contrato + banco)
 * y control offline/online real vía `context.setOffline`.
 */
import { Page, expect } from '@playwright/test';
import { ENV_URLS } from '../../playwright.config';
import { Case } from './report';

export async function openDriverLogin(page: Page): Promise<void> {
  await page.goto(`${ENV_URLS.driver}/driver/login`, { waitUntil: 'domcontentloaded' });
}

export async function loginAsDriver(
  page: Page,
  c: Case,
  phone: string,
  password: string,
): Promise<void> {
  const t0 = Date.now();
  await openDriverLogin(page);
  await page.locator('#login-phone').fill(phone);
  await page.locator('#login-password').fill(password);
  await Promise.all([
    page.waitForURL('**/driver/dashboard**', { timeout: 90_000 }),
    page.getByRole('button', { name: 'Iniciar Sesión' }).click(),
  ]);
  c.addStep('Login como conductor', 'pass', `${phone}`, Date.now() - t0);
}

export async function waitForOnboardingModal(page: Page): Promise<void> {
  await expect(page.getByText('Preparación operativa del conductor')).toBeVisible({
    timeout: 45_000,
  });
}

/** Lee el driverId desde el usuario almacenado en localStorage. */
export async function readDriverId(page: Page): Promise<string> {
  const raw = await page.evaluate(() => localStorage.getItem('tad_driver_user'));
  const user = raw ? JSON.parse(raw) : {};
  return String(user.id || user.entityId || user.driverId || '');
}

/** Espera a que el modal muestre la etapa indicada por su título. */
export async function waitForStage(page: Page, title: string): Promise<void> {
  await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 45_000 });
}

/**
 * Acepta el contrato V2 si el conductor está en la etapa 'contract'.
 * Si ya fue aceptado (corrida previa), no hace nada.
 */
export async function acceptContractIfNeeded(page: Page, c: Case): Promise<boolean> {
  const acceptBtn = page.getByRole('button', { name: 'Aceptar contrato y continuar' });
  const visible = await acceptBtn
    .isVisible({ timeout: 5_000 })
    .catch(() => false);
  if (!visible) {
    c.addStep('Contrato ya aceptado', 'pass', 'stage avanzó sin aceptar de nuevo');
    return false;
  }

  const t0 = Date.now();
  await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes('/api/proxy/drivers/') &&
        r.url().includes('/accept-agreement') &&
        r.request().method() === 'POST' &&
        r.status() < 400,
      { timeout: 45_000 },
    ),
    acceptBtn.click(),
  ]);
  c.addStep('Aceptar contrato V2', 'pass', 'stage → bank', Date.now() - t0);
  return true;
}

export interface BankWizardData {
  /** Label visible del banco, ej: 'Banco Popular Dominicano'. */
  banco: string;
  /** Número de cuenta: 10–20 dígitos. */
  cuenta: string;
  /** Label visible del tipo, ej: 'Ahorros' o 'Corriente'. */
  tipo: 'Ahorros' | 'Corriente';
  owner: string;
  /** Cédula de 11 dígitos. */
  cedula: string;
}

/**
 * Recorre los 5 pasos del wizard de BankForm (Banco/Cuenta/Tipo/Titular/Cédula)
 * y pulsa 'Guardar cuenta' en el último paso. No espera la respuesta.
 */
export async function fillBankWizard(page: Page, c: Case, data: BankWizardData): Promise<void> {
  const t0 = Date.now();
  const fields: Array<() => Promise<void>> = [
    async () => {
      await page.getByRole('button', { name: data.banco }).click();
    },
    async () => {
      await page.locator('#bank-cuenta').fill(data.cuenta);
    },
    async () => {
      await page.getByRole('button', { name: data.tipo }).click();
    },
    async () => {
      await page.locator('#bank-owner').fill(data.owner);
    },
    async () => {
      await page.locator('#bank-cedula').fill(data.cedula);
    },
  ];

  for (let i = 0; i < fields.length; i++) {
    await fields[i]();
    await page.getByRole('button', { name: i < fields.length - 1 ? 'Continuar' : 'Guardar cuenta', exact: true }).click();
  }
  c.addStep('Wizard bancario (5 pasos)', 'pass', `${data.banco} / ${data.tipo}`, Date.now() - t0);
}

/** Desconecta la red del contexto (navigator.onLine=false + evento offline). */
export async function setOffline(page: Page): Promise<void> {
  await page.context().setOffline(true);
}

/** Reconecta la red del contexto (dispara el evento online → sync de la cola). */
export async function setOnline(page: Page): Promise<void> {
  await page.context().setOffline(false);
}

/** Lee la clave de pendiente de banco del driver (búsqueda por driverId). */
export async function bankPendingValue(page: Page, driverId: string): Promise<string | null> {
  return page.evaluate((id) => localStorage.getItem(`tad_driver_bank_pending_${id}`), driverId);
}

/** Lee cualquier clave `tad_driver_bank_pending_*` presente en localStorage. */
export async function anyBankPendingValue(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.startsWith('tad_driver_bank_pending_'));
    return key ? localStorage.getItem(key) : null;
  });
}
