# TAD — recuperación de controles después de #200

- Estado: VERIFICADO localmente; pendiente de los controles remotos del PR y de su eventual fusión.
- Base: `e808358207140ed0f4d772fee6e73f24a1e3f58b`, merge de #200 confirmado en GitHub el 2026-11-04 a las 01:25:28 UTC.
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

## Evidencia y verificación

Los logs originales, incluidos los intentos fallidos, se conservan fuera del repositorio en `C:\Users\Arismendy\.codex\visualizations\2026\11\03\01a1a16d-39e3-7ae0-bed9-073a22bff88c\post-200-20261104`.

Los resultados remotos por SHA se registran en los checks y en la descripción del PR de esta rama. Un build de Next que omite lint/tipos por configuración histórica no acredita esos controles: se ejecutan por separado.

| Comando o alcance ejecutado | Exit | Resultado | Evidencia |
| --- | ---: | --- | --- |
| `corepack pnpm@10.34.0 install --offline --frozen-lockfile` | 0 | PASS; lock consistente, sin descargar versiones nuevas | `frozen-install-checksum-final.log` |
| `pnpm audit --audit-level=high` | 0 | PASS; 0 altas/críticas, 19 moderadas y 6 bajas | `audit-high-candidate.log` |
| ESLint, `--max-warnings 0`, los 11 workspaces de CI | 0 | PASS; mismos controles y umbral | `lint-verified-summary.json`, logs de portales y `api-eslint-complete-verified.log` |
| TypeScript 5.9.3, los 14 proyectos con tsconfig | 0 | PASS; los 4 consumidores del nuevo checksum se repitieron tras integrarlo | `types-integrated-summary.json`, `types-impact-composite-verified.log`, `api-source-evidence.json`, `direct-upload-md5-evidence.json` |
| `prisma validate --schema apps/api/prisma/schema.prisma` con URL sintética local | 0 | PASS; sin consultas ni migraciones | `prisma-validate-verified.log` |
| Prettier 3.9.10 sobre `apps/**/*.{ts,tsx}`, `--end-of-line auto` | 0 | PASS; CRLF del checkout Windows, CI Linux comprueba LF | `prettier-candidate.log` |
| Contratos integrados Node, ejecución en serie | 0 | 111/111 PASS, incluidos consentimiento, seguridad, SMTP y regresiones de UI | `contracts-integrated-verified.log` |
| Regresión de checksum y hooks de subida | 0 | 13/13 PASS; tres hooks reales, oráculo Node independiente y errores | `direct-upload-md5-green.log` |
| `pnpm --filter api test --runInBand` | 0 | 31 suites, 148/148 tests PASS | `api-jest-final.log`, `api-jest-final.json` |
| Runner puro del cálculo de impacto API | 0 | 37 comprobaciones PASS | `api-impact-calculator-tests-final.log` |
| Compilación estática de 9 scripts operativos modificados | 0 | PASS; scripts no ejecutados | `api-operational-scripts-types-final.log` |
| Builds Admin y Driver con configuración sintética | 0 | PASS anterior al último cambio de checksum; Admin también anterior al ajuste de email | `admin-build-verified.log`, `driver-build-verified.log`; los artefactos finales requieren CI |

La revisión independiente de Anunciante/shared y de dependencias/SMTP no encontró P1/P2 introducidos pendientes después de reparar la normalización de email y el checksum. La revisión crítica de API comprobó KYC, roles, importes y nombres Prisma; las suites de pagos, comisiones, wallet, sincronización y dispositivos terminaron verdes.

La instalación congelada anterior terminó con exit 0. La auditoría actual con umbral alto terminó con exit 0 y 25 hallazgos restantes: 19 moderados y 6 bajos; cero altos y cero críticos. Es un resultado acotado al árbol de dependencias consultado, no una certificación de seguridad de producción.

La primera ejecución paralela de contratos tuvo un timeout de arranque del simulador en Windows: el proceso fue interrumpido antes de producir un código de salida. La ejecución diagnóstica aislada, con el mismo timeout de 5 segundos y sin modificar la prueba, terminó 4/4 PASS. La ejecución integrada posterior terminó 111/111 PASS. Un primer build Driver se interrumpió al confirmar presión de memoria; su ejecución en serie terminó con exit 0. Los intentos Jest que detectaron contratos incorrectos en dobles tipados se conservaron y corrigieron sin eliminar casos negativos ni desactivar diagnósticos.

El primer comando de tipos de impact-calculator utilizó `--incremental false`, incompatible con su proyecto composite. Se repitió el comando exacto de CI sin ese argumento y pasó. El primer check de formato local detectó los CRLF de archivos sin cambios; se comprobó `core.autocrlf=true` y se repitió con `--end-of-line auto`, sin modificar el control remoto ni formatear innecesariamente el repositorio.

## Cambios externos y límites

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
