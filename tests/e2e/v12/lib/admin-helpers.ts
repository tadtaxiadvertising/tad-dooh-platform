/**
 * Helpers del portal Admin.
 */
import { Page } from '@playwright/test';
import { ENV_URLS } from '../../playwright.config';
import { Case } from './report';

export async function loginAsAdmin(
  page: Page,
  c: Case,
  email: string,
  password: string,
): Promise<void> {
  const t0 = Date.now();
  await page.goto(`${ENV_URLS.admin}/admin/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('#admin-email').fill(email);
  await page.locator('#admin-password').fill(password);
  await Promise.all([
    page.waitForURL('**/admin/dashboard**', { timeout: 90_000 }),
    page.getByRole('button', { name: 'Iniciar sesión' }).click(),
  ]);
  c.addStep('Login como admin', 'pass', `${email}`, Date.now() - t0);
}
