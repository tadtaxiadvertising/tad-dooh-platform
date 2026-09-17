-- GIN Indexes for JSONB columns (Query Performance Optimization)
-- PostgreSQL GIN indexes enable efficient querying of JSONB fields
-- 
-- Usage examples after migration:
--   SELECT * FROM drivers WHERE identidad_vehicular @> '{"marca": "Toyota"}';
--   SELECT * FROM campaign WHERE target_cities @> '["Santo Domingo"]';
--   SELECT * FROM devices WHERE config @> '{"version": "2.0"}';

-- 1. Driver.identidad_vehicular (JSONB) - Vehicle identity data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_drivers_identidad_vehicular_gin
ON drivers USING GIN (identidad_vehicular jsonb_path_ops);

-- 2. Driver.hardware_config (JSONB) - Tablet/device hardware configuration
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_drivers_hardware_config_gin
ON drivers USING GIN (hardware_config jsonb_path_ops);

-- 3. Driver.bank_account (JSONB) - Legacy bank info (deprecated, kept for compat)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_drivers_bank_account_gin
ON drivers USING GIN (bank_account jsonb_path_ops);

-- 4. Campaign.target_cities (String but stores JSON array) - Target cities for campaigns
-- Note: target_cities is String with default '[]', not JsonB. Keeping as-is for now.

-- 5. Campaign.target_fleets (String but stores JSON array) - Target fleets
-- Note: target_fleets is String with default '[]', not JsonB. Keeping as-is.

-- 6. Campaign.schedule_days (String but stores JSON array) - Scheduling days
-- Note: schedule_days is String with default '[]', not JsonB. Keeping as-is.

-- 7. Campaign.schedule_hours (String but stores JSON array) - Scheduling hours
-- Note: schedule_hours is String with default '[]', not JsonB. Keeping as-is.

-- 8. Advertiser.products_data (String but stores JSON array) - Products catalog
-- Note: products_data is String with default '[]', not JsonB. Keeping as-is.

-- 9. CampaignIntent.file_metadata (JSONB) - File metadata for campaign intents
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_intents_file_metadata_gin
ON campaign_intents USING GIN (file_metadata jsonb_path_ops);

-- 10. Wallet.bank_info (JSONB) - Bank information in Wallet model
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallets_bank_info_gin
ON wallets USING GIN (bank_info jsonb_path_ops);

-- 11. Device.config (JSONB) - Device configuration (if added in future)
-- Note: Device model doesn't have config column yet. Add when needed.

-- Additional useful indexes for common query patterns:
-- Composite index for driver lookups by status + onboarding (already added in schema)
-- @@index([status, onboardingStatus])

-- Partial index for online devices only (frequent query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_devices_online_active
ON devices (id) WHERE status = 'OPERATIVO' AND is_online = true;

-- Partial index for pending subscriptions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_pending
ON subscriptions (driver_id) WHERE status = 'PENDING';

-- Partial index for active campaigns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_active
ON campaigns (id) WHERE active = true AND status = 'ACTIVE';

-- Verification queries (run after migration):
-- SELECT indexname, indexdef FROM pg_indexes WHERE indexname LIKE '%gin%' OR indexname LIKE '%_active' OR indexname LIKE '%_pending';