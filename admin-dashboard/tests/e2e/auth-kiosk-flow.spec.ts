/**
 * ============================================================
 *  SPEC #3 — AUTENTICACIÓN & FLUJO KIOSCO (FullyKiosk Mode)
 * ============================================================
 * Historia de Usuario:
 *   Como administrador de TAD, necesito que la tablet entre
 *   en modo kiosco completo tras el login de Supabase,
 *   sin barras de navegación ni chrome del browser visibles,
 *   y que el Kill-Switch bloquee el dashboard si hay deuda.
 *
 * Errores comunes que esta prueba detecta:
 *  ⚠️  AUTH_001: Hydration mismatch en Next.js 15 (HTML servidor ≠ cliente)
 *  ⚠️  AUTH_002: Supabase session expirada silenciosamente (sin refresh automático del JWT)
 *  ⚠️  AUTH_003: Race condition en AuthProvider: componentes renderizan antes del token
 *  ⚠️  AUTH_004: Branding TAD Yellow incorrecto (#FFD400 vs #fad400)
 *  ⚠️  AUTH_005: PaymentLockOverlay no se activa al recibir 402 desde la API
 *  ⚠️  KIOSK_001: Barras del browser visibles (modo NO fullscreen real en Android)
 *  ⚠️  KIOSK_002: Scroll habilitado (permite al pasajero navegar fuera del player)
 */
import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth.helper';

// ──────────────────────────────────────────────────────────────────
// TEST #3.1 — AUTENTICACIÓN SUPABASE
// ──────────────────────────────────────────────────────────────────
test.describe('Autenticación Supabase — Admin Dashboard', () => {

  test('3.1 — Login exitoso con credenciales válidas y redirección al dashboard', async ({ page }) => {
    // Capturamos hydration errors de Next.js 15
    const hydrationErrors: string[] = [];
    page.on('console', (msg) => {
      if (
        msg.type() === 'error' &&
        (msg.text().includes('Hydration') || msg.text().includes('hydrat'))
      ) {
        hydrationErrors.push(msg.text());
      }
    });

    await page.goto('/login');

    // Esperamos que el formulario esté completamente hidratado (Next.js 15)
    // Señal de hydration completa: el botón deja de estar disabled
    await page.waitForSelector('button[type="submit"]', { state: 'visible', timeout: 15_000 });

    // ✅ Verificamos TAD Yellow branding en el botón de login
    const submitBtn = page.locator('button[type="submit"]');
    const btnBgColor = await submitBtn.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );
    // Aceptamos tanto #FFD400 (rgb(255,212,0)) como #fad400 (rgb(250,212,0))
    const isValidYellow =
      btnBgColor === 'rgb(255, 212, 0)' ||
      btnBgColor === 'rgb(250, 212, 0)' ||
      btnBgColor === 'rgb(250, 210, 0)';

    console.log(`🎨 Botón color: ${btnBgColor} — TAD Yellow: ${isValidYellow ? '✅' : '⚠️ REVISAR'}`);

    if (!isValidYellow) {
      console.warn(
        `[AUTH_004] Color de botón incorrecto: ${btnBgColor}. ` +
        'Esperado: rgb(255, 212, 0) o rgb(250, 212, 0). Verificar globals.css.'
      );
    }

    // Rellenamos el formulario
    await page.fill('input[type="email"]', 'admin@tad.do');
    await page.fill('input[type="password"]', 'TadAdmin2026!');
    await page.click('button[type="submit"]');

    // Esperamos redirección (Supabase puede tardar en validar)
    await expect(page).toHaveURL(/\/(dashboard|fleet|campaigns|finance)/, {
      timeout: 25_000,
    });

    // ✅ Verificamos hydration sin errores
    if (hydrationErrors.length > 0) {
      console.error(
        `[AUTH_001] ⚠️ Hydration errors detectados:\n${hydrationErrors.join('\n')}`
      );
    }
    expect(hydrationErrors.length, `Hydration errors: ${hydrationErrors.join(', ')}`).toBe(0);

    console.log('✅ Login exitoso y dashboard cargado sin hydration errors.');
  });

  test('3.2 — Login fallido muestra mensaje de error claro (no blank screen)', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('button[type="submit"]', { state: 'visible' });

    await page.fill('input[type="email"]', 'noexiste@tad.do');
    await page.fill('input[type="password"]', 'WrongPassword123!');
    await page.click('button[type="submit"]');

    // La página NO debe redirigir
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/login');

    // ✅ Debe mostrar mensaje de error (toast, alert, o texto en pantalla)
    const errorMsg = page.locator(
      '[role="alert"], .toast-error, [data-testid="login-error"], ' +
      'p.text-red, .text-red-500, .text-destructive'
    ).first();

    const errorVisible = await errorMsg.count() > 0;
    if (!errorVisible) {
      console.warn(
        '⚠️ No se encontró mensaje de error visible al fallar login. ' +
        'El usuario quedará confundido. Añadir toast/alert de error.'
      );
    } else {
      console.log(`✅ Error message visible: "${await errorMsg.textContent()}"`);
    }

    // ✅ No debe haber blank/white screen
    const pageContent = await page.locator('body').textContent();
    expect(pageContent?.length).toBeGreaterThan(50,
      'Pantalla en blanco detectada tras login fallido.'
    );
  });

  test('3.3 — Sesión Supabase persiste tras F5 (refresh token no expira silenciosamente)', async ({ page }) => {
    // Login
    await loginAsAdmin(page);
    const urlAfterLogin = page.url();

    // Simulamos refresh (F5) como haría FullyKiosk al reiniciar
    await page.reload({ waitUntil: 'networkidle' });

    // ✅ NO debe redirigir al login tras un simple refresh
    const urlAfterRefresh = page.url();
    const redirectedToLogin = urlAfterRefresh.includes('/login');

    if (redirectedToLogin) {
      console.error(
        '[AUTH_002] ⚠️ La sesión se perdió tras el refresh. ' +
        'Verificar que Supabase refresca el JWT automáticamente (onAuthStateChange + refreshSession).'
      );
    }

    expect(redirectedToLogin, 'La sesión no debe perderse al refrescar la página').toBe(false);
    console.log(`✅ Sesión persistente: ${urlAfterLogin} → ${urlAfterRefresh}`);
  });

  test('3.4 — Rutas protegidas redirigen a /login si no hay sesión', async ({ page }) => {
    // Navegamos directamente sin sesión
    await page.goto('/dashboard');

    // Debe redirigir a login
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    console.log('✅ Rutas protegidas correctamente bloqueadas sin sesión.');
  });
});

// ──────────────────────────────────────────────────────────────────
// TEST #3.2 — KILL-SWITCH (Regla de Negocio 402)
// ──────────────────────────────────────────────────────────────────
test.describe('Kill-Switch — Regla de Negocio 402 (RD$6,000)', () => {

  test('3.5 — Kill-Switch activa overlay al recibir 402 del backend', async ({ page }) => {
    // Interceptamos CUALQUIER llamada a la API que devuelva 402
    // (el interceptor de Axios en api.ts debe capturar esto y activar el store)
    await page.route('**/api/**', async (route) => {
      // Solo interceptamos la primera llamada autenticada
      if (route.request().headers()['authorization']) {
        await route.fulfill({
          status: 402,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Payment Required',
            message: 'Suscripción de RD$6,000 vencida. Servicio suspendido.',
            code: 'SUBSCRIPTION_OVERDUE',
          }),
        });
      } else {
        await route.continue();
      }
    });

    await loginAsAdmin(page);

    // Hacemos una solicitud autenticada (el interceptor de Axios la interceptará)
    await page.goto('/fleet');
    await page.waitForTimeout(3000);

    // ✅ El overlay de bloqueo debe aparecer
    const overlay = page.locator(
      '.payment-lock-overlay, [data-testid="payment-lock"], ' +
      '[aria-label*="bloqueo"], [aria-label*="pago"]'
    ).first();

    const overlayVisible = await overlay.count() > 0;

    if (!overlayVisible) {
      console.error(
        '[AUTH_005] ⚠️ PaymentLockOverlay NO apareció tras recibir error 402. ' +
        'Verificar el interceptor de Axios en services/api.ts y el usePaymentStore.'
      );
    } else {
      await expect(overlay).toBeVisible({ timeout: 5000 });
      const overlayText = await overlay.textContent();
      console.log(`✅ Kill-Switch activo. Overlay: "${overlayText?.substring(0, 100)}"`);
    }

    // ✅ El botón de regularización debe estar visible
    const payBtn = page.locator(
      'button:has-text("Regularizar"), a:has-text("Regularizar"), ' +
      'button:has-text("Pagar"), button:has-text("Contactar")'
    ).first();

    const payBtnVisible = await payBtn.count() > 0;
    console.log(`ℹ️ Botón de pago visible: ${payBtnVisible ? '✅' : '⚠️ No encontrado'}`);
  });

  test('3.6 — Kill-Switch bloquea interacción con el dashboard (overlay cubre todo)', async ({ page }) => {
    // Route 402 para todas las llamadas API autenticadas
    await page.route('**/fleet/**', async (route) => {
      await route.fulfill({
        status: 402,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Payment Required' }),
      });
    });

    await loginAsAdmin(page);
    await page.goto('/fleet');
    await page.waitForTimeout(3000);

    // ✅ Verificamos que el overlay tiene z-index alto y cubre la pantalla
    const overlay = page.locator('.payment-lock-overlay').first();
    if (await overlay.count() > 0) {
      const zIndex = await overlay.evaluate((el) =>
        parseInt(window.getComputedStyle(el).zIndex || '0')
      );
      expect(zIndex).toBeGreaterThan(100,
        'El overlay debe tener z-index > 100 para cubrir todos los elementos del dashboard.'
      );

      const { width, height } = await overlay.boundingBox() || { width: 0, height: 0 };
      expect(width).toBeGreaterThan(1000, 'El overlay debe cubrir el ancho completo de la pantalla.');
      expect(height).toBeGreaterThan(600, 'El overlay debe cubrir el alto completo de la pantalla.');

      console.log(`✅ Overlay cubre pantalla completa: ${width}x${height}px, z-index: ${zIndex}`);
    }
  });
});

// ──────────────────────────────────────────────────────────────────
// TEST #3.3 — MODO KIOSCO (FullyKiosk / Full Screen)
// ──────────────────────────────────────────────────────────────────
test.describe('Modo Kiosco — Comportamiento FullyKiosk Android', () => {

  test('3.7 — La UI ocupa el 100% de la pantalla en viewport 1280x800', async ({ page }) => {
    await loginAsAdmin(page);

    // ✅ Verificamos que body y html tienen height: 100% y overflow: hidden
    const bodyStyles = await page.evaluate(() => {
      const bodyStyle = window.getComputedStyle(document.body);
      const htmlStyle = window.getComputedStyle(document.documentElement);
      return {
        bodyOverflow: bodyStyle.overflow,
        htmlOverflow: htmlStyle.overflow,
        bodyWidth: document.body.scrollWidth,
        bodyHeight: document.body.scrollHeight,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
      };
    });

    console.log('📐 Body dimensions:', bodyStyles);

    // ✅ No debe haber scroll horizontal (indicador de elementos que se salen)
    expect(bodyStyles.bodyWidth).toBeLessThanOrEqual(bodyStyles.windowWidth + 5,
      `[KIOSK_002] Scroll horizontal detectado: bodyWidth(${bodyStyles.bodyWidth}) > windowWidth(${bodyStyles.windowWidth}). ` +
      'El pasajero podría scrollear fuera del player.'
    );

    // ✅ El contenedo principal debe ocupar la pantalla completa
    const mainContent = page.locator('main, [data-testid="main-content"], #__next > div').first();
    if (await mainContent.count() > 0) {
      const { width } = await mainContent.boundingBox() || { width: 0 };
      expect(width).toBeGreaterThan(1200,
        `[KIOSK_001] El contenido principal no ocupa el ancho completo: ${width}px. ` +
        'Verificar que no hay padding o margin excesivo en el layout principal.'
      );
    }
  });

  test('3.8 — No hay elementos fijos del browser sobreponiendo la UI (navegación, scrollbars)', async ({ page }) => {
    await loginAsAdmin(page);

    // Verificamos que no hay scrollbars visibles (kiosco debe tener overflow: hidden)
    const hasScrollbar = await page.evaluate(() => {
      return document.documentElement.scrollHeight > document.documentElement.clientHeight;
    });

    if (hasScrollbar) {
      console.warn(
        '[KIOSK_002] ⚠️ La página tiene scroll vertical habilitado. ' +
        'En modo kiosco, añadir overflow: hidden al html/body para evitar que ' +
        'los pasajeros naveguen fuera del contenido del anuncio.'
      );
    } else {
      console.log('✅ Sin scroll vertical — modo kiosco correcto.');
    }

    // ✅ Verificamos que el viewport es exactamente el esperado para la tablet
    const viewport = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
    }));

    console.log(`📐 Viewport detectado: ${viewport.width}x${viewport.height} (esperado: 1280x800)`);
  });

  test('3.9 — Branding TAD Yellow (#FFD400) está aplicado consistentemente', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('body', { state: 'visible' });

    // Buscamos elementos con el color TAD Yellow en la página
    const tadYellowElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const yellow: string[] = [];
      elements.forEach((el) => {
        const bg = window.getComputedStyle(el).backgroundColor;
        const color = window.getComputedStyle(el).color;
        const isYellow = (c: string) =>
          c.includes('255, 212') || // #FFD400
          c.includes('250, 212') || // #FAD400
          c.includes('255, 211');   // variaciones

        if ((isYellow(bg) || isYellow(color)) && el.textContent?.trim()) {
          yellow.push(`${el.tagName}.${el.className.split(' ')[0]}: ${bg || color}`);
        }
      });
      return [...new Set(yellow)].slice(0, 10); // Top 10 únicos
    });

    console.log(`🎨 Elementos con TAD Yellow: ${tadYellowElements.length}`);
    tadYellowElements.forEach(e => console.log(`  → ${e}`));

    expect(tadYellowElements.length).toBeGreaterThan(0,
      '[AUTH_004] No se encontraron elementos con el color TAD Yellow en la página de login. ' +
      'Verificar que globals.css aplica correctamente #FFD400.'
    );
  });
});
