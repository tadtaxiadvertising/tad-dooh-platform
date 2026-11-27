# Regresiones y verificaciones

Fecha local: 26 de noviembre de 2026, America/La_Paz. Ejecución: TAD-CUA-20261126-01.

Fuente: `01fb2e0f9507e1c0e3a696c11e76960fa9b56f9a`, rama `codex/computer-use-current-20261126`, worktree `C:/tad-audit-current-20261126`. SHA desplegado: **desconocido**.

- Player: 56/56 unitarias, exit 0; log TAP conservado.
- API: 8 suites, 60/60 pruebas, exit 0; guard/tenant/login/wallet/PoP/referido, con Prisma/proveedores sintéticos.
- Cola browser: 7/7 comprobaciones, exit 0, IndexedDB y SW reales; servidor ACK sintético.
- Recuperación: 8/8 regresiones finales; RED de vista compartida, middleware y client/layout registrados por separado. Un primer fallo de harness React y route inexistente no se usa como evidencia causal de producto; el fallo válido del formulario y los siguientes RED son explícitos.
- Player tsc strict: exit 0. Vite build: exit 0.
- Admin tsc: primer intento falló por dependencias no vinculadas; segundo intento tras junctions tiene recibo separado. No se altera tsconfig para obtener verde. strict=false ya existe en ese workspace; no llamarlo strict aprobado.
- Lint Admin, UI y estado final de build/browser se conservan en verification-receipts.json. El primer lint en raíz falló por ausencia de flat config; repetir con configuración explícita no oculta ese fallo.

[Navegación pública](public-runtime-results.json), [disponibilidad/TLS](availability-results.json), [cola offline](offline-browser-results.json), [recuperación](admin-recovery-browser-results.json), [unitarias Player](player-unit-results.tap), [regresión Admin](admin-recovery-green.tap).

## Verificación final adicional

Typecheck configurado Admin final: exit 0. Override --strict: exit 2, 169 líneas de diagnósticos; incluye páginas no modificadas y no acredita baseline strict separado. No se cambió configuración ni se añadieron ny. Lint Admin: exit 0. Lint UI con configuración de proyecto: exit 0 con avisos existentes de tipos any. Cinco contratos de aislamiento CI PASS; la nueva regresión de recuperación está registrada en CI. Build Admin inicial: exit 0, ruta nueva compilada; artefacto final tras navegación de vuelta pendiente de su recibo propio.

Comandos reproducibles de navegador local: establecer AUDIT_PLAYWRIGHT_MODULE al paquete Playwright instalado y AUDIT_CHROMIUM_PATH al chrome.exe instalado; ejecutar node scripts/computer-use-offline-queue-audit.cjs y node scripts/computer-use-recovery-audit.cjs. El segundo requiere el servidor local 127.0.0.1:3108 compilado con URL pública Supabase sintética audit.invalid. Toda petición externa se intercepta en ese contexto; no usa secretos reales. No ejecutar formularios de auditoría autenticada contra producción.

Build Admin final PASS (admin-build-final.log). Inicio de servidor del artefacto: BLOCKED por revisión automática aun en loopback; no se afirma verificación visual posterior. El último ajuste se verificó mediante ocho regresiones, typecheck configurado y lint final. strict global sigue FAIL.

CI inicial f39a9575: Seguridad, Prisma y Docker Player PASS. Prettier falló únicamente en la nueva página forgot-password.tsx; se aplicó Prettier 3.9.10 a ese archivo. Ocho regresiones locales y formato de esa página PASS tras el cambio sin lógica. Resultado CI del nuevo SHA pendiente; no reutilizar el verde del SHA previo como aprobación del actual. Ver ci-initial-results.json.
