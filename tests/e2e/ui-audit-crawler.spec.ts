import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// UI-Vulnerability-Crawler — Auditoría de superficie por rol
//
// R8 (Idempotencia financiera) / R3 (Kill-Switch): SOLO lectura del DOM tras el
// login. NO se hace ningún click mutativo (ni subir campañas, ni pagos, ni
// transferencias). Sin clicks a ciegas sobre botones de acción.
//
// R9 (RBAC): Las credenciales se reciben únicamente mediante variables de
// entorno de un entorno E2E aislado. Nunca hay fallbacks en el repositorio.
//
// Ejecución controlada (1 worker, 1 proyecto, 0 retries) para no agotar el
// pool de conexiones de Prisma ni provocar OOM en contenedores de 512MB.
// ─────────────────────────────────────────────────────────────────────────────

const REPORT_PATH = path.resolve(process.cwd(), 'ui-audit-report.md');

// Los destinos también deben configurarse explícitamente para impedir que una
// ejecución local apunte por accidente a producción.
const ROLES = [
  {
    name: 'Admin',
    url: process.env.TAD_AUDIT_ADMIN_URL?.trim() || null,
    user: process.env.TAD_AUDIT_ADMIN_USER?.trim() || null,
    pass: process.env.TAD_AUDIT_ADMIN_PASS?.trim() || null,
    // PortalAuth (admin): email + password
    phone: false,
    dashboardRegex: /\/admin\/dashboard/,
  },
  {
    name: 'Driver',
    url: process.env.TAD_AUDIT_DRIVER_URL?.trim() || null,
    user: process.env.TAD_AUDIT_DRIVER_USER?.trim() || null,
    pass: process.env.TAD_AUDIT_DRIVER_PASS?.trim() || null,
    // Driver: input type="tel" + password
    phone: true,
    dashboardRegex: /\/driver\/dashboard/,
  },
  {
    name: 'Advertiser',
    url: process.env.TAD_AUDIT_ADVERTISER_URL?.trim() || null,
    user: null,
    pass: null,
    // Sin credenciales documentadas (R9): sólo mapeo de superficie.
    phone: false,
    dashboardRegex: null,
  },
];

// Sanitiza secretos potenciales (JWT, sb_secret, tokens) antes de persistirlos
// en el reporte maestro del repositorio.
const REDACT =
  /(eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}|sb_secret_[A-Za-z0-9_-]{6,}|sb_publishable_[A-Za-z0-9_-]{6,}|Bearer\s+[A-Za-z0-9._-]{20,})/g;
const sanitize = (s: string) => s.replace(REDACT, '[REDACTED]');

let masterDocument = '# Documento Maestro de UI y Acciones\n\n';
masterDocument +=
  '> Auditoría generada por tests/e2e/ui-audit-crawler.spec.ts (1 worker, secuencial, solo lectura tras login).\n\n';

test.describe('Autómata de Auditoría de UI', () => {
  // ─── worker: 1 forzado en config global y en el CLI para evitar OOM ───

  for (const role of ROLES) {
    test(`Mapeo de UI para el rol: ${role.name}`, async ({ page }) => {
      if (!role.url) {
        test.skip(true, `Configure TAD_AUDIT_${role.name.toUpperCase()}_URL.`);
        return;
      }
      const errors: string[] = [];
      const pageErrors: string[] = [];

      // Los listeners DEBEN registrarse antes de la navegación para capturar
      // errores de carga inicial.
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      page.on('pageerror', (err) => pageErrors.push(err.message));

      await page.goto(role.url, { waitUntil: 'domcontentloaded', timeout: 60_000 });

      let authenticated = false;
      let finalUrl = page.url();

      // Auth (sólo roles con credenciales documentadas)
      if (role.user && role.pass) {
        try {
          if (role.phone) {
            await page.fill('input[type="tel"]', role.user);
          } else {
            await page.fill('input[type="email"]', role.user);
          }
          await page.fill('input[type="password"]', role.pass);
          await page.click('button[type="submit"]');

          if (role.dashboardRegex) {
            try {
              await page.waitForURL(role.dashboardRegex, { timeout: 20_000 });
              authenticated = true;
            } catch {
              // El login pudo fallar; se audita igualmente la superficie visible.
            }
          }
        } catch {
          // Selector de login ausente: se audita la superficie visible.
        }
        await page.waitForLoadState('load').catch(() => {});
        await page.waitForTimeout(1500);
      }

      finalUrl = page.url();

      masterDocument += `## Rol: ${role.name}\n\n`;
      masterDocument += `- **URL auditada:** \`${finalUrl}\`\n`;
      masterDocument += `- **Autenticado:** ${authenticated}\n`;
      if (role.user && role.pass && !authenticated) {
        masterDocument += `- **⚠️ Login NO confirmado** (posible credencial inválida o bloqueo; se documenta la superficie visible).\n`;
      }

      // Extracción de selectores (lectura pura del DOM — sin clics mutativos)
      const buttons = await page.$$eval('button', (nodes) =>
        nodes.map((n) => ({
          text: n.textContent?.trim()?.slice(0, 120),
          type: n.getAttribute('type'),
          disabled: n.hasAttribute('disabled'),
          aria: n.getAttribute('aria-label'),
        })),
      );
      const forms = await page.$$eval('form', (nodes) =>
        nodes.map((n) => ({
          action: n.getAttribute('action'),
          method: n.getAttribute('method'),
        })),
      );
      const inputs = await page.$$eval('input', (nodes) =>
        nodes.map((n) => ({
          name: n.getAttribute('name'),
          id: n.getAttribute('id'),
          type: n.getAttribute('type'),
          required: n.hasAttribute('required'),
        })),
      );
      const links = await page.$$eval('a[href]', (nodes) =>
        nodes.map((n) => ({
          text: n.textContent?.trim()?.slice(0, 120),
          href: n.getAttribute('href'),
        })),
      );

      masterDocument += `### Botones Detectados\n\`\`\`json\n${JSON.stringify(buttons, null, 2)}\n\`\`\`\n`;
      masterDocument += `### Formularios Detectados\n\`\`\`json\n${JSON.stringify(forms, null, 2)}\n\`\`\`\n`;
      masterDocument += `### Inputs (Potenciales vectores)\n\`\`\`json\n${JSON.stringify(inputs, null, 2)}\n\`\`\`\n`;
      masterDocument += `### Enlaces Detectados\n\`\`\`json\n${JSON.stringify(links, null, 2)}\n\`\`\`\n`;

      const cleanErrors = errors.map(sanitize).filter((e) => e.trim().length > 0);
      const cleanPageErrors = pageErrors.map(sanitize).filter((e) => e.trim().length > 0);

      masterDocument += `### Errores JS en consola\n\`\`\`json\n${JSON.stringify(cleanErrors, null, 2)}\n\`\`\`\n`;
      masterDocument += `### Errores de página (uncaught)\n\`\`\`json\n${JSON.stringify(cleanPageErrors, null, 2)}\n\`\`\`\n\n`;

      // No se clica nada mutativo: fin del rastreo para este rol.
      expect(true).toBeTruthy();
    });
  }

  test.afterAll(() => {
    fs.writeFileSync(REPORT_PATH, masterDocument, 'utf-8');
    // eslint-disable-next-line no-console
    console.log(`\n[ui-audit-crawler] Reporte maestro escrito en: ${REPORT_PATH}`);
  });
});
