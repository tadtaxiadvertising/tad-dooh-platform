# P1 — Estado comercial OAuth verificado contra PostgreSQL

Fecha: 18-nov-2026. Incidente: #294.

## Evidencia y causa raíz

`auth.service.ts` sincroniza `app_metadata: {role, entityId}` en Supabase, sin garantizar un campo `status` vigente. El middleware de anunciantes confiaba en `app_metadata.status` y asignaba el valor `ACTIVE` cuando no existía. Por tanto, la identidad OAuth autenticada no implicaba que su cuenta de anunciante estuviera aprobada comercialmente. Los JWT de Supabase pueden conservar metadata anterior a una suspensión.

## Decisión y alcance

- Fuente de verdad: `Advertiser.status` en PostgreSQL.
- Nuevo `GET /api/v1/advertisers/session/status` sin `@Public`, con `@Roles(ADVERTISER)`, limitación de frecuencia y guard global de Supabase (firma/sesión verificadas).
- El endpoint recibe `request.user` del guard, no acepta `advertiserId` en parámetros ni cuerpo; verifica `role`, `entityId`, email y el registro en PostgreSQL. Solo devuelve role, ID y status para `ACTIVE` o `PENDING_REVIEW`; deniega otros estados, usuarios inexistentes, emails/IDs ajenos y entradas vacías.
- En middleware Next el cliente SSR llama `supabase.auth.getUser()` para confirmar identidad y luego obtiene el access token mediante `getSession()`. **getSession por sí solo nunca autoriza nada**: el backend vuelve a verificar la firma, identidad y estado vigente con su guard y Prisma.
- Si faltan token, API, permisos o datos, el middleware no asigna `ACTIVE` por defecto. Se conserva el flujo legacy de login mediante API/JWT con verificación independiente en BD.
- Sin cambios de DB, migraciones, facturas, wallets, pagos, tablas offline o secretos.

## Verificación independiente efectuada

- **10/10** escenarios aislados del método real de servicio, con Prisma simulado: activo, pendiente, suspendido, estado desconocido, eliminado, email distinto, ID distinto, rol ajeno, ID vacío y email vacío.
- **5/5** escenarios aislados del validador HTTP del middleware: pendiente válido, respuesta sin estado, suspendido, rol ajeno y caída de API. Todas las consultas usan URL construida por servidor, `cache:no-store` y `redirect:error`.
- Se añadieron pruebas Jest de API y se actualizaron fixtures `scripts/landing.test.cjs` para OAuth con token y consulta de estado de BD.

## Pendientes obligatorios para merge y deploy

```bash
node --test scripts/landing.test.cjs
pnpm --filter api exec jest --runInBand \
  src/modules/advertisers/advertisers-oauth-status.spec.ts \
  src/modules/advertisers/advertisers-session.spec.ts \
  src/modules/auth/guards/supabase-auth.guard.spec.ts
pnpm --filter api run build
pnpm exec tsc --noEmit --project apps/advertiser/tsconfig.landing.json
pnpm --filter @tad/advertiser run build
```

Pruebas E2E en staging con cuentas **de prueba**: OAuth ACTIVE/PENDING_REVIEW/SUSPENDED, metadata desactualizada, request autenticado al endpoint, sesión ajena (IDOR), login legacy, supabase outage, API outage y control de 401/403. **No convertir un 401 en bypass ni permitir un caché con estado obsoleto.**

**Orden de publicación:** API primero y confirmar el endpoint autenticado; anunciante después. Si falla OAuth, revertir frontend primero. Monitorear p95 y frecuencia de consultas a 10× tráfico. No almacenar tokens de sesión en issues o logs.

**Estado:** implementado en rama; compiles completos y producción no verificados.
