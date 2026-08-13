/**
 * Helpers del portal Advertiser.
 */
import { Page } from '@playwright/test';
import { ENV_URLS } from '../../playwright.config';
import { Case } from './report';

export async function loginAsAdvertiser(
  page: Page,
  c: Case,
  email: string,
  password: string,
): Promise<void> {
  const t0 = Date.now();
  await page.goto(`${ENV_URLS.advertiser}/advertiser/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await Promise.all([
    page.waitForURL('**/advertiser/dashboard**', { timeout: 90_000 }),
    page.locator('#login-submit').click(),
  ]);
  c.addStep('Login como anunciante', 'pass', `${email}`, Date.now() - t0);
}
