# Security Audit — TAD DOOH Platform

Fecha: 2026-08-11  
Alcance: backend NestJS + frontend portals (admin/driver/advertiser) + shared packages  
Metodología: lectura estática de controladores, guards, servicios, esquema Prisma y clientes Supabase.

---

## Hallazgos críticos (P0)

### 1. Cross-portal session pollution + default role escalation

**Archivos**: `packages/ui/components/AuthProvider.tsx`, `packages/services/auth.service.ts`

**Hallazgo**:
- El cliente Supabase (`packages/services/supabase.ts`) es un **singleton por proceso/browser** con `persistSession:true` y `autoRefreshToken:true`.
- `AuthProvider` resuelve la sesión en este orden: (1) sesión Supabase, (2) token local por portal, (3) **fallback `'ADMIN'`** (`AuthProvider.tsx:152`: `|| 'ADMIN'`).
- Si un usuario abrió admin portal y luego abre driver portal en la misma pestaña, `buildSessionFromLocalToken` **puede caer al token de admin** si el token de driver no existe.

**Impacto**: Un driver podría verse como admin sin credenciales administrativas, heredando acceso a rutas protegidas por `Roles(UserRole.ADMIN)`.

**Mitigación**: Eliminar el fallback a `'ADMIN'`. Usar `'GUEST'` como rol por defecto cuando no se pueda resolver la sesión.



### 2. Telemetría pública acepta `driverId`/`deviceId` sin autenticar dispositivo

**Archivos**: `apps/api/src/modules/fleet/fleet.controller.ts`, `apps/api/src/modules/telemetry/telemetry.service.ts`, `apps/driver/hooks/useBackgroundTelemetry.ts`

**Hallazgo**:
- `POST /api/v1/fleet/track-batch` está marcado `@Public()`.
- El payload incluye `driverId` y `deviceId` enviados por el cliente.
- El backend inserta estas coordenadas en `telemetry.driver_id` sin validar que el `deviceId` esté registrado y operativo, ni que ese `driverId` esté asociado al dispositivo.

**Impacto**: Cualquier usuario sin autenticación puede enviar telemetría falsa para cualquier driver o dispositivo, contaminando métricas, mapas de admin y cálculos de empleo/ganancias.

**Mitigación**:
- Validar `deviceId` contra `Device` (estado `OPERATIVO`).
- Asociar el driver por `device.driverId`, no por el `driverId` del body.
- Rechazar inserts si el dispositivo no está registrado.



### 3. `@Public()` demasiado amplio en rutas sensibles de device

**Archivos**: `apps/api/src/modules/device/device.controller.ts`

**Hallazgo**:
- Toda la clase `DeviceController` es `@Public()`.
- Endpoints como `POST /device/sync`, `POST /device/bulk-sync`, `POST /device/command/:id/ack` aceptan operaciones de negocio sin autenticación.

**Impacto**: Ataques de sincronización forzada, replay de comandos, o corrupción de playlist/estado de tablet sin identidad del llamante.

**Mitigación**:
- `sync`/`bulk-sync` deben autenticar el dispositivo (ej. header `X-Device-Token` validado contra `Device.authToken`).
- `command/:id/ack` debe validar que el command exista y pertenezca al dispositivo.



### 4. Assets manifest público sin restricción

**Archivos**: `apps/api/src/modules/assets/assets.controller.ts`, `apps/api/src/modules/assets/assets.service.ts`

**Hallazgo**:
- `GET /assets/manifest` es `@Public()` y retorna **todas** las URLs + checksums de campañas activas, sin discriminar por dispositivo autenticado.

**Impacto**: Exposición de catálogo completo de piezas publicitarias a scrapers o usuarios no autorizados.

**Mitigación**: Si el manifest es necesario para tablets offline, el endpoint debe autenticar el dispositivo y retornar solo las campañas asignadas a ese `deviceId`.



### 5. AuthGuard opcional permite endpoints sensibles sin rechazo explícito

**Archivos**: `apps/api/src/modules/auth/guards/supabase-auth.guard.ts`

**Hallazgo**:
- En rutas `@Public()`, `SupabaseAuthGuard` **nunca lanza error** si no hay token; simplemente deja `req.user` vacío.
- Si un controlador olvida decorar una ruta con `@Public()` y tampoco hay `@Roles()`, el acceso queda en `GUEST` sin bloqueo.

**Impacto**: Filtrar lógica de controladores que asumen `req.user` poblado puede causar null-pointer o, peor, operaciones de negocio sin identidad.

**Mitigación**: Validar `req.user` al inicio de toda ruta sensible o rejects con 401 si falta auth.



---

## Hallazgos altos (P1)

### 6. Driver login acepta múltiples identifiers (phone/email/cedula) sin verificar dominio

**Archivos**: `apps/api/src/modules/drivers/drivers.controller.ts`

**Hallazgo**:
- `POST /drivers/login` permite login con `phone`, `email` o `cedula`.
- No hay throttling específico por identifier, solo global.
- El email no pasa por Zod `authorizedEmail` del portal (ese validador está solo en frontend).

**Impacto**: Fuerza bruta sobre cédulas o teléfonos sin protección adicional. Colisión si un driver tiene email de dominio corporativo y ese email también existe en tabla `User` o `Advertiser`.



### 7. `SupabaseAuthGuard` Estrategia 1 se salta verificación asimétrica

**Archivos**: `apps/api/src/modules/auth/guards/supabase-auth.guard.ts:108-113`

**Hallazgo**:
- Si el token usa algoritmo asimétrico (`RS256`, `ES256`) y el `JWT_SECRET` es simétrico, **salta silenciosamente** Estrategia 1 y cae a Estrategia 2 (red).
- Aunque documentado como esperado, genera latencia y dependencia de red en auth.



### 8. Default `CORS_ORIGIN=true` documentado como rompe-split

**Archivos**: `apps/api/src/main.ts`, `MEMORY.md`

**Hallazro**: `CORS_ORIGIN=true` en el panel Easypanel rompe el behavior allowlist.



---

## Recomendaciones de remediación

| ID | Hallazgo | Prioridad | Responsable | Esfuerzo |
|---|---|---|---|---|
| SEC-01 | Default role fallback en AuthProvider | P0 | Frontend | 1-2h |
| SEC-02 | Telemetría pública sin validación de dispositivo | P0 | Backend | 2-4h |
| SEC-03 | Sync/bulk-sync públicos sin auth de dispositivo | P0 | Backend | 2-4h |
| SEC-04 | Assets manifest público sin scope por device | P1 | Backend | 1-2h |
| SEC-05 | AuthGuard opcional sin reject explícito | P1 | Backend | 1h |
| SEC-06 | Driver login multi-identifier | P1 | Backend | 2h |
| SEC-07 | `CORS_ORIGIN=true` rompe CORS | P0 | DevOps | <1h |

---

## Checklist de verificación post-fix

- [ ] AuthProvider no hace fallback a `ADMIN` en ningún caso sin token válido.
- [ ] `/fleet/track-batch` valida `deviceId` registrado antes de insertar telemetría.
- [ ] `/device/sync` y `/device/bulk-sync` requieren header `X-Device-Token` válido.
- [ ] `/assets/manifest` retorna solo assets asignados al `deviceId` autenticado.
- [ ] Existe integración test que valida aislamiento entre portal admin y driver en mismo browser.
- [ ] `CORS_ORIGIN` documentado en `docs/ops/DEPLOY_STATUS.md` como valor prohibido.


