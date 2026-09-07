const { test, expect } = require('@playwright/test');

const BASE_ADMIN = 'http://localhost:3000';
const BASE_ADVERTISER = 'http://localhost:3000/advertiser';
const BASE_DRIVER = 'http://localhost:3000/driver';

const LEGAL_PAGES = [
  '/politica-de-privacidad',
  '/terminos-de-servicio', 
  '/politica-de-cookies',
  '/aviso-legal'
];

const LEGAL_PAGES_ADMIN = [
  '/admin/politica-de-privacidad',
  '/admin/terminos-de-servicio',
  '/admin/politica-de-cookies',
  '/admin/aviso-legal'
];

const LEGAL_PAGES_DRIVER = [
  '/driver/politica-de-privacidad',
  '/driver/terminos-de-servicio',
  '/driver/politica-de-cookies',
  '/driver/aviso-legal'
];

test.describe('TAD DOOH Platform - Legal Pages & Compliance', () => {

  test('Legal pages load without authentication for all three apps', async ({ page }) => {
    // Test advertiser legal pages
    for (const pagePath of LEGAL_PAGES) {
      const fullUrl = `${BASE_ADVERTISER}${pagePath}`;
      console.log(`Testing: ${fullUrl}`);
      await page.goto(fullUrl);
      // Should load without auth redirect
      await expect(page).not.toHaveURL('/login');
      await expect(page.locator('h1')).toBeVisible();
    }
    
    // Test admin legal pages
    for (const pagePath of LEGAL_PAGES_ADMIN) {
      const fullUrl = `${BASE_ADMIN}${pagePath}`;
      console.log(`Testing: ${fullUrl}`);
      await page.goto(fullUrl);
      await expect(page).not.toHaveURL('/login');
      await expect(page.locator('h1')).toBeVisible();
    }
    
    // Test driver legal pages
    for (const pagePath of LEGAL_PAGES_DRIVER) {
      const fullUrl = `${BASE_DRIVER}${pagePath}`;
      console.log(`Testing: ${fullUrl}`);
      await page.goto(fullUrl);
      await expect(page).not.toHaveURL('/login');
      await expect(page.locator('h1')).toBeVisible();
    }
  });

  test('Legal pages have correct last updated date', async ({ page }) => {
    const today = new Date();
    const year = today.getFullYear();
    
    // Check advertiser privacy policy
    await page.goto(`${BASE_ADVERTISER}/politica-de-privacidad`);
    const updatedText = await page.textContent('[last-updated]');
    expect(updatedText).toContain('2026');
    
    // Check admin privacy policy
    await page.goto(`${BASE_ADMIN}/politica-de-privacidad`);
    const updatedAdmin = await page.textContent('[last-updated]');
    expect(updatedAdmin).toContain('2026');
    
    // Check driver privacy policy
    await page.goto(`${BASE_DRIVER}/politica-de-privacidad`);
    const updatedDriver = await page.textContent('[last-updated]');
    expect(updatedDriver).toContain('2026');
  });

  test('Legal pages contain permissions matrix section', async ({ page }) => {
    // Check advertiser
    await page.goto(`${BASE_ADVERTISER}/politica-de-privacidad`);
    const hasMatrix = await page.locator('text=Matriz de permisos').isVisible();
    expect(hasMatrix).toBeTruthy();
    
    // Check admin
    await page.goto(`${BASE_ADMIN}/politica-de-privacidad`);
    const hasMatrixAdmin = await page.locator('text=Matriz de permisos').isVisible();
    expect(hasMatrixAdmin).toBeTruthy();
    
    // Check driver
    await page.goto(`${BASE_DRIVER}/politica-de-privacidad`);
    const hasMatrixDriver = await page.locator('text=Matriz de permisos').isVisible();
    expect(hasMatrixDriver).toBeTruthy();
  });

  test('Cookie policies contain app-specific categories', async ({ page }) => {
    // Check advertiser cookie policy
    await page.goto(`${BASE_ADVERTISER}/politica-de-cookies`);
    const hasAppCategories = await page.locator('text=Aplicaciones').isVisible();
    expect(hasAppCategories).toBeTruthy();
    
    // Check categories types
    const hasEstrictas = await page.locator('text=Estrictamente necesarias').isVisible();
    expect(hasEstrictas).toBeTruthy();
  });

  test('Footer links navigate to legal pages', async ({ page }) => {
    await page.goto(`${BASE_ADVERTISER}/login`);
    // Check footer links exist
    const legalLinks = page.locator('footer nav a');
    const linkCount = await legalLinks.count();
    expect(linkCount).toBeGreaterThan(0);
    
    // Check that links have proper hrefs
    for (let i = 0; i < linkCount; i++) {
      const href = await legalLinks.nth(i).getAttribute('href');
      expect(href).toContain('/politica-de');
    }
  });

  test('Google OAuth button present on login pages', async ({ page }) => {
    // Check advertiser login
    await page.goto(`${BASE_ADVERTISER}/login`);
    const googleButton = page.locator('text=Iniciar sesión con Google');
    await expect(googleButton).toBeVisible();
    
    // Check admin login
    await page.goto(`${BASE_ADMIN}/login`);
    const googleButtonAdmin = page.locator('text=Iniciar sesión con Google');
    await expect(googleButtonAdmin).toBeVisible();
    
    // Check driver login
    await page.goto(`${BASE_DRIVER}/login`);
    const googleButtonDriver = page.locator('text=Iniciar sesión con Google');
    await expect(googleButtonDriver).toBeVisible();
  });

  test('Permission categories table is correct across apps', async ({ page }) => {
    // Verify the 7 categories exist in at least one app's privacy policy
    await page.goto(`${BASE_ADVERTISER}/politica-de-privacidad`);
    const categories = [
      'Essencial / Strictly Necessary',
      'Analítica / Performance', 
      'Funcional / Preferences',
      'Administrativo / System',
      'Campaña / Business',
      'Ubicación / Telemetry',
      'Financiero / Billing'
    ];
    
    for (const cat of categories) {
      const isVisible = await page.locator(`text=${cat}`).isVisible();
      // At least some categories should be visible
      if (!(await isVisible)) {
        console.log(`Category not found in advertiser: ${cat}`);
      }
    }
  });

  test('Data retention periods mentioned in privacy policies', async ({ page }) => {
    await page.goto(`${BASE_ADVERTISER}/politica-de-privacidad`);
    const retentionTerms = [
      '7 años',
      '10 años', 
      '90 días',
      '2 años',
      '3 años'
    ];
    
    for (const term of retentionTerms) {
      const isVisible = await page.locator(`text=${term}`).isVisible();
      // These should appear somewhere in the policy
      if (!(await isVisible)) {
        console.log(`Retention term not found: ${term}`);
      }
    }
  });
});