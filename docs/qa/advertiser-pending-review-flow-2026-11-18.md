# QA del estado PENDING_REVIEW en el portal de anunciantes

Fecha: 18-nov-2026. Nivel: **P1 de flujo de alta**.

## Evidencia → causa raíz

1. En `OnboardingService.onboardAdvertiser`, una cuenta nueva se guarda como `PENDING_REVIEW`; el mismo flujo rechaza correos ya registrados con `ConflictException`.
2. En `apps/advertiser/middleware.ts`, toda sesión verificada con `PENDING_REVIEW` en `/advertiser/dashboard` era redirigida a **`/advertiser/onboarding`**.
3. Esta última URL es el formulario **público de registro de una cuenta nueva**; su botón final hace `POST /api/proxy/onboarding/advertiser`. Un anunciante ya registrado podía interpretarlo como un segundo paso de aprobación, enviar de nuevo sus datos y recibir `409 Conflict`.
4. No había una página específica de estado de la solicitud existente.

## Cambio mínimo seguro

- El middleware redirige las sesiones **verificadas** `PENDING_REVIEW` a `/advertiser/pending-review`; la ruta se permite **solo** para esa sesión (sin bucle).
- Los usuarios `ACTIVE` que visitan la pantalla de revisión vuelven al dashboard; las cuentas `SUSPENDED` y los visitantes sin sesión válida siguen sin acceder.
- `/advertiser/onboarding` **permanece público** para anunciantes nuevos; su comportamiento y contrato de datos no cambian.
- Nueva pantalla accesible, responsive y `noindex,nofollow`, con texto que aclara que el registro ya fue recibido y que no se debe duplicar. No hace solicitudes API, cambios de estado ni operaciones financieras.
- Los tests actuales en `scripts/landing.test.cjs` cubren sesión legacy, OAuth con `PENDING_REVIEW`, usuario activo, invitado, JWT falsificado y ausencia de bucles.

## Evidencia ejecutada

Se ejecutaron **12/12 casos aislados** de la rama de decisión de estados extraída de `middleware.ts`, incluidas redirecciones de sesión pendiente, activa, suspendida y desconocida. El archivo de pruebas pasó verificación de sintaxis JS y 6 controles de fuente comprobaron que la ruta nueva no es pública, no hace escrituras y preserva onboarding público.

**Pendientes para DoD:** `node --test scripts/landing.test.cjs` sobre checkout con dependencias, `pnpm --filter @tad/advertiser build`, `pnpm exec tsc --noEmit --project apps/advertiser/tsconfig.landing.json`, y smoke en browser con usuarios de prueba ACTIVE/PENDING_REVIEW/SUSPENDED. No modificar estados de clientes reales para probarlo.

## Riesgos que NO resuelve esta PR

- Los datos de estado en `app_metadata` de Supabase pueden ser distintos de los de PostgreSQL si la sincronización OAuth no está garantizada. El middleware consulta identidad autenticada con `getUser()`, pero no hay prueba de sincronización de `status` entre fuentes. Investigar independientemente antes de usar ese dato como permiso contractual.
- El dashboard conserva un segundo wizard para usuarios registrados; no fusionarlo con la pantalla de registro público sin definir el producto.
- No se ha desplegado la rama en EasyPanel. La API/DB, facturas, wallet, payouts y dispositivos offline no se han modificado.

Estado: **implementado en rama, verificación integral pendiente**.
