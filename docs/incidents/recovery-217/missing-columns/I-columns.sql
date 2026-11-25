-- #217 DRAFT, unverified. Owned restored clone only, never production.
-- Empty tables required: no historical legal/payment/simulation inference.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $scope$ BEGIN
  IF current_database()<>'restored' OR inet_server_addr() IS NOT NULL
    OR current_setting('tad.recovery_scope',true) IS DISTINCT FROM 'isolated-clone-217' THEN
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='isolated_clone_required';
  END IF;
END $scope$;
SET LOCAL ROLE postgres;
SET LOCAL search_path=pg_catalog,public;
LOCK TABLE public.campaign_expirations,public.devices,public.driver_locations,
  public.drivers,public.subscriptions IN ACCESS EXCLUSIVE MODE;
DO $pre$
DECLARE item RECORD; populated BOOLEAN;
BEGIN
  FOR item IN SELECT unnest(ARRAY['campaign_expirations','devices','driver_locations','drivers','subscriptions']) AS table_name LOOP
    IF NOT EXISTS(SELECT 1 FROM pg_class t JOIN pg_namespace n ON n.oid=t.relnamespace
      WHERE n.nspname='public' AND t.relname=item.table_name
      AND t.relkind='r' AND t.relowner='postgres'::regrole) THEN
      RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='expected_empty_table_owner_required';
    END IF;
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I)',item.table_name) INTO populated;
    IF populated THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='empty_scalar_tables_required'; END IF;
  END LOOP;
  IF EXISTS(SELECT 1 FROM (VALUES
    ('campaign_expirations','advertiser_id'),('campaign_expirations','notification_sent'),
    ('campaign_expirations','notified_at'),('campaign_expirations','remaining_days'),('campaign_expirations','scheduled_for'),
    ('devices','is_simulated'),('driver_locations','is_simulated'),('driver_locations','speed'),
    ('drivers','agreement_version'),('drivers','bank_account'),('drivers','cedula'),('drivers','consecutive_months_under_goal'),
    ('drivers','contract_accepted'),('drivers','contract_accepted_at'),('drivers','hardware_config'),('drivers','identidad_vehicular'),
    ('drivers','insurance_accepted'),('drivers','insurance_accepted_at'),('drivers','is_simulated'),('drivers','level'),
    ('drivers','onboarding_status'),('drivers','password'),('drivers','referral_code'),('drivers','referred_by'),
    ('drivers','subscription_end'),('drivers','subscription_paid'),('drivers','taxi_plate'),
    ('subscriptions','device_id'),('subscriptions','is_simulated'),('subscriptions','paid_at'),('subscriptions','valid_until')
  ) AS expected(table_name,column_name) JOIN information_schema.columns c USING(table_name,column_name)
    WHERE c.table_schema='public') THEN
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='scalar_columns_require_absence';
  END IF;
END $pre$;
ALTER TABLE public.campaign_expirations
  ADD COLUMN advertiser_id TEXT NOT NULL,
  ADD COLUMN notification_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN notified_at TIMESTAMP(3),
  ADD COLUMN remaining_days INTEGER NOT NULL,
  ADD COLUMN scheduled_for TIMESTAMP(3) NOT NULL;
ALTER TABLE public.devices ADD COLUMN is_simulated BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.driver_locations
  ADD COLUMN is_simulated BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN speed DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE public.drivers
  ADD COLUMN agreement_version TEXT,
  ADD COLUMN bank_account JSONB,
  ADD COLUMN cedula TEXT,
  ADD COLUMN consecutive_months_under_goal INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN contract_accepted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN contract_accepted_at TIMESTAMP(3),
  ADD COLUMN hardware_config JSONB,
  ADD COLUMN identidad_vehicular JSONB,
  ADD COLUMN insurance_accepted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN insurance_accepted_at TIMESTAMP(3),
  ADD COLUMN is_simulated BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN level TEXT NOT NULL DEFAULT 'BASE',
  ADD COLUMN onboarding_status TEXT NOT NULL DEFAULT 'PENDING_AGREEMENT',
  ADD COLUMN password TEXT,
  ADD COLUMN referral_code TEXT,
  ADD COLUMN referred_by TEXT,
  ADD COLUMN subscription_end TIMESTAMP(3),
  ADD COLUMN subscription_paid BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN taxi_plate TEXT;
ALTER TABLE public.subscriptions
  ADD COLUMN device_id TEXT,
  ADD COLUMN is_simulated BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN paid_at TIMESTAMP(3),
  ADD COLUMN valid_until TIMESTAMP(3) NOT NULL;
CREATE UNIQUE INDEX drivers_cedula_217_key ON public.drivers(cedula);
CREATE UNIQUE INDEX drivers_taxi_plate_217_key ON public.drivers(taxi_plate);
CREATE UNIQUE INDEX drivers_referral_code_217_key ON public.drivers(referral_code);
CREATE INDEX drivers_referred_by_217_idx ON public.drivers(referred_by);
CREATE INDEX drivers_status_onboarding_217_idx ON public.drivers(status_enum_217,onboarding_status);
CREATE INDEX subscriptions_device_217_idx ON public.subscriptions(device_id);
CREATE INDEX campaign_expirations_remaining_217_idx ON public.campaign_expirations(remaining_days);
CREATE INDEX campaign_expirations_scheduled_217_idx ON public.campaign_expirations(scheduled_for);
-- No defaults are invented for required advertiser/expiry/scheduling fields.
-- referral_code's uuid() is generated by Prisma, not a server default.
-- FK/delete policies and tenant permissions remain separate release gates.
COMMIT;
