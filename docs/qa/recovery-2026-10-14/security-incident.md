# Security Incident Report — 2026-10-14

## RESUMEN

| Métrica | Estado |
|---------|--------|
| **Incidente** | Expuestos archivos `.env` con credenciales reales |
| **Severidad** | P0 — CRÍTICO |
| **Estado** | ✅ Contenido (detección, aislamiento y documentación completados) |
| **Rotación** | ⏸️ Pendiente (acceso de operador autorizado requerido) |

## Evidencia (Redactada)

| Archivo | Contenido |
|---------|-----------|
| `apps/api/.env` | DATABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET, STORAGE_SECRET_KEY, SMTP_PASSWORD, SENDGRID_API_KEY, GOOGLE_SERVICE_ACCOUNT_JSON_BASE64, SIMULATOR_API_KEY |
| `apps/admin/.env` | NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_API_URL |
| `apps/driver/.env` | Credenciales de driver |
| `apps/advertiser/.env` | Credenciales de advertiser |

## Acciones Realizadas

1. **Detección** — Archivos identificados como conteniendo credenciales reales (no `.example`).
2. **Verificación de rastreo** — `git ls-files` confirmó que **ningún archivo `.env` está rastreado**.
3. **Verificación de `.gitignore`** — Archivo ya incluía `.env` en la raíz.
4. **Documentación** — Evaluación redactada; **sin credenciales impresas**.
5. **Notificación** — Reportado al equipo para rotación autorizada.

## Acciones Pendientes

1. **Rotación de credenciales** — Realizar por operador autorizado:
   - Supabase: regenerar `service_role_key`, `anon_key`, `jwt_secret`
   - S3/R2 Storage: rotar accesos y secret keys
   - SendGrid: rotar API key
   - Google Cloud: rotar service account key
   - JWT: reemitir `JWT_SECRET` y `REFRESH_TOKEN_EXPIRES_IN`
2. **Revisión de auditoría** — Revisar logs de acceso a `ltdcdhqixvbpdcitthqf` (Supabase), DigitalOcean Spaces, SendGrid, Google Cloud.
3. **Bloqueo de escalamiento** — Evaluación de si credenciales rotadas afectan a entornos en ejecución.

## Notas de Seguridad

- No se incluyeron credenciales o valores sensibles en este documento.
- No se modificaron archivos `.env` ni se reemplazaron (la rotación es operativa).
- El estado de producción no fue modificado por esta auditoría.
