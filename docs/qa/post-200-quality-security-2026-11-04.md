# TAD — recuperación de controles después de #200

> Seguimiento 2026-11-05: #208 se fusionó a las 07:24:55 UTC. Este documento conserva el estado de la revisión anterior a esa fusión; véase el [seguimiento después de #208](post-208-followup-2026-11-05.md). Se corrige abajo la afirmación sobre desactivación de Sentry y el nombre del paquete UI.

- Estado: IMPLEMENTADO, PENDIENTE DE VERIFICACIÓN remota. Las comprobaciones locales descritas abajo están verificadas; GitHub no inicia los jobs por facturación/límite de gasto de la cuenta.
- Base: `e808358207140ed0f4d772fee6e73f24a1e3f58b`, merge de #200 confirmado en GitHub el 2026-11-04 a las 01:25:28 UTC.
- El merge recordado por el usuario, #198 (`10774bb4`), también pertenece a la historia de `main`; se confirmó de nuevo antes del cierre.
- Fuente final verificada: `29cd1a07d186244e72fba99291e391ca1092438e`, después de integrar `main` (`64bc44cc5d246e56fbd354df599e5018f2e46e0e`, merge #207). Cierre local: 2026-11-05.
- Rama: `codex/post-200-quality-security-20261104`.
- Entorno: Windows local, Node 22.20.0 y pnpm 10.34.0; configuración sintética para las compilaciones web. Sin conexión de pruebas a datos, proveedores de correo o pagos de producción.
- Alcance: recuperar los controles globales que seguían rojos tras las mejoras de landing: lint con umbral cero y auditoría de dependencias de severidad alta. Corregir errores de comportamiento reproducibles encontrados al sustituir tipos abiertos por contratos reales.

## Hallazgos y correcciones

| Hallazgo | Causa comprobada | Corrección | Prueba de regresión |
| --- | --- | --- | --- |
| Bloqueo global de lint | Avisos de imports y variables sin uso, tipos `any` y contratos incompletos en los portales, API y paquetes | Tipos de dominio y de Prisma, errores `unknown` con lectura segura, retirada de código sin referencias; se conserva el umbral cero | Lint y TypeScript por workspace; suites existentes |
| Auditoría alta bloqueada | Dependencias directas y transitivas vulnerables | Actualización de consumidores Zod/TypeScript, correo, parser ESLint y aristas transitivas compatibles; serializador de Workbox actualizado | Cinco scripts de seguridad ejecutan contratos, HTTP local, serialización aislada y transporte de correo en memoria |
| Validación de email podía lanzar una excepción con mayúsculas tras migrar Zod | La intersección intentaba combinar el email normalizado con el valor original; Zod 4 lanza si no se pueden unir | Encadena normalización y protección de entrada con `pipe`, conservando las mismas reglas y dominios | Regresión roja/verde sobre los esquemas reales de login, recuperación y registro, con casos de denegación |
| KYC aceptaba envíos sin verificar identidad y propiedad | Ruta pública y `driverId` controlado por el cuerpo | Exige sesión y rol; Driver sólo puede enviar su propia identidad; Admin conserva su acceso autorizado | `kyc.controller.spec.ts`, casos positivos y negativos, sin DB |
| Biblioteca de medios perdía el identificador de una subida | El hook devuelve `mediaId` y el consumidor buscaba sólo `id` | Normaliza ambas respuestas antes de deduplicar e insertar | `advertiser-upload-contract.test.cjs`, rojo y verde sobre el handler real |
| La subida directa fallaba antes de enviar el archivo en los tres portales | Se solicitaba MD5 a WebCrypto, un algoritmo no admitido por esa API | Helper de checksum incremental compatible con el contrato MD5 del servidor, con dependencia ya presente en el lock declarada directamente | Regresión sobre los hooks reales y oráculo independiente Node; vectores binarios y límites entre bloques |
| DeviceHub podía conservar otro perfil tras una carga fallida y enviar comandos sin perfil | Estado anterior y manejador sin guardia | Reinicia perfil/error al cargar y valida perfil antes de mandar comandos | `driver-error-contract.test.cjs`, ejecución de componente y helpers sin red |
| El manejo de errores del modal podía lanzar otro error | Cast que asumía siempre `response.data` | Helper que acepta errores nativos y respuestas desconocidas | Contratos compartidos y de Driver |
| Perfil Admin del anunciante utilizaba consultas Prisma inválidas | `referredBy` es un scalar, la relación se llama `referrer`; la aceptación de contrato tiene `timestamp`, no `createdAt` | Usa los nombres del esquema existente y conserva el identificador referido en la respuesta | Regresión de perfiles con dobles de Prisma, sin cambios de esquema |
| Perfil Admin del conductor pedía una relación inexistente | `referencedDrivers` era un alias de respuesta, la relación Prisma se llama `referrals` | Consulta la relación real y conserva el alias de respuesta | Regresión de contrato del perfil con doble de Prisma |
| Recibo de factura fallaba al dar formato al importe | La factura tiene `totalAmount`; el PDF requiere `amount` | Traduce explícitamente el importe al contrato del PDF | Regresión que reproduce `amount.toLocaleString` ausente |
| El nuevo #207 de `main` incorporó contratos abiertos en su regresión de errores Driver | Capturas `any` y dobles parciales forzados al tipo de la clase | Conserva las respuestas públicas sanitizadas de #207, usa errores `unknown` y dobles tipados mediante el módulo de pruebas Nest | 2 suites/9 tests dirigidos; suite API completa 151/151 |

## Evidencia y verificación

Los logs originales, incluidos los intentos fallidos, se conservan fuera del repositorio en el conjunto local de evidencias `post-200-20261104`. El checkpoint local registra su ruta absoluta.

Los resultados remotos por SHA se registran en los checks y en la descripción del PR de esta rama. Un build de Next que omite lint/tipos por configuración histórica no acredita esos controles: se ejecutan por separado.

| Comando o alcance ejecutado | Exit | Resultado | Evidencia |
| --- | ---: | --- | --- |
| `corepack pnpm@10.34.0 install --offline --frozen-lockfile` | 0 | PASS; lock consistente, sin descargar versiones nuevas | `frozen-install-checksum-final.log` |
| `corepack pnpm@10.34.0 audit --audit-level=high` | 0 | PASS; 0 altas/críticas, 17 moderadas y 6 bajas en la consulta final | `audit-high-after-main-final.log` |
| ESLint, `--max-warnings 0`, los 11 workspaces de CI | 0 | PASS; mismos controles y umbral | `lint-verified-summary.json`, logs de portales y `api-eslint-complete-verified.log` |
| TypeScript 5.9.3, los 14 proyectos con tsconfig | 0 | PASS; los 4 consumidores del nuevo checksum se repitieron tras integrarlo | `types-integrated-summary.json`, `types-impact-composite-verified.log`, `api-source-evidence.json`, `direct-upload-md5-evidence.json` |
| `prisma validate --schema apps/api/prisma/schema.prisma` con URL sintética local | 0 | PASS; sin consultas ni migraciones | `prisma-validate-verified.log` |
| Prettier 3.9.10 sobre `apps/**/*.{ts,tsx}`, `--end-of-line auto` | 0 | PASS; CRLF del checkout Windows, CI Linux comprueba LF | `prettier-candidate.log` |
| Contratos integrados Node, ejecución en serie | 0 | 111/111 PASS, incluidos consentimiento, seguridad, SMTP y regresiones de UI | `contracts-integrated-verified.log` |
| Regresión de checksum y hooks de subida | 0 | 13/13 PASS; tres hooks reales, oráculo Node independiente y errores | `direct-upload-md5-green.log` |
| `pnpm --filter api test --runInBand`, después de integrar #207 | 0 | 31 suites, 151/151 tests PASS | `post-207-api-jest-final.log`, `post-207-api-jest-final.json` |
| Tipos API y lint de los dos archivos ajustados después de #207 | 0 | PASS; conserva mensajes sanitizados y diagnósticos estrictos | `post-207-api-types.log`, `post-207-driver-final-lint.log`, `post-207-targeted-verified.log` |
| Runner puro del cálculo de impacto API | 0 | 37 comprobaciones PASS | `api-impact-calculator-tests-final.log` |
| Compilación estática de 9 scripts operativos modificados | 0 | PASS; scripts no ejecutados | `api-operational-scripts-types-final.log` |
| Builds finales en serie: impact-calculator, Advertiser, Admin, Driver, API y Player | 0 en los 6 | PASS; scripts de build declarados, configuración web sintética | `final-builds-summary.json`, `final-build-{impact,advertiser,admin,driver,api,player}.log` |
| `docker build` de los cuatro Dockerfiles canónicos de CI: API, Player, Admin y Driver | 0 en los 4 | PASS; artefactos `linux/amd64` inspeccionados, tags locales `tad-local-{api,player,admin,driver}:29cd1a07` | `final-docker-builds-summary.json`, `final-docker-*.log`, `final-docker-artifacts-inspected.log` |
| `node scripts/landing-v3-smoke.cjs`, contra el build standalone local de Anunciante | 0 | 15/15 PASS; ocho anchos, teclado, movimiento, sin JS, Slow 3G y consentimiento | `final-smoke-advertiser.log`, capturas `final-smoke-advertiser/` |
| `node scripts/driver-landing-smoke.cjs`, contra el build standalone local de Driver | 0 | 13/13 PASS; ocho anchos, teclado, movimiento, sin JS y simulación de ingresos | `final-smoke-driver.log`, capturas `final-smoke-driver/` |

La revisión independiente de Anunciante/shared y de dependencias/SMTP no encontró P1/P2 introducidos pendientes después de reparar la normalización de email y el checksum. La revisión crítica de API comprobó KYC, roles, importes y nombres Prisma; las suites de pagos, comisiones, wallet, sincronización y dispositivos terminaron verdes.

La instalación congelada terminó con exit 0. La consulta final de auditoría terminó con exit 0 y 23 hallazgos restantes: 17 moderados y 6 bajos; cero altos y cero críticos. La consulta anterior devolvía 25 (19 moderados y 6 bajos); se conservan ambos logs. El inventario de avisos del registro puede variar sin modificar el lock. Este resultado se limita al árbol consultado y no certifica la seguridad de producción.

Los builds finales terminaron entre 01:59 y 02:15 UTC del 2026-11-05. Las webs utilizaron una URL Supabase sintética y backend en loopback; no se ejecutó el arranque operativo de API. Corrección del 2026-11-05: las variables Sentry se configuraron vacías, pero el servidor Driver conserva un DSN alternativo; eso no demuestra desactivación del SDK ni ausencia de egreso del servidor. Las advertencias existentes de Sentry se conservan en los logs. Los smokes públicos bloquean API, solicitudes remotas del navegador y service workers, y sus servidores locales se detienen al terminar. Se revisaron también capturas de escritorio y móvil. No acreditan sesiones autenticadas, datos financieros reales, accesibilidad completa ni offline del Player.

El smoke de Anunciante registró el merge `67e45cb` con árbol modificado por los dos ajustes API posteriores y outputs generados. La comparación de `apps/admin`, `apps/driver`, `apps/advertiser`, `packages/ui` y `packages/services` entre `d4c91240` y `29cd1a07` no contiene cambios: los builds y smokes finales utilizan la misma fuente frontend comprobada. Después de integrar #207 se repitieron tipos, regresiones y la suite completa API. Los outputs generados finales se respaldaron antes de restaurarlos; no se incorporan al PR.

Las cuatro imágenes se compilaron en serie entre 06:47 y 07:09 UTC, con Docker 29.9.2 en Linux/amd64. Se usaron exactamente `Dockerfile.api`, `Dockerfile.player`, `Dockerfile.admin` y `Dockerfile.driver`; las URLs y claves públicas de los builders web se sustituyeron por fixtures sintéticos/loopback mediante build args. Los identificadores de imagen y códigos de salida están registrados en el resumen. No se publicaron imágenes ni se inició el entrypoint operativo de API. Estos resultados acreditan compilación y presencia del artefacto, no despliegue ni salud de producción.

El motor Docker inicialmente no arrancaba y el backend conservaba un error de comprobación WSL. Un reinicio acotado del runtime existente terminó después del timeout inicial de 45 segundos; se confirmó su recuperación antes de construir. No se instaló ni actualizó WSL ni se cambió su configuración. Se conservaron el diagnóstico y el intento fallido. Los logs de build conservan también las advertencias no bloqueantes de Sentry, Prisma/OpenSSL durante la instalación del workspace completo y BuildKit sobre nombres de variables de claves anónimas; no se suprimieron.

La primera ejecución paralela de contratos tuvo un timeout de arranque del simulador en Windows: el proceso fue interrumpido antes de producir un código de salida. La ejecución diagnóstica aislada, con el mismo timeout de 5 segundos y sin modificar la prueba, terminó 4/4 PASS. La ejecución integrada posterior terminó 111/111 PASS. Un primer build Driver se interrumpió al confirmar presión de memoria; su ejecución en serie terminó con exit 0. Los intentos Jest que detectaron contratos incorrectos en dobles tipados se conservaron y corrigieron sin eliminar casos negativos ni desactivar diagnósticos.

El primer comando de tipos de impact-calculator utilizó `--incremental false`, incompatible con su proyecto composite. Se repitió el comando exacto de CI sin ese argumento y pasó. El primer check de formato local detectó los CRLF de archivos sin cambios; se comprobó `core.autocrlf=true` y se repitió con `--end-of-line auto`, sin modificar el control remoto ni formatear innecesariamente el repositorio.

## Cambios externos y límites

- [PR #208](https://github.com/tadtaxiadvertising/tad-dooh-platform/pull/208) permanece abierto y en borrador. No se fusionó ni desplegó.
- CI está BLOQUEADO externamente. La anotación de [Format & Lint del SHA final](https://github.com/tadtaxiadvertising/tad-dooh-platform/actions/runs/41953164960/job/127001645827) confirma que el job no arrancó por pagos fallidos o límite de gasto de la cuenta. Se comprobó el mismo bloqueo en el candidato anterior. Los checks rojos no proporcionan resultados de ejecución de código; no se presentan como controles aprobados ni se relajan sus reglas. Hace falta resolver la cuenta y ejecutar los controles remotos.
- Se reutilizaron payloads revisados de las propuestas #201, #202, #203 y #206; no se fusionaron esas ramas ni sus workflows generadores. El lock se resolvió centralmente.
- No se modificaron el esquema ni las migraciones de Prisma, saldos, ledgers, condiciones comerciales, credenciales o configuración de proveedores.
- El correo se prueba con transporte en memoria. La entrega SMTP real y las sesiones OAuth reales requieren un entorno autorizado de staging y no forman parte de los resultados locales.
- El service worker manual canónico y la lógica de ACK/reintentos permanecen sujetos a los controles de offline existentes. Un build o un smoke de landing no certifica el funcionamiento de tablets en campo.
- No se ejecutan los E2E autenticados o mutantes del árbol raíz desde CI de pull requests.
- Checksum: [contrato WebCrypto](https://www.w3.org/TR/webcrypto/#algorithm-overview) y [implementación oficial de noble-hashes 1.8.0](https://github.com/paulmillr/noble-hashes/blob/1.8.0/src/legacy.ts). MD5 sólo conserva el contrato previo de integridad de archivos; no introduce un nuevo mecanismo de autenticación.
- El helper huérfano `apps/api/test-local.ts` importaba un módulo inexistente y no tenía referencias activas; se retiró con copia externa de su contenido original. Los scripts de bootstrap conservan la contraseña exigida desde entorno, sin defaults incorporados.
- Se respaldaron y restauraron los outputs PWA y tsbuildinfo generados localmente. No se incluyen en el cambio de fuente.

## Reversión

Antes de fusionar, se puede descartar la rama de propuesta. Después de una eventual fusión autorizada, revertir los commits de esta propuesta mediante un PR revisado, restaurando manifests, lock y adaptadores de tipos juntos. No hay migraciones ni operaciones de datos que revertir. El despliegue requiere su propio proceso y verificación de salud.
