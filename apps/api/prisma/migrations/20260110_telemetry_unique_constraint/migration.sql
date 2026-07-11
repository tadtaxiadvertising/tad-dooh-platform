-- =============================================================================
-- TAD Platform v12.1.3 — Telemetry UNIQUE Constraint (B7 PATCH)
-- =============================================================================
-- PROPÓSITO
--   Habilitar que `apps/api/src/modules/telemetry/telemetry.service.ts:sync()`
--   ejecute `INSERT ... ON CONFLICT (driver_id, timestamp) DO NOTHING` sin que
--   Postgres rechace el batch por falta de unique constraint.
--
--   Sin este UNIQUE, los lotes de telemetría del Mobile Gateway FALLABAN
--   silenciosamente (el servicio captura el error y solo loguea), acumulando
--   pérdida de datos GPS en la BD de producción.
--
-- SEGURIDAD OPERACIONAL
--   1. Dedupe PRIMERO: elimina duplicados de la BD existente usando
--      `ROW_NUMBER() OVER (PARTITION BY driver_id, timestamp ORDER BY id)`
--      conservando solo la primera ocurrencia (id menor = más antigua).
--   2. Crear UNIQUE INDEX solo DESPUÉS del dedupe.
--   3. CREATE INDEX CONCURRENTLY se ejecuta FUERA de la transacción
--      (Postgres rechaza CONCURRENTLY dentro de BEGIN/COMMIT).
--
-- APLICACIÓN
--   Esta migración se ejecuta manualmente vía `apps/api/scripts/migrate.ts` o
--   desde EasyPanel Secrets script durante deployments.
--
-- REVERSA
--   ALTER TABLE telemetry DROP CONSTRAINT IF EXISTS telemetry_driver_timestamp_unique;
--   DROP INDEX CONCURRENTLY IF EXISTS idx_telemetry_driver_time;
-- =============================================================================

-- 1) DEDUPE + UNIQUE CONSTRAINT en una sola transacción (atómico).
BEGIN;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY driver_id, "timestamp"
      ORDER BY id ASC
    ) AS rn
  FROM telemetry
)
DELETE FROM telemetry
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'telemetry_driver_timestamp_unique'
  ) THEN
    ALTER TABLE telemetry
      ADD CONSTRAINT telemetry_driver_timestamp_unique
      UNIQUE (driver_id, "timestamp");
  END IF;
END $$;

COMMIT;

-- 2) Índice de apoyo para queries dashboard (FUERA de la tx por CONCURRENTLY).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_telemetry_driver_time
  ON telemetry (driver_id, "timestamp" DESC);
