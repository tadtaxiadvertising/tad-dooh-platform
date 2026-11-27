# Seguridad multiusuario

Fecha local: 26 de noviembre de 2026, America/La_Paz. Ejecución: TAD-CUA-20261126-01.

Fuente: `01fb2e0f9507e1c0e3a696c11e76960fa9b56f9a`, rama `codex/computer-use-current-20261126`, worktree `C:/tad-audit-current-20261126`. SHA desplegado: **desconocido**.

## Evidencia

- Tres GET protegidos de API devolvieron 401 sin credenciales. Tres páginas privadas llevaron al login de cada portal.
- Suites locales: DeviceTokenGuard, device-request-scope, AuthService login y TenantGuard, más tenant/PoP y wallet sintéticos dentro de 60 pruebas.
- Credenciales de humanos no se obtuvieron, ingresaron ni publicaron. Ninguna prueba usó datos personales reales.
- No se ejercitaron payloads de ataque contra producción. No se inspeccionó RLS ni Storage del proyecto desplegado.
- La ruta nueva de recuperación se permite explícitamente; dashboard sigue protegido en regresión de middleware y lista del proveedor. No se alteran permisos DB ni emisión de tokens.

## Límites

IDOR real de dos tenants, XSS/CSRF/SSRF, uploads maliciosos, revocación y sesiones expiradas: NOT_TESTED en runtime. No declarar aislamiento completo. Los issues históricos #244/#489 y #217/#313 requieren su propio cierre con evidencia vigente; consultarlos no equivale a resolverlos.

Computer Use produjo una captura inconsistente con el árbol accesible y timeouts; no se persistió como evidencia de TAD. Browser Use reportó deshabilitado. Se continuó con Chromium aislado sin ignorar TLS.

[Navegación pública](public-runtime-results.json), [disponibilidad/TLS](availability-results.json), [cola offline](offline-browser-results.json), [recuperación](admin-recovery-browser-results.json), [unitarias Player](player-unit-results.tap), [regresión Admin](admin-recovery-green.tap).

## Ampliación de catálogo y asesores en solo lectura

Proyecto documentado ltdcdhqixvbpdcitthqf: Supabase informa ACTIVE_HEALTHY; no equivale a salud global ni acredita por sí solo el destino del API público. La consulta agregada en BEGIN READ ONLY y con timeout de 5 s observó 56 tablas de aplicación sin extensiones: 32 con RLS, 23 con FORCE RLS, 32 sin políticas; **cero tablas sin RLS con grants para anon/authenticated y cero tablas sin políticas con esos grants**. No se consultaron filas de clientes ni cuerpos de funciones. Las 32 INFO no demuestran exposición pública. Permanecen 2 WARN de search_path y 1 WARN de protección de contraseñas filtradas, ya cubiertas por #507; no se creó un duplicado ni se alteró configuración. Ownership de backend, Storage y aislamiento de usuarios reales siguen pendientes. [Evidencia](supabase-readonly-followup.json) y [consulta](readonly-rls-catalog.sql).
