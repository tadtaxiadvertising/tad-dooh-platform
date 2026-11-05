# TAD — seguimiento después de #208

- Estado: IMPLEMENTADO, PENDIENTE DE VERIFICACIÓN.
- Base: `0910642a8ad676cf067f6c7f9b5520ab783cb8e5`, merge de [#208](https://github.com/tadtaxiadvertising/tad-dooh-platform/pull/208) confirmado el 2026-11-05 a las 07:24:55 UTC.
- Fuente candidata: `d4997a3371ebfdfd92db5efb450e23c010199c1d`; rama `codex/post-208-followup-20261105`.
- Entorno: Windows, Node 22.20.0, pnpm 10.34.0, TypeScript 5.9.3; imágenes Docker Linux/amd64. Evidencias externas: conjunto `post-208-20261105`.
- La comparación entre el merge #208 y el head validado anteriormente no contiene diferencias de árbol. Se reutiliza la evidencia anterior sólo para componentes sin cambios; las pruebas siguientes se ejecutaron para esta intervención.

## Hallazgos y correcciones

| Hallazgo | Evidencia/causa | Corrección y límite |
| --- | --- | --- |
| El panel Admin afirmaba salud y métricas sin medirlas | Render real mostraba estados operativos, 42 ms, 99.98%, un control hace un minuto y enlaces `undefined`/`#` | Estado sin verificar, sin cifras inventadas; mantiene consolas válidas y representa enlaces ausentes. No añade consultas ni telemetría. Regresión RED 4 fallos → GREEN 4/4. |
| El comando raíz de desarrollo de tablet fallaba | `npm run dev:tablet -- -- --help` terminaba 1 por workspace inexistente `player` | Usa el nombre real `tad-player`; el mismo comando termina 0 y muestra Vite 6.4.5, sin arrancar servidor. |
| Avisos actuales de dependencias compatibles | Resolución efectiva Nest→Express 4.22.1→qs 6.14.2, Player Vite 6.4.4 y Workbox→serializer 7.0.3 | Override limitado al padre Nest→Express 4.22.3, Vite ^6.4.5 y override existente serializer 7.1.3; se conservan las mismas versiones mayores. |
| Import de configuración Sentry obsoleto | El export antiguo avisa y delega a la implementación canónica | Admin/Driver importan `@sentry/nextjs/config`; identidad de implementaciones comprobada por CJS/ESM. Sin cambios de DSN, inicialización ni proveedor. |
| Opción PWA ignorada y fuera del control de tipos | `exclude` superior no existe en PluginOptions; el plugin instalado sólo lee `workboxOptions.exclude` | Retira la propiedad ignorada, conservando los defaults efectivos. Añade `next.config.ts` al include de Driver; el tipo pasa sin casts ni supresiones. Plugin real confirma precache, registro manual y reglas GET/POST sin cambios. |

Las regresiones de dependencias reprodujeron fallos reales de los paquetes instalados: TypeError en qs, límites omitidos, cierre de script no escapado, trabajo excesivo en un hijo acotado, mutación de opciones y lectura de un marcador ficticio por Vite con consultas raw. Esto no demuestra explotación de una ruta de TAD en producción. La fixture utiliza sólo temporales propios y loopback.

Fuentes primarias: [Express 4.22.3](https://github.com/expressjs/express/releases/tag/v4.22.3), [qs](https://github.com/ljharb/qs/security/advisories/GHSA-6pq8-jhm2-2vcw), [Vite](https://github.com/vitejs/vite/security/advisories/GHSA-8g5g-mxqh-grgj), [serializer](https://github.com/yahoo/serialize-javascript/security/advisories/GHSA-m5mm-p8h7-m29v), [migración Sentry](https://github.com/getsentry/sentry-javascript/commit/605caaf2aa85f78ed9a180b273a335fe798bf30c).

## Verificación ejecutada

| Alcance | Exit | Resultado | Evidencia |
| --- | ---: | --- | --- |
| Generación de lock e instalación congelada con pnpm 10.34.0 | 0 | Lock cambia sólo las tres resoluciones previstas; +5/-5 paquetes, Prisma generate sin conexión DB | `lock-update.log`, `frozen-install.log` |
| API Jest después de actualizar Express | 0 | 31 suites, 151/151 PASS | `api-tests.log`, `api-tests.json` |
| Los 20 scripts de contratos seguros de CI, ejecutados en serie | 0 | 123/123 PASS, sin omitidos | `contracts-integrated.log` |
| Regresiones nuevas de dependencias y compatibilidad mayor | 0 final | RED: 8 fallos/14; GREEN: 14/14, mismos contratos | `dependency-regressions-red-verified.log`, `dependency-regressions-green.log` |
| Render real del panel y plugin PWA/GenerateSW real | 0 | 4/4 y 1/1 PASS; incluidos en los 123 anteriores | `monitoring-status-after-install-final.log`, `driver-pwa-config-final.log` |
| Tipos completos API, Admin y Driver | 0 | Driver incluye ahora su configuración; no se debilitó strict | `api-types.log`, `admin-types.log`, evidencia `monitoring-sentry-implementation.md` |
| Lint de los tres TS modificados y Prettier | 0 | Cero avisos de lint; formato local con EOL auto por checkout Windows | `monitoring-sentry-implementation.md`, `format-changed.log` |
| Comando raíz de tablet, sin iniciar app | 0 final | RED 1 → GREEN 0, ejecuta Vite 6.4.5 --help | `tablet-command-red.log`, `tablet-command-green.log` |
| Auditoría con umbral alto | 0 | 11 moderadas, 5 bajas, 0 altas/críticas; antes 17/6 | `dependency-audit-final-high.json` |
| Cuatro Dockerfiles canónicos API/Player/Admin/Driver | 0 en los 4 | PASS; imágenes Linux/amd64 inspeccionadas, fuente d4997a33, entre 07:49 y 08:09 UTC | `final-docker-builds-summary.json`, `final-docker-*.log`, `final-docker-artifacts-inspected.log` |
| Navegador público de Driver desde la imagen | 0 | 13/13 PASS; ocho anchos, teclado, movimiento, sin JS y sin inicializar SW/API privada | `driver-image-stdio-d4997a33-20261105T081657308Z/driver-image-smoke.log`, `driver-image-smoke-evidence.json` del mismo directorio |

La revisión independiente del diff no encontró P1/P2 introducidos en el alcance revisado. El test PWA aísla el wrapper Sentry para probar las opciones del plugin real; no acredita transporte Sentry. Los builds reales verifican el wrapper completo. Las pruebas de render usan React/ReactDOMServer, Head y Lucide reales.

El primer acceso al puerto publicado en una red Docker interna no respondió, aunque Next registró su arranque correcto; la prueba de navegador todavía no se había iniciado. Se conservó ese intento. La ejecución final verificó el IID exacto y usó `--pull=never`, `--network=none`, cero puertos publicados y cero montajes. Un puente TCP local por el canal de control de Docker dio acceso al navegador sin abrir conectividad externa en el contenedor. No se presupone el DSN efectivo del SDK a partir de variables públicas que pueden quedar incorporadas al compilar. El navegador también bloqueó solicitudes remotas. Las 16 conexiones del puente terminaron con exit 0; quedaron cero hijos, sockets, contenedores y listeners propios al limpiar. Se revisó una captura móvil de esta ejecución. Esto no acredita sesiones privadas, inscripción real ni pagos.

Los intentos fallidos del harness se conservaron: resolución CJS/ESM de Lucide, fixture webpack incompleta y ruta temporal Windows 8.3. Se corrigió la preparación, no se relajaron aserciones ni se ampliaron timeouts. Se demostró TS2353 contra HEAD antes de retirar la opción PWA ignorada.

## Estado observado y límites

- Probes HTTP públicos sin sesión, a las 07:34 UTC: API `/api/health` 200; Admin raíz 307 a `/login`; Anunciante y Driver raíz 200. No prueban login, permisos, datos ni conectividad DB.
- Railway informa deployment `5227b084` SUCCESS del merge `0910642a`; su configuración corresponde a `Dockerfile.api`, no a todos los portales. No se iniciaron despliegues ni se consultaron valores de variables.
- Los checks del head anterior de #208 no arrancaron por facturación/límite de gasto. La API de checks ligada al PR rechaza consultar el SHA de merge con HTTP 409; el otro conector sólo enumera runs de pull requests. No se infiere CI de main verde ni ausencia de ejecuciones. El estado de la nueva propuesta se registrará en su descripción por SHA.
- Corrección del informe anterior: se vaciaron variables Sentry, pero el servidor Driver tiene un DSN alternativo. Eso no demuestra desactivación del SDK ni ausencia de egreso del servidor. El navegador bloqueaba solicitudes remotas; ese control no se debe presentar como aislamiento del servidor. No se enviaron eventos de prueba deliberadamente ni se cambió la configuración del proveedor.
- Persiste el aviso de Admin por ausencia de instrumentación; añadirla introduciría telemetría nueva y no se hizo para silenciar un aviso. La deprecación del import sí se corrige.
- Los 11 avisos moderados y 5 bajos restantes están documentados. Parte requiere migraciones mayores o carece de parche; en los usos inspeccionados de AJV/UUID/Webpack no se confirmó la condición vulnerable requerida. No es prueba de ausencia en todo camino posible ni certificación de seguridad de producción. No se forzaron majors globales para reducir el contador.
- No hay cambios de esquema, migraciones, datos, saldos, reglas comerciales, OAuth, licencias, proveedores o credenciales. No se ejecutaron E2E autenticados/mutantes, SMTP real ni operaciones reales de almacenamiento.

## Reversión

Antes de fusionar, descartar la propuesta. Después de una fusión autorizada, revertir el commit fuente y su documentación mediante PR, manteniendo manifests/lock/tests juntos. No hay operación de datos que revertir. Cualquier despliegue y su salud requieren el proceso correspondiente.

