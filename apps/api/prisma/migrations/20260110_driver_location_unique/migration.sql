-- =============================================================================
-- TAD Platform v12.1.3 — DriverLocation UNIQUE Constraint (B3 PATCH)
-- =============================================================================
-- PROPÓSITO
--   Frenar el crecimiento ilimitado de filas duplicadas en `driver_locations`.
--   Antes de este fix:
--     - `fleet.service.ts:ingestTelemetryBatch()` hacía
--       `prisma.driverLocation.createMany({ skipDuplicates: true })`.
--     - `skipDuplicates` REQUIERE un UNIQUE constraint para funcionar; el schema
--       tenía solo índices no-únicos, por lo que el flag era un NO-OP silencioso.
--     - Cada batch del Mobile Gateway creaba duplicados de la misma coordenada,
--       inflando la BD y contribuyendo al OOM del backend (512MB en EasyPanel).
--
-- ESTRATEGIA SEGURA
--   1. Dedupe PRIMERO: conserva la fila más antigua (menor id) por
--      (device_id, timestamp). Es importante que esto ocurra en su propia tx para
--      no perder consistencia si la creación del UNIQUE falla.
--   2. Crear UNIQUE CONSTRAINT solo después del dedupe.
--   3. El índice (device_id, timestamp) y (driver_id, timestamp) que ya existían
--      se mantienen sin cambios.
--
-- APLICACIÓN
--   Ejecutar manualmente tras desplegar: `node dist/scripts/migrate.js` o desde
--   el panel de EasyPanel en una ventana de bajo tráfico.
-- =============================================================================

BEGIN;

-- 1) DEDUPE
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY device_id, "timestamp"
      ORDER BY id ASC
    ) AS rn
  FROM driver_locations
)
DELETE FROM driver_locations
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2) UNIQUE CONSTRAINT (idempotente).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'driver_locations_device_timestamp_unique'
  ) THEN
    ALTER TABLE driver_locations
      ADD CONSTRAINT driver_locations_device_timestamp_unique
      UNIQUE (device_id, "timestamp");
  END IF;
END $$;

COMMIT;

-- =============================================================================
-- POST-MIGRACIÓN (código)
-- =============================================================================
-- `apps/api/src/modules/fleet/fleet.service.ts:ingestTelemetryBatch` ahora
-- usa `prisma.driverLocation.createMany({ data, skipDuplicates: true })` que,
-- gracias a este UNIQUE, descarta duplicados (deviceId, timestamp) de forma
-- segura a nivel DB. Ver changeset B3 PATCH.
