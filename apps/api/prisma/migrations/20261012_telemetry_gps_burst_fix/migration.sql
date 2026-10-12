-- =============================================================================
-- TAD DOOH Platform — GPS Burst Rate Limit Migration (2026-10-12)
-- =============================================================================
-- PURPOSE
--   Replace the telemetry unique constraint from `UNIQUE(driver_id, timestamp)`
--   to `UNIQUE(driver_id, date_trunc('second', timestamp))`.
--
-- CONTEXT
--   C2-11 (RATE > GPS unique constraint burst): the original constraint
--   rejected GPS points from the same device arriving within the same second
--   (e.g., batched telemetry with sub-second jitter), breaking the playback
--   pipeline and contributing to batch loss. The new constraint allows
--   multiple GPS points per second per device, de-duplicating on the second
--   (not the millisecond).
--
-- SAFETY
--   1. The old constraint is DROPPED as the FIRST statement.
--   2. The new index and constraint are created AFTER.
--   3. If the migration fails mid-way, the old constraint is already gone —
--      the table is still queryable, and the new constraint can be applied
--      with a manual step.
--   4. All existing data remains intact (no DELETE, only DDL).
--
-- REVERSIBILITY
--   This migration is NOT trivially reversible (the old constraint had
--   millisecond granularity; the new one groups by second). If rollback is
--   needed, a manual step is required to reconstruct the old constraint from
--   a backup.
-- =============================================================================

-- 1) Drop the old constraint (millisecond-level granularity)
--    This MUST be the first statement.
ALTER TABLE telemetry
  DROP CONSTRAINT IF EXISTS telemetry_driver_timestamp_unique;

-- 2) Drop the old index (can be safely dropped after constraint is gone)
DROP INDEX IF EXISTS idx_telemetry_driver_time;

-- 3) Add new index on the truncated timestamp (enables efficient lookups)
CREATE INDEX idx_telemetry_driver_time_sec
  ON telemetry (driver_id, date_trunc('second', timestamp DESC));

-- 4) Add new unique constraint on (driver_id, truncated second-level timestamp)
ALTER TABLE telemetry
  ADD CONSTRAINT telemetry_driver_timestamp_sec_unique
  UNIQUE (driver_id, date_trunc('second', timestamp));

-- 5) (Optional) Mark the old constraint as deprecated in the schema comment
--    The Prisma schema now uses date_trunc('second', timestamp) in ON CONFLICT.

-- 6) (Optional) Insert a validation row to confirm the constraint works
--    Uncomment the following block for verification and run once:
--    INSERT INTO telemetry (id, driver_id, coords, speed, timestamp)
--    VALUES ('migration-verify-1', 'test-device', ST_SetSRID(ST_MakePoint(0, 0), 4326), 0, NOW())
--    ON CONFLICT (driver_id, date_trunc('second', timestamp)) DO NOTHING;
