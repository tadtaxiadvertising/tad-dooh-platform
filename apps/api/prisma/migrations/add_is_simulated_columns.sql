-- =============================================================
-- MIGRATION: Add is_simulated columns to simulation-aware tables
-- Created: 2026-04-14
-- Reason: TAD Simulator shadow testing feature requires these
--         columns to isolate simulated data from production data.
--         Prisma schema was updated but DB migration was not applied,
--         causing a FATAL startup crash (PrismaClientKnownRequestError P2022).
-- =============================================================

-- 1. drivers table
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. devices table
ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. analytics_events table
ALTER TABLE analytics_events
  ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN NOT NULL DEFAULT FALSE;

-- 4. playback_events table
ALTER TABLE playback_events
  ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN NOT NULL DEFAULT FALSE;

-- 5. subscriptions table
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN NOT NULL DEFAULT FALSE;

-- 6. driver_locations table
ALTER TABLE driver_locations
  ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN NOT NULL DEFAULT FALSE;

-- Add indexes for efficient filtering of simulated vs production data
CREATE INDEX IF NOT EXISTS idx_drivers_is_simulated ON drivers(is_simulated);
CREATE INDEX IF NOT EXISTS idx_devices_is_simulated ON devices(is_simulated);
CREATE INDEX IF NOT EXISTS idx_analytics_events_is_simulated ON analytics_events(is_simulated);
CREATE INDEX IF NOT EXISTS idx_playback_events_is_simulated ON playback_events(is_simulated);
CREATE INDEX IF NOT EXISTS idx_subscriptions_is_simulated ON subscriptions(is_simulated);
CREATE INDEX IF NOT EXISTS idx_driver_locations_is_simulated ON driver_locations(is_simulated);
