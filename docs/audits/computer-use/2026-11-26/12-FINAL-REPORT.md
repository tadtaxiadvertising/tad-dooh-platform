# Informe final de la pasada ejecutada

Fecha local: 26 de noviembre de 2026, America/La_Paz. Ejecución: TAD-CUA-20261126-01.

Fuente: `01fb2e0f9507e1c0e3a696c11e76960fa9b56f9a`, rama `codex/computer-use-current-20261126`, worktree `C:/tad-audit-current-20261126`. SHA desplegado: **desconocido**.

## Salud y alcance

Auditoría parcial, con corrección local revisable. API pública disponible en tres health endpoints; rutas protegidas rechazan anónimos. Los portales públicos cargan en los tamaños requeridos. Player documentado rechaza TLS. SHA/digest de EasyPanel no acreditado.

El checkout original estaba en b0a9a1df con trabajo previo; se creó rama allí sin modificar esos archivos. Se hizo fetch y worktree limpio en 01fb2e0f9507e1c0e3a696c11e76960fa9b56f9a para no corregir código obsoleto. Los cambios previos permanecen en C:/tad-dooh-platform.

## Resultados

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

Total de los grupos: 173; aprobados 163, fallidos 1, bloqueados 9. No ejecutados: diez grupos de flujos declarados; cardinalidad exhaustiva desconocida. Los bloqueos TLS repetidos son casos de cliente distintos y una sola causa raíz.

## Hallazgos y corrección

1 P1 y 1 P2 nuevos; cero P0 nuevos confirmados en esta pasada. #560 permanece BLOCKED por infraestructura. #561 tiene implementación local con ocho regresiones; falta verificación completa/proveedor y despliegue autorizado. Los issues históricos de seguridad no se consideran cerrados por esta pasada.

Roles descubiertos: ADMIN, ADVERTISER, DRIVER; visitante, pasajero y dispositivo como actores. Se probaron interfaces anónimas; roles autenticados solo en pruebas sintéticas de API, sin cuentas de staging. Matriz en 01-USER-ROLE-MATRIX.md.

Riesgos de seguridad: pruebas efectivas de RLS/Storage/tenant real pendientes. Riesgos financieros: concurrencia/conciliación/proveedor no probados. Offline: cola componente PASS, reproducción real/lease/reinicio físico pendientes. Rendimiento: navegación local medida, sin carga 10x. UX: recovery placeholder confirmado; WCAG completo pendiente.

## Evidencia y trabajo restante

[Navegación pública](public-runtime-results.json), [disponibilidad/TLS](availability-results.json), [cola offline](offline-browser-results.json), [recuperación](admin-recovery-browser-results.json), [unitarias Player](player-unit-results.tap), [regresión Admin](admin-recovery-green.tap).

Issues creados: [#560](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/560), [#561](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/561). Inventario PR mediante conector: ninguna PR abierta devuelta en consulta; GitHub CLI falló conexión. No usar búsqueda de issues como inventario de PR.

Computer Use tuvo timeouts y captura inconsistente; no se simula evidencia. Browser Use deshabilitado por ajustes. Se usó Playwright con Chromium instalado, contextos nuevos, TLS estricto y sin capturar headers, tokens ni datos personales. Subagentes no ejecutaron tareas por límite de uso.

El usuario eligió continuar local y producción solo lectura. No hay pagos, retiros, cambios DB, proveedores, permisos ni despliegues productivos. La publicación de issues corresponde al alcance pedido; no se cambió política de revisión.

Recomendación: **NO GO para certificación productiva**, por TLS Player y cobertura de negocio/finanzas aún insuficiente. Mantener servicios existentes y remediar de forma controlada; no confundir recomendación con una caída global probada. Siguiente acción precisa en checkpoint.json y 10-REMEDIATION-ROADMAP.md.

## Límites de calidad del candidato

Admin compila con la configuración de tipos del workspace (strict=false), pero el gate adicional --strict falla. No presentar este candidato como listo para release; la configuración existente del build omite typecheck/lint integrados y esos checks se ejecutaron aparte. Dependencias locales reutilizadas resuelven Next 15.5.28 mientras manifest declara 15.5.29: La continuación confirmó CI con instalación frozen-lockfile para la implementación 06fadd22; ver recibo al final. Ver verification-receipts.json.

## Resultado final de compilación y límite de ejecución

Build Admin final: PASS, exit 0, incluido /admin/forgot-password. Ocho regresiones de recuperación y cinco contratos de aislamiento CI: PASS. Typecheck configurado final y lint de los archivos cambiados: exit 0; override strict: FAIL. El servidor del artefacto compilado fue rechazado por revisión automática de aprobación, tanto con host predeterminado como con loopback explícito; el único motivo comunicado fue blocked by policy. No se ejecutaron esos comandos ni se intentó eludir el rechazo. La prueba browser de corrección permanece BLOCKED y no hay captura posterior válida. La captura previa y fallos iniciales están conservados.

Descubrimiento adicional: Simulator y Remotion documentados devolvieron ENOTFOUND desde este host; cuenta como dos probes bloqueadas, no prueba de caída de sus despliegues actuales ni causa raíz común. Sus orígenes canónicos deben confirmarse.

PR de revisión: [#562](https://github.com/tadtaxiadvertising/tad-dooh-platform/pull/562), DRAFT. Sin merge ni despliegue. El aviso de seguridad del push informó 885 alertas agregadas en la rama por defecto (27 critical, 361 high, 434 moderate, 63 low); no se validó ni deduplicó ese inventario y no se sumó a los dos hallazgos reproducidos de esta pasada. Mantener el seguimiento de dependencias existente.

## Continuación verificada — 26 nov 2026, 20:49 La Paz

Implementación 06fadd22148e0e65e3604fe0fbb72d1709a17e53: **15/15 jobs CI SUCCESS**, con pasos realmente ejecutados. [Quality Gates](https://github.com/tadtaxiadvertising/tad-dooh-platform/actions/runs/45918437013) y [Docker](https://github.com/tadtaxiadvertising/tad-dooh-platform/actions/runs/45918436990). El log confirma **102 suites / 892 pruebas API PASS** y **8/8 regresiones de recuperación PASS**. TypeScript configurado, Seguridad, Prisma, Format/Lint y los builds Docker de API/Admin/Advertiser/Driver/Player aprobaron con instalación frozen-lockfile. Esto resuelve el CI pendiente de la implementación; no resuelve el override strict local ni la verificación visual/proveedor. [Recibo](ci-verified-06fadd22.json). Los 173 casos locales se mantienen aparte por solapamiento con las suites CI. Los commits de esta continuación solo cambian evidencia/documentación.

## Ampliación de catálogo y asesores en solo lectura

Proyecto documentado ltdcdhqixvbpdcitthqf: Supabase informa ACTIVE_HEALTHY; no equivale a salud global ni acredita por sí solo el destino del API público. La consulta agregada en BEGIN READ ONLY y con timeout de 5 s observó 56 tablas de aplicación sin extensiones: 32 con RLS, 23 con FORCE RLS, 32 sin políticas; **cero tablas sin RLS con grants para anon/authenticated y cero tablas sin políticas con esos grants**. No se consultaron filas de clientes ni cuerpos de funciones. Las 32 INFO no demuestran exposición pública. Permanecen 2 WARN de search_path y 1 WARN de protección de contraseñas filtradas, ya cubiertas por #507; no se creó un duplicado ni se alteró configuración. Ownership de backend, Storage y aislamiento de usuarios reales siguen pendientes. [Evidencia](supabase-readonly-followup.json) y [consulta](readonly-rls-catalog.sql).
