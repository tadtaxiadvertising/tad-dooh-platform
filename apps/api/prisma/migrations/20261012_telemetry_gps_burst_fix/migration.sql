-- GPS deduplication used by TelemetryService.sync(): one point per driver/second.
-- This migration has not been applied in the inspected production database.
-- PostgreSQL accepts expressions in UNIQUE INDEX, not in UNIQUE constraints.
-- Preserve existing points, the full-timestamp unique constraint and legacy index.
-- If existing points collide within a second, CREATE UNIQUE INDEX fails safely;
-- reconciliation then requires a separate decision rather than deleting points.

CREATE UNIQUE INDEX IF NOT EXISTS telemetry_driver_timestamp_sec_unique
  ON public.telemetry (driver_id, (date_trunc('second', timestamp)));

-- DESC belongs to the index expression, not inside the date_trunc() arguments.
CREATE INDEX IF NOT EXISTS idx_telemetry_driver_time_sec
  ON public.telemetry (driver_id, (date_trunc('second', timestamp)) DESC);
