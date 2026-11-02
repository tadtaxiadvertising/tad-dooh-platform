-- Create driver_locations table structure
-- Based on Prisma schema model DriverLocation
CREATE TABLE IF NOT EXISTS driver_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL,
    device_id UUID NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    battery_level INTEGER,
    signal_strength INTEGER,
    temperature INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id ON driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_device_id ON driver_locations(device_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_timestamp ON driver_locations(timestamp);
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_timestamp ON driver_locations(driver_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_driver_locations_device_timestamp ON driver_locations(device_id, timestamp);

-- Add UNIQUE constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'driver_locations_device_timestamp_unique'
    ) THEN
        ALTER TABLE driver_locations 
        ADD CONSTRAINT driver_locations_device_timestamp_unique 
        UNIQUE (device_id, timestamp);
    END IF;
END $$;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'driver_locations_updated_at'
    ) THEN
        CREATE TRIGGER driver_locations_updated_at
            BEFORE UPDATE ON driver_locations
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Enable RLS if not already enabled
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;

-- Create policies for driverLocations
DO $$
BEGIN
    -- Policy for inserting driver locations
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy 
        WHERE policyname = 'driver_locations_insert'
    ) THEN
        CREATE POLICY driver_locations_insert 
            ON driver_locations 
            FOR INSERT 
            TO authenticated 
            WITH CHECK (true);
    END IF;
    
    -- Policy for selecting driver locations
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy 
        WHERE policyname = 'driver_locations_select'
    ) THEN
        CREATE POLICY driver_locations_select 
            ON driver_locations 
            FOR SELECT 
            TO authenticated 
            USING (true);
    END IF;
END $$;

-- Add comment
COMMENT ON TABLE driver_locations IS 'Driver location telemetry data';
COMMENT ON COLUMN driver_locations.id IS 'Primary key';
COMMENT ON COLUMN driver_locations.driver_id IS 'Foreign key to drivers';
COMMENT ON COLUMN driver_locations.device_id IS 'Device identifier';
COMMENT ON COLUMN driver_locations.latitude IS 'Latitude coordinate';
COMMENT ON COLUMN driver_locations.longitude IS 'Longitude coordinate';
COMMENT ON COLUMN driver_locations.timestamp IS 'Timestamp of location';
COMMENT ON COLUMN driver_locations.battery_level IS 'Battery level percentage';
COMMENT ON COLUMN driver_locations.signal_strength IS 'Signal strength in dBm';
COMMENT ON COLUMN driver_locations.temperature IS 'Temperature in Celsius';
COMMENT ON COLUMN driver_locations.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN driver_locations.updated_at IS 'Record update timestamp';

-- Insert sample data for tracking if table is empty
INSERT INTO driver_locations (driver_id, device_id, latitude, longitude, timestamp, battery_level, signal_strength, temperature)
SELECT 
    d.id,
    'local-test-device-' || g.gen,
    40.4128 + (g.gen % 100) * 0.01,
    -3.7038 + (g.gen % 100) * 0.01,
    NOW() - (g.gen || ' hours')::INTERVAL,
    90 - (g.gen % 50),
    -70 + (g.gen % 40),
    25 - (g.gen % 10)
FROM generate_series(1, 10) AS g(gen)
CROSS JOIN drivers d
WHERE d.id IS NOT NULL
ON CONFLICT DO NOTHING;
