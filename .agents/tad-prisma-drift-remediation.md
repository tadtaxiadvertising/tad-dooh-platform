<!-- title: Prisma schema-drift - diagnosis & remediation status -->
# Tad DOOH platform — prisma-drift remediation (hand-off / status)

## 0) Situation
API startup preflight ("Prisma schema parity check") is failing. The drift gate
(`apps/api/scripts/check-prisma-drift.cjs`) compares `apps/api/prisma/schema.prisma`
(52 models) with the live DB and exits **1** when drift is detected, so the API
refuses to start.

## 1) Diagnosis (evidence, read-only)
Drift run:
- `expectedModels: 52`  /  `modelsPresent: 29`  → `missingTableCount: 23`
  (active_ads, advertiser_subscriptions, analytics_events, bi_dashboard_snapshots,
  campaign_metrics, commission_ledger, commissions, contract_acceptances,
  conversation_messages, conversations, conversion_events, fleets, leads,
  payment_evidence, payment_intents, payment_verifications, playlists,
  portal_requests, qr_scans, reconciliation_reports, referral_attributions,
  settlement_batches, users)
- `missingColumnCount: 31` (campaign_expirations.* , devices.is_simulated,
  driver_locations.*, drivers.*, subscriptions.*)
- `idTypeMismatchCount: 14` (uuid vs text on id columns)
- `relationTypeMismatchCount: 6`
- `gpsSqlContractIssueCount: 2` (telemetry.coords missing; postgis extension missing)

## 2) Root cause
Schema `schema.prisma` (52 models) is the source of truth; the live DB is 29/52
models. `public._prisma_migrations` is corrupted (rows with error logs from failed
executions). `prisma migrate deploy` therefore stops and does **not** converge the
schema. Startup drift preflight then correctly reports the drift and refuses to
start. No application bug: the code path, gate logic, and schema are all sound.

## 3) Quality-gate verification (this repo)
- Drift regression harness: **4/4 passing** (`pnpm --filter api run test`"prisma:drift:test").
- `prisma validate`: valid.
- `prisma generate`: succeeds.
- Migration directory reconciles against the 52-model schema.

## 4) Remediation (production DDL — not executable from this sandbox)
Correct root cause, not a symptom:
1. verify backup/restore + point-in-time recovery, record recovery owner, archive
   SHA/hosts only (never credentials).
2. Repair `public._prisma_migrations` failed rows so `prisma migrate deploy`
   resumes (never `migrate reset`, `db push`, or `migrate resolve --applied`).
3. Deploy the API image; its entrypoint runs `prisma migrate deploy`.
4. Verify zero drift: `node scripts/check-prisma-drift.cjs` (exit 0).
5. Open a separate expand/migrate/contract remediation for the remaining 30 models
   + uuid/text key mismatches + telemetry coords + postgis + failed-migration
   history (tracking issue #217). Do NOT touch ledger/wallet/payout/campaign data.

## 5) Bottom line
- Drift gate is correct; it correctly blocked startup.
- Root cause is schema-vs-DB drift due to failed migration history.
- Gate, schema and migration logic are verified green; applying the pending
  migration to the target DB is the remaining remediation step.
# Prisma drift — estado de remediación del #217

Este documento sustituye el diagnóstico preliminar local. No autoriza DDL ni despliegues.

El respaldo cifrado y su restauración aislada fueron verificados. En el snapshot auditado, las 23 migraciones registradas estaban finalizadas y sus checksums coincidían; los mensajes históricos de error no demostraban corrupción del ledger. No editar ni borrar _prisma_migrations, reescribir migraciones históricas ni repetir migraciones para intentar corregir el arranque.

El código candidato conserva las protecciones recientes de main y valida el schema del cliente generado, los tipos nativos, el contrato GPS/PostGIS y los tipos escalares. Media.mimeType utiliza la columna existente mime_type y conserva el alias de respuesta. Los cambios de IDs y mappings ya incorporados a main deben medirse con un cliente recién generado; no reutilizar como diagnóstico actual los recuentos anteriores de 23 tablas, 33 columnas, 14 IDs y seis relaciones.

El PR #542 está fusionado en main (954e361f3463c7b4ee080267f94fc736447b921a). Sus 18 checks y 99 suites/873 pruebas de API pasaron. Los logs aportados después de esa publicación contienen el SHA-256 f288f4ec832effeec7144ae69300c1ae0ccdd48d150f89250adeded2ce0f05e1: coincide con el schema de esa revisión usando finales de línea LF. La diferencia con la huella CRLF local no demuestra una imagen antigua.

El 25-nov-2026 a las 15:48 UTC, consultas de catálogo con destino verificado confirmaron 33 tablas públicas, 346 columnas y ausencia de PostGIS. La opción de conexión solicitaba default_transaction_read_only=on, pero una comprobación posterior observó el modo efectivo en off; esas consultas ejecutaron únicamente SELECT. La medición se repitió dentro de BEGIN READ ONLY, verificando transaction_read_only=on antes del catálogo. El comparador encontró 23 tablas ausentes, 31 columnas ausentes, cinco diferencias de ID, seis relaciones incompatibles y dos problemas GPS/PostGIS. La API pública respondió 502.

El PR #544 alinea en Prisma las cinco PK existentes UUID (Advertiser, Campaign, Device, Invoice y Media) y trece referencias relacionadas. Es un cambio del contrato del cliente, sin DDL, casts, backfill ni conversión de datos. La comparación del candidato con el catálogo medido en READ ONLY reduce las diferencias de ID de cinco a cero y no introduce diferencias escalares. Prisma 5.22 validate/generate, TypeScript de API y 59 contratos pasaron con un cliente generado aislado. La rama incorpora main 3f0f956a y su parche de uuid antes de repetir el CI.

Device.id ahora refleja su UUID físico; DeviceCommand.deviceId y CampaignMetric.deviceId usan ese contrato. Device.deviceId, DeviceCampaign.device_id y PlaylistItem.deviceId conservan TEXT: el código acepta UUID interno e identificador de hardware, con protección de colisiones. Prisma 5.22 valida esta distinción sin exigir convertir el identificador de asignación. Las seis relaciones físicas incompatibles siguen reportándose y requieren una transición explícita que preserve la sincronización offline. Las 23 tablas, 31 columnas y dos dependencias GPS/PostGIS siguen sin corregirse en producción; este cambio de Prisma por sí solo no permite el arranque.

El lector de catálogo del arranque ahora usa una transacción RepeatableRead, establece READ ONLY explícitamente y verifica el modo efectivo antes de consultar tablas, columnas y extensiones. Si la verificación o una consulta falla, el error se propaga y no se devuelve un catálogo parcial. El mismo lector pasó contra PostgreSQL mediante un cliente real Prisma 5.22, sin escrituras persistentes ni lectura de filas de aplicación. La inspección de arranque sigue rechazando las diferencias restantes y conserva la pausa antes del reinicio.

Continuar por familias: resolver identidad de dispositivo/driver, preparar expansiones aditivas verificadas para las tablas ausentes, acordar los valores históricos de onboarding/legal/simulación y reparar el contrato GPS/PostGIS. Conservar filas, saldos e historial de migraciones. Cada etapa debe medirse con su propio cliente generado y el catálogo identificado; no declarar paridad completa a partir de una prueba parcial de IDs.

Para cerrar el incidente hacen falta el error real de arranque, la imagen/SHA efectivos y configuración de EasyPanel. La API pública seguía en 502 en la última comprobación. Los comentarios históricos sobre TAD_EXPECTED_SUPABASE_PROJECT_REF no prueban el valor efectivo actual.

Toda expansión de esquema requiere restauración comprobada, contratos de identidad y permisos, comprobaciones de datos originales y reversión. No desplegar cambios de esquema como sustituto de ese análisis. Los controles de seguridad y de publicación pendientes deben revisarse antes del despliegue.
