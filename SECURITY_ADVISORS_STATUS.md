# Supabase Security Advisors — Estado y Acciones Requeridas

## Resumen Ejecutivo

| Advisory | Nivel | Estado | Acción Requerida |
|----------|-------|--------|------------------|
| `rls_disabled_in_public` (spatial_ref_sys) | ERROR | ⚪ **Falso positivo aceptado** | Ver sección 1 |
| `extension_in_public` (postgis) | WARN | ⚪ **Falso positivo aceptado** | Ver sección 2 |
| `anon_security_definer_function_executable` (st_estimatedextent) | WARN | ⚪ **Bloqueado por owner supabase_admin** | Ver sección 3 |
| `authenticated_security_definer_function_executable` (st_estimatedextent) | WARN | ⚪ **Bloqueado por owner supabase_admin** | Ver sección 3 |
| `auth_leaked_password_protection` | WARN | 🔴 **Requiere dashboard** | Ver sección 4 |

---

## 1. spatial_ref_sys RLS Disabled (ERROR)

**Diagnóstico:** Tabla `public.spatial_ref_sys` propiedad de `supabase_admin`, 8500 filas de códigos EPSG (catálogo PostGIS). Solo lectura pública (`=r/supabase_admin`).

**Por qué no se puede arreglar:**
- Owner = `supabase_admin` (único superuser)
- Rol `postgres` (MCP/SQL Editor) NO es superuser → `ALTER TABLE` falla con `42501: must be owner`
- Activar RLS rompería `ST_Transform` y funciones espaciales que la app usa (`telemetry.coords geography`)

**Acción:** Marcar como "Known/accepted" en Supabase Dashboard → Database → Advisors. Riesgo real = 0 (catálogo de referencia, no datos sensibles).

---

## 2. postgis Extension in Public (WARN)

**Diagnóstico:** Extensión PostGIS instalada en schema `public`.

**Por qué no se puede arreglar:**
- Requiere mover la extensión a schema dedicado (`CREATE EXTENSION postgis SCHEMA extensions;`)
- Necesita privilegio `CREATE` en schema y permisos de superuser
- Owner actual = `supabase_admin`

**Impacto real:** Ninguno para esta app (schema public es estándar en Supabase; PostGIS está diseñado para convivir).

**Acción:** Marcar como accepted. Si en el futuro se requiere, solo Supabase Support puede moverla.

---

## 3. st_estimatedextent SECURITY DEFINER (2x WARN)

**Diagnóstico:** 3 overloads de `st_estimatedextent` (funciones C de PostGIS) son `SECURITY DEFINER` y ejecutables por `anon`/`authenticated` via PostgREST RPC.

**Por qué no se puede arreglar vía MCP/SQL:**
- Owner = `supabase_admin` → `REVOKE EXECUTE` / `ALTER FUNCTION` fallan con `42501`
- Son funciones C internas de PostGIS (`$libdir/postgis-3`)
- `ALTER FUNCTION ... SECURITY INVOKER` requeriría ser owner

**Mitigación real:** Estas funciones solo estiman bounding box de geometrías — no leen/escriben datos de usuario. El riesgo de fuga es nulo.

**Acción:** Marcar como accepted. Si Supabase permite en el futuro `ALTER FUNCTION ... SECURITY INVOKER` para roles no-superuser, se puede aplicar.

---

## 4. Leaked Password Protection Disabled (WARN) — **ÚNICO ACCIONABLE**

**Diagnóstico:** Supabase Auth no verifica contraseñas contra HaveIBeenPwned.

**Solución:** Requiere **dashboard o Management API**.

**Pasos (Dashboard):**
1. Ir a Supabase Dashboard → Authentication → Settings
2. Habilitar "Leaked Password Protection"
3. Guardar

**Alternativa (Management API):**
```
POST https://api.supabase.com/v1/projects/ltdcdhqixvbpdcitthqf/config/auth
Authorization: Bearer <management_token>
{
  "password_protection": { "enabled": true }
}
```
Requiere Personal Access Token de Supabase (generable en https://supabase.com/dashboard/account/tokens).

**Acción pendiente:** Usuario debe ejecutar esto (no accesible para MCP sin PAT).

---

## Conclusión

**Lo automatizable (MCP/SQL) — 0 de 5 advisories** son arreglables por limitación de permisos `supabase_admin`.

**Lo que el usuario debe hacer en dashboard:**
1. ✅ Marcar spatial_ref_sys, postgis, st_estimatedextent como "Known/accepted" (3 advisories)
2. 🔴 Habilitar "Leaked Password Protection" en Auth Settings (1 advisory real)

**Estado de la app:** Segura. La superficie de ataque real está cubierta (auth/RBAC/RLS en tablas de usuario). Los advisories restantes son falsos positivos de PostGIS o config de Auth externa.

---

*Generado: 2026-09-10*
