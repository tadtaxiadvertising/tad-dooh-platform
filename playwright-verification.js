const { test, expect } = require('@playwright/test');

// URLs de las tres aplicaciones (usando localhost para verificación)
// En producción estas serían las URLs reales
const BASE_URLS = {
  admin: 'http://localhost:3000',
  advertiser: 'http://localhost:3000/advertiser', 
  driver: 'http://localhost:3000/driver'
};

// Páginas legales que deberían cargarse sin autenticación
const LEGAL_PAGES = [
  '/politica-de-privacidad',
  '/terminos-de-servicio', 
  '/politica-de-cookies',
  '/aviso-legal'
];

test.describe('TAD DOOH - Verificación de Páginas Legales', () => {

  // Test para cada aplicación
  const runLegalPagesTest = (appName, baseUrl) => {
    test(`${appName}: Páginas legales cargan sin auth`, async ({ page }) => {
      console.log(`\\n=== Testing ${appName} ===`);
      
      for (const pagePath of LEGAL_PAGES) {
        const fullUrl = `${baseUrl}${pagePath}`;
        console.log(`  Cargando: ${fullUrl}`);
        
        await page.goto(fullUrl);
        
        // La página debería cargarse y no deberían redirigir al login
        await expect(page).not.toHaveURL('/login');
        await expect(page.locator('h1')).toBeVisible();
        
        // Debería tener el título correcto
        const title = await page.title();
        console.log(`  Título: ${title.substring(0, 50)}...`);
      }
    });
  };

  // Test para el banner de cookies
  test('Banner de cookies en todas las apps', async ({ page }) => {
    // El banner debería poder cargarse en la página de login
    for (const [appName, baseUrl] of Object.entries(BASE_URLS)) {
      const loginUrl = `${baseUrl}/login`;
      console.log(`\\n=== Testing ${appName} login page ===`);
      
      await page.goto(loginUrl);
      
      // Verificar que el título de la página es el esperado
        const title = await page.title();
        console.log(`  Título de login: ${title}`);
      
      // Buscar el banner de cookies (debería estar presente en primera visita)
      const cookieBanner = page.locator('text=Gestión de Cookies TAD');
      const bannerVisible = await cookieBanner.isVisible();
      console.log(`  Banner de cookies visible: ${bannerVisible}`);
    }
  });

  // Test para verificar que las páginas de login tienen Google OAuth
  test('Google OAuth button en login pages', async ({ page }) => {
    for (const [appName, baseUrl] of Object.entries(BASE_URLS)) {
      const loginUrl = `${baseUrl}/login`;
      await page.goto(loginUrl);
      
      const googleButton = page.locator('text=Iniciar sesión con Google');
      const isVisible = await googleButton.isVisible();
      console.log(`  ${appName}: Google button visible = ${isVisible}`);
      
      await expect(googleButton).toBeVisible();
    }
  });

  // Ejecutar todos los tests
  runLegalPagesTest('Admin', BASE_URLS.admin);
  runLegalPagesTest('Advertiser', BASE_URLS.advertiser);
  runLegalPagesTest('Driver', BASE_URLS.driver);
});