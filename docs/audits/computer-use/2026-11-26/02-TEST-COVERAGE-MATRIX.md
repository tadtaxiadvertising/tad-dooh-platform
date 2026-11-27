# Cobertura ejecutada y pendiente

Fecha local: 26 de noviembre de 2026, America/La_Paz. Ejecución: TAD-CUA-20261126-01.

Fuente: `01fb2e0f9507e1c0e3a696c11e76960fa9b56f9a`, rama `codex/computer-use-current-20261126`, worktree `C:/tad-audit-current-20261126`. SHA desplegado: **desconocido**.

| Grupo | Casos | PASS | FAIL | BLOCKED | Evidencia |
| --- | ---: | ---: | ---: | ---: | --- |
| player-unit | 56 | 56 | 0 | 0 | [evidencia](player-unit-results.tap) |
| api-focused | 60 | 60 | 0 | 0 | [evidencia](verification-receipts.json) |
| offline-real-browser-local-queue | 7 | 7 | 0 | 0 | [evidencia](offline-browser-results.json) |
| admin-regression | 8 | 8 | 0 | 0 | [evidencia](admin-recovery-green.tap) |
| ci-isolation-regression | 5 | 5 | 0 | 0 | [evidencia](ci-isolation-results.tap) |
| public-responsive | 24 | 18 | 0 | 6 | [evidencia](public-runtime-results.json) |
| anonymous-private-navigation | 3 | 3 | 0 | 0 | [evidencia](public-runtime-results.json) |
| https-availability | 7 | 6 | 0 | 1 | [evidencia](availability-results.json) |
| production-admin-recovery-reproduction | 1 | 0 | 1 | 0 | [evidencia](admin-recovery-browser-results.json) |
| supplemental-service-discovery | 2 | 0 | 0 | 2 | [evidencia](supplemental-service-discovery.json) |
| Total registrado | 173 | 163 | 1 | 9 | [JSON](test-results.json) |

Los 24 casos responsive son comprobaciones acotadas de carga HTTP, JS y ancho; PASS no acredita toda la página, WCAG o negocio. Tres casos de navegación privada finalizan en login; la clasificación se verificó contra las rutas finales conservadas como PENDING_VERIFICATION en el recibo bruto. No se altera ese recibo histórico.

Diez grupos de flujos permanecen NOT_TESTED, enumerados en test-results.json. No hay inventario exhaustivo de todos sus casos: no se calcula un número ficticio de pruebas no ejecutadas ni porcentaje global. Los pasos de correo/pago necesitan sandbox; producción permanece solo lectura por decisión explícita del usuario.
