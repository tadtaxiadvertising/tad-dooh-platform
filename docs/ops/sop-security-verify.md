# SOP — Security Verification (TAD DOOH Platform)

## 1. Propósito
Garantizar que cualquier release, rollout u operación manual sobre el backend, portals y apps mantenga el modelo de seguridad objetivo: **deny-by-default, least privilege, audit trail, data isolation**.

## 2. Roles y permisos

| Rol | Scope | Operaciones autorizadas |
|---|---|---|
| SUPER_ADMIN | Plataforma completa | Gestión de admins, features flags, despliegues |
| ADMIN | Plataforma completa excepto configuraciones restringidas | CRUD campañas/drivers/advertisers, reportes |
| ADVERTISER | Propios recursos | Portal campañas propias, analíticas propias, billing propio |
| DRIVER | Propio recurso | Hub personal, telemetría propia, device propio |

Regla de negocio:
- No existe `SUPER_ADMIN` como rol declarado en código hoy. Se recomienda formalizarlo como rol distinto antes de producir cambios sensibles.
- Todo acceso a `GET/PUT/POST/DELETE` sobre recursos con `:id` EXCEPTO `/advertiser/create` y `/drivers/create` debe pasar por `TenantGuard` o validación equivalente en el servicio.

## 3. Verificación antes de deploy / release

### Backend
- Confirmar `JWT_SECRET` y `SUPABASE_JWT_SECRET` configurados y distintos.
- Confirmar `DATABASE_URL` lista (sin secrets expuestos en logs).
- Validar que no quedaron `@Public()` expuestos en endpoints sensibles: `/fleet/*`, `/finance/*`, `/wallet/*`, `/system-settings/*`, `/drivers/:id`, `/advertisers/:id`, `/campaigns/:id`, `/bi/*`, `/referral/*`.
- Auditar nuevas queries para evitar enumeración: endpoints como `/widgets/:id`, `/users/:name`, `/assets/:id` deben rechazar 404 cuando `TenantGuard` no aplique.
- Correr `tsc --noEmit` y (si aplica) sanity smoke tests contra un tenant test.

### Frontend Portals
- Confirmar que `login` usa `/api/auth/login` y no backdoorea con `signInWithPassword` sin backend.
- Confirmar que cada portal guarda tokens en su namespace local (`tad_admin_*`,`tad_advertiser_*`,`tad_driver_*`).
- Asegurar `NEXT_PUBLIC_SUPABASE_*` configurado y no hardcodeado en release.
- Validar rutas protegidas y middleware por portal (admin vs advertiser vs driver) para evitar cross-tenant views.

### Mobile / Driver App
- Confirmar pairing flow cierra sesión previa y asigna determinísticamente el driver.
- Verificar que el tablet hub usa autenticación basada en dispositivo + key, sin exponer otra data.

## 4. Checklist anti-incidentes
- [ ] No se descubren endpoints sensibles sin autenticación.
- [ ] No se descubren respuestas de recursos de otro tenant.
- [ ] Los endpoints públicos tablet solo exponen absolutamente lo necesario.
- [ ] La autenticación entre servicios (backend ↔ remotion) usa credenciales dedicadas y no keys de producción frontend.
- [ ] No se registran secretos en logs ni en Sentry metadata.
- [ ] Las respuestas con errores no exponen stack traces ni secrets en producción.
- [ ] Wallet / Finance no puede ser accedido sin 2FA/rol explícito.

## 5. Respuesta a incidentes
1. Cortar el despliegue si existe fuga de datos o acceso sin autenticación.
2. Revisar altar en `SentinelInterceptor` y logs estructurados.
3. Verificar llamadas sospechosas en `/network` y `/metrics`.
4. Revocar `SUPABASE_JWT_SECRET` y `JWT_SECRET` en caso de exposición.
5. Comunicar a Mendy con `evento + impacto + remediación`.

## 6. Próximos pasos sugeridos
- Formalizar `UserRole` con `SUPER_ADMIN` y mapa de permisos centralizado.
- Hacer `TenantGuard` obligatorio para todas las rutas con `:id`.
- Crear `docs/ops/sop-deploy.md` y `docs/ops/sop-incident-response.md`.
