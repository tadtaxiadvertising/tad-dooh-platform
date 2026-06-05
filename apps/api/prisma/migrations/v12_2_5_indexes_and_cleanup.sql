-- TAD Platform v12.2.5 — Performance Indexes & Simulation Cleanup
-- Run against production database after verifying on staging replica.

-- ============================================================
-- INDEX TUNING (Phase 4.2 — Load Test Driven)
-- ============================================================

-- Telemetry table: compound index for driver-timeline queries
-- Used by fleet tracking dashboards and BI snapshots
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_telemetry_driver_time
  ON telemetry (driver_id, "timestamp" DESC);

-- PlaybackEvent deduplication index (supports ON CONFLICT clause)
-- Already declared in Prisma schema, but included here for manual application
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_playback_device_video_time
  ON playback_events (device_id, video_id, date_trunc('minute', "timestamp"));

-- ============================================================
-- SIMULATION CLEANUP (Phase 4.1 — Post-Load-Test)
-- ============================================================

-- Remove simulated playback events
DELETE FROM playback_events WHERE is_simulated = true;

-- Remove telemetry points from simulated drivers
DELETE FROM telemetry WHERE driver_id LIKE 'SIM-%';

-- Remove simulated driver locations
DELETE FROM "DriverLocations" WHERE "isSimulated" = true OR "driverId" LIKE 'SIM-%';

-- Remove simulated devices
DELETE FROM devices WHERE "isSimulated" = true OR device_id LIKE 'SIM-TAB-%';

-- Remove simulated drivers
DELETE FROM drivers WHERE "isSimulated" = true;

-- Reset device status for any devices that were blocked during simulation
UPDATE devices SET status = 'OPERATIVO' WHERE status = 'BLOQUEADO' AND "isSimulated" = true;