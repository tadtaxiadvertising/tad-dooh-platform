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
