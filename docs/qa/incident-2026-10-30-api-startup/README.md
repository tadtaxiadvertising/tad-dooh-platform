# Change control — TAD API: recuperación de P3009

## GOAL / PLAN / LOOP / STOP

- **Estado:** VERIFICADO para recuperación de esquema/historial, arranque y servicio de registro. El certificado del dominio público alternativo sigue pendiente por separado.
- **Severidad:** P1, API no disponible y registro de conductores bloqueado.
- **Fecha:** 2026-10-30, diagnóstico desde 03:09 y recuperación verificada a las 03:46 (America/La_Paz).
- **Base del parche:** `680604c44fdcf0681ec4244a82ea90db7f0c75bf`, rama de entrega `feat/tad-ux-conversion-v1`. La comprobación de producción corresponde a la recuperación de la base y al contenedor existente; no certifica una imagen nueva.
- **Permiso ejecutado:** el usuario autorizó explícitamente la recuperación con «Si procede». Se aplicaron las cuatro migraciones autorizadas y se reconcilió su historial mediante Prisma CLI. El código de recuperación se ejecutó desde el checkout local corregido; el contenedor existente reanudó su arranque automáticamente.
- **Alcance:** corregir la migración fallida y las pendientes necesarias para llegar a `20261030_add_driver_auth_user_id`. Conservar datos, índices y permisos existentes.
- **Fuera de alcance:** cambiar el proxy para ocultar el 502, omitir migraciones al arrancar, modificar saldos o usuarios reales, corregir otros avisos históricos del proyecto.

Plan y ejecución:

1. Consultar `_prisma_migrations` y metadatos del esquema, sin leer datos personales.
2. Reproducir los errores SQL en PostgreSQL aislado; corregir solo versiones fallidas/no aplicadas en el proyecto inspeccionado.
3. Verificar reintentos, preservación de datos/índices, deduplicación, RLS y correspondencia Prisma/SQL.
4. Recuperar producción con backup cifrado comprobado, SQL corregido y reconciliación mediante Prisma CLI.
5. **STOP:** aprobación y comprobación de respaldo se cumplieron antes de confirmar DDL. En otra ejecución, si cambia el historial, hay duplicados GPS o la fuente SQL no coincide con la probada, repetir el diagnóstico.

## Causa raíz y evidencia medida

| Hallazgo | Evidencia | Impacto |
| --- | --- | --- |
| `20261012_campaign_notification_dedup` falló | `_prisma_migrations`: inicio `2026-10-30 03:09:13.978094-04:00`, `finished_at` y `rolled_back_at` nulos, SQLSTATE `42601`, error cerca de `BEGIN` dentro del cuerpo de una función delimitada con el mismo `$$` del bloque externo | Prisma devuelve P3009 y el entrypoint termina antes de iniciar Node |
| El proxy recibe 502 | GET público `https://proyecto-ia-tad-api.rewvid.easypanel.host/health`: HTTP 502, HTML, con validación TLS habilitada | Next.js puede arrancar, pero no tiene una API saludable detrás |
| Falta `drivers.auth_user_id` | Consulta de `information_schema.columns`: columna ausente; Prisma `Driver` la incluye y el registro hace `driver.findUnique()` sin limitar campos | Incompatibilidad suficiente para que falle la consulta de registro. No se capturó la excepción original del POST histórico para atribuirle de forma exclusiva aquel 500 |
| Tres migraciones adicionales pendientes | No aparecen como finalizadas `20261012_rate_limit_windows`, `20261012_telemetry_gps_burst_fix`, `20261030_add_driver_auth_user_id` | Resolver solo la primera migración no completa la recuperación |
| SQL GPS inválido | Prueba aislada: SQLSTATE `42601` cerca de `DESC`; la versión original también intentaba una expresión dentro de `UNIQUE (...)` | La siguiente etapa de despliegue volvería a detenerse |
| Modelo de notificaciones desalineado | Prueba del cliente Prisma generado: `NotificationQueue.entityId` no correspondía a `entity_id` | Las consultas de la cola fallarían aun después de crear sus tablas |

En el snapshot de producción no existían `notification_queue`, `campaign_expirations` ni `rate_limit_windows`. Había **cero grupos GPS duplicados por conductor/segundo**. Los índices `telemetry_driver_id_timestamp_key` e `idx_telemetry_driver_time` sí existían. Estos hechos deben comprobarse otra vez inmediatamente antes de recuperar producción.

Se consultaron los asesores de seguridad de Supabase: no señalaron las tablas afectadas. Existían avisos de otros objetos, que no se modificaron ni se consideran resueltos por este cambio.

## Corrección local e invariantes

- Notificaciones: separar los delimitadores de función/bloques, hacer repetibles las restricciones y el trigger, usar el esquema `public` y activar RLS para las tablas internas, sin políticas públicas de escritura.
- Rate limiting: activar RLS en la tabla interna pendiente de creación.
- GPS: crear índices de expresión válidos con `IF NOT EXISTS`. Mantener tanto los puntos existentes como la restricción e índice anteriores. Si hay duplicados por segundo, fallar sin borrarlos; no introducir limpieza automática.
- Prisma: mapear campos y nombres físicos de restricciones/índices de notificaciones; declarar UUID para sus IDs. Mantener el contrato de `ON CONFLICT` de telemetría.
- Conductores: conservar sin cambios la migración existente que añade `auth_user_id` nullable y su índice único; la secuencia corregida permite alcanzarla.
- No se editó el handler de registro, el contrato de tokens, el proxy, el entrypoint ni el comportamiento de pagos/offline.

Estas modificaciones de archivos históricos se limitan a versiones fallidas o pendientes en el proyecto inspeccionado. No se asume el mismo estado en otros entornos: contrastar su historial antes de distribuir allí el parche.

## Verificación por commit y capa

Entorno local Windows, Node.js y Prisma CLI/Client **5.22.0**; SQL aislado con **PGlite 0.5.13 / PostgreSQL 18.6**. Producción usa PostgreSQL 17.6: no se afirma equivalencia completa de servidor, PostGIS, permisos de conexión o rendimiento.

| Comando / prueba | Capa | Exit code | Resultado / alcance |
| --- | --- | ---: | --- |
| `node --test apps/api/scripts/verify-startup-migrations.test.cjs` antes del parche | Regresión SQL | 1 | RED: 0/7; errores reales cerca de `BEGIN` y `DESC` |
| Mismo comando tras corregir SQL, antes de mapear Prisma | Integración de esquema | 1 | 6/7; detectó `NotificationQueue.entityId` sin columna SQL |
| Mismo comando con SQL y cliente generado corregidos | Regresión SQL / permisos / datos | 0 | GREEN: 7/7; reintentos, trigger, las cuatro migraciones, índices previos, deduplicación, fallo sin borrado ante duplicados, RLS y campos mapeados |
| `pnpm --filter api exec prisma validate --schema=prisma/schema.prisma` | Prisma | 0 | Esquema válido; URL sintética, sin conexión a producción |
| `pnpm --filter api exec prisma generate --schema=prisma/schema.prisma` | Cliente generado | 0 | Cliente 5.22.0 generado |
| `pnpm --filter api test --runInBand --runTestsByPath src/modules/auth/auth.service.login.spec.ts src/modules/prisma/prisma.service.spec.ts` | Unitarios API | 0 | 2 suites, 8/8 pruebas |
| `pnpm --filter api exec tsc --noEmit --incremental false` | Tipado API | 0 | PASS |
| `pnpm --filter api build` | Build API | 0 | PASS |
| `git diff --check` | Revisión de cambios | 0 | PASS |
| Restauración del respaldo cifrado | Recuperación | 0 | PASS: 14 conductores y 15 registros Prisma restaurados en PGlite, con datos e índices coincidentes |
| Cuatro SQL en transacción PostgreSQL 17.6 seguida de `ROLLBACK` | Producción / preflight | — | PASS de cada SQL y su reversión; el comando compuesto terminó en 1 por una expectativa incorrecta sobre la salida posterior de `migrate status`, documentada abajo |
| Aplicación transaccional del SQL ya probado y comprobación antes de `COMMIT` | Producción / esquema | 0 | PASS: datos existentes intactos, columna nullable, índices y tres tablas con RLS |
| Cuatro `prisma migrate resolve --applied` tras verificar los efectos SQL | Producción / historial | 0 | PASS, migración fallida reconciliada al final para mantener el bloqueo durante la recuperación |
| `prisma migrate status` posterior | Producción / historial | 0 | `Database schema is up to date!` |
| `prisma migrate deploy` posterior | Producción / entrypoint | 0 | `No pending migrations to apply.` |
| GET API `/health` y `/api/health`, TLS verificado | Producción / HTTP | 0 | HTTP 200 |
| GET Driver `/api/proxy/health/full`, TLS verificado | Producción / proxy + DB | 0 | HTTP 200, `db.connected=true` |
| POST Driver `/api/proxy/auth/driver/register` con `{}` | Producción / validación | 0 | HTTP 400 esperado, sin crear cuenta; el proxy llega al backend interno |
| `AuthService.registerDriver` con Prisma real dentro de transacción revertida | Producción / registro | 0 | PASS: registro correcto, contraseña hasheada, duplicado 409, rollback completo y cero cuentas de prueba persistentes |

El caso GPS usa una tabla sintética con las columnas afectadas; no simula almacenamiento PostGIS ni la flota completa. Los tests de AuthService usan dependencias aisladas y no crean cuentas reales.

Además de esos tests locales, la comprobación posterior del servicio de registro usó el `AuthService` compilado y la base real dentro de una transacción revertida. Se revisó antes el único trigger de `drivers`: el registro de prueba, sin referido, no entra en la actualización de saldos. Tras el rollback seguían los 14 conductores originales y coincidía la huella de todos sus campos. No se realizó un POST válido que dejara una cuenta nueva en producción.

Incidencias del procedimiento, sin ocultar fallos: la conexión `pg` inicial sin CA terminó en `SELF_SIGNED_CERT_IN_CHAIN`; dos URLs de descarga de certificado devolvieron 404 y se obtuvo la CA del bucket público publicado de Supabase, verificando su SHA-256 `807025ad50d4ed219d2c9c7d299c004f824eb00cf7f65afef607d07b72e6cafa`. Las dos configuraciones locales antiguas devolvieron `28P01`; la credencial de producción facilitada por el usuario funcionó con verificación estricta de CA y hostname. Las configuraciones locales no se sobrescribieron.

El primer intento de restauración aislada falló por tratar el resultado PostgreSQL `name[]` como un array JavaScript; se corrigió el parseo de ese metadato y se restauró el mismo respaldo correctamente. El preflight de Prisma devolvió exit 1 y enumeró las tres migraciones todavía no iniciadas, sin repetir el nombre de la fallida: la expectativa del helper era incorrecta. El estado fallido se confirmó por SQL; no se alteró el producto para cambiar aquella salida de diagnóstico.

### Reproducir la prueba SQL sin cambiar dependencias del monorepo

Instalar la dependencia de verificación fuera del repositorio. En PowerShell, desde la raíz:

```powershell
$taskSandbox = Join-Path ([IO.Path]::GetTempPath()) 'tad-startup-migration-verification-20261030'
npm install --prefix $taskSandbox --no-audit --no-fund --ignore-scripts --save-exact @electric-sql/pglite@0.5.13
$env:NODE_PATH = Join-Path $taskSandbox 'node_modules'
node --test apps/api/scripts/verify-startup-migrations.test.cjs
```

Regenerar primero el cliente Prisma cuando cambie `schema.prisma`. La prueba no lee `DATABASE_URL` ni se conecta a servicios externos.

## Recuperación de producción ejecutada

**Ya ejecutada; no repetir contra el estado actual.** Fuente: checkout local corregido y Prisma CLI 5.22.0. La secuencia inicial de `--rolled-back` y reintento se sustituyó por completar/verificar SQL y después `--applied`, para que los contenedores en reinicio no ejecutaran de nuevo los archivos antiguos al liberar el bloqueo.

1. Reconfirmar la única migración fallida, tres migraciones sin iniciar, 14 conductores y telemetría vacía. Guardar respaldo cifrado y comprobar su restauración aislada antes de confirmar cambios.
2. Probar los cuatro archivos SQL corregidos en PostgreSQL 17.6 dentro de una transacción y revertirla. Confirmar que el esquema original y el registro fallido seguían presentes después del rollback.
3. Aplicar las cuatro migraciones en una única transacción, con `lock_timeout=5s` y `statement_timeout=30s`. Antes de confirmar, verificar huellas de datos, columna nullable, índices anteriores y nuevos, trigger y RLS. Confirmar únicamente al pasar todas las comprobaciones.
4. Mantener el intento fallido activo hasta reconciliar las otras tres migraciones. Registrar con Prisma CLI, en este orden, **solo después de verificar sus efectos SQL**:

```text
prisma migrate resolve --applied 20261012_rate_limit_windows
prisma migrate resolve --applied 20261012_telemetry_gps_burst_fix
prisma migrate resolve --applied 20261030_add_driver_auth_user_id
prisma migrate resolve --applied 20261012_campaign_notification_dedup
prisma migrate status
prisma migrate deploy
```

Cada comando usó `--schema=./prisma/schema.prisma`, la conexión de sesión en el entorno del proceso y TLS estricto con la CA de Supabase. Se compararon los checksums registrados con los archivos ejecutados. Prisma conservó el intento fallido como revertido y registró la aplicación correcta: **18 aplicadas, 0 fallidas activas, 1 intento histórico revertido**. No se editó `_prisma_migrations` mediante SQL manual.

Este es el procedimiento de completar y resolver descrito en [Prisma: recuperación de migraciones fallidas en producción](https://www.prisma.io/docs/orm/prisma-migrate/workflows/patching-and-hotfixing). `--applied` registra los efectos que ya se ejecutaron; no reemplaza su aplicación ni su verificación.

5. Comprobar HTTP 200 en la API y en el proxy Driver con la base conectada. La API existente se recuperó mediante sus reinicios normales, sin omitir controles de migración.
6. Verificar el servicio de registro y el rechazo de duplicados en una transacción revertida. Confirmar cero cuentas de prueba persistentes y datos originales idénticos.

### Respaldo y alcance de la restauración

- Archivo privado: `C:/Users/Arismendy/.codex/backups/tad-api-startup-20261030/before-recovery-2026-10-30T07-37-11-554Z.dpapi`.
- Cifrado: Windows DPAPI `CurrentUser`; el archivo requiere el perfil Windows del usuario para descifrarse. Fuera del repositorio.
- Integridad del archivo cifrado: SHA-256 `e4ae6f16b5d73a12e958b7ff72df9b62e53be4540b905429cafef07a5de1dd9e`.
- Datos restaurados y comparados en aislamiento: 14 conductores y 15 registros del historial previo, con sus definiciones de columnas, enum, restricciones e índices. Se compararon huellas del JSON PostgreSQL sin convertir valores numéricos a números JavaScript.
- Telemetría: cero filas; definiciones capturadas, sin restauración completa de PostGIS. Este respaldo acotado no equivale a un backup/PITR completo de todo Supabase.
- El contexto temporal con la credencial usada durante la recuperación se elimina al terminar; el respaldo de datos permanece cifrado.

El asesor posterior de Supabase solo añadió avisos informativos de RLS sin políticas para las tres tablas internas, cuya denegación a claves públicas es intencional. Referencia: [RLS enabled, no policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

## Reversión por capa y riesgos residuales

- **Código:** revertir solo este parche tras revisar el diff. Los tres archivos de configuración/documentación ya modificados al empezar el incidente se preservaron. No tocar `.worktrees/main1`, que ya tenía cambios ajenos.
- **Base de datos:** estrategia de avance correctivo. Conservar las tablas nuevas, `auth_user_id` y datos que se creen después; un revert de Git no elimina ni revierte SQL. El parche GPS conserva los índices originales, y la prueba verifica preservación de filas incluso cuando el índice nuevo no puede crearse.
- **Historial:** usar Prisma CLI y conservar los registros de intentos. No falsificar una finalización para arrancar la API.
- **Seguridad:** no cambiar secretos, permisos de acceso de usuarios, pagos ni políticas de otras tablas. RLS de las tablas nuevas limita las operaciones a los roles privilegiados del backend.
- **Dependencias externas:** la recuperación de base de datos y el arranque quedaron verificados. El parche fuente se conserva en la rama de entrega para usar los SQL y el modelo corregidos en próximos builds; no se verificó una imagen nueva reconstruida con esos archivos. `tad.api.ibusiness.com.do` sigue presentando un certificado inválido; la API por EasyPanel y el proxy Driver sí pasaron TLS y HTTP 200.

**Estado final:** VERIFICADO para el incidente de arranque P3009/502 y el servicio de registro. El POST válido no se dejó persistir por HTTP; se probó el servicio real en transacción revertida. El dominio/certificado alternativo y la distribución del parche fuente son seguimientos separados.
