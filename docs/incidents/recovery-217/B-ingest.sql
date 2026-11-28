-- #217 DRAFT: B-ingest. ISOLATED RESTORED CLONE ONLY.
-- No startup hook, migration ledger changes, backfill, or production execution.
-- Application grants/policies require a separate reviewed phase.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $scope$ BEGIN IF current_database()<>'restored' OR inet_server_addr() IS NOT NULL OR current_setting('tad.recovery_scope',true) IS DISTINCT FROM 'isolated-clone-217' THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='isolated_clone_required'; END IF; END; $scope$;
SET LOCAL ROLE postgres;
SET LOCAL search_path=pg_catalog,public;
DO $pre$ BEGIN
IF EXISTS (SELECT 1 FROM (VALUES ('playlists'),('active_ads'),('analytics_events'),('campaign_metrics')) t(name) WHERE to_regclass(format('public.%I',t.name)) IS NOT NULL) THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='family_requires_all_tables_absent'; END IF;
IF (SELECT count(*) FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role'))<>3 THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='application_roles_required'; END IF;
IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_roles r ON r.oid=c.relowner JOIN pg_attribute a ON a.attrelid=c.oid WHERE n.nspname='public' AND c.relname='campaigns' AND c.relkind='r' AND r.rolname='postgres' AND a.attname='id' AND a.attnum>0 AND NOT a.attisdropped AND a.attnotnull AND a.atttypid='pg_catalog.uuid'::regtype AND EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid=c.oid AND i.indisunique AND i.indisvalid AND i.indisready AND i.indpred IS NULL AND i.indexprs IS NULL AND i.indnkeyatts=1 AND i.indkey::text=a.attnum::text)) THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='parent_contract_campaigns_id'; END IF;
IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_roles r ON r.oid=c.relowner JOIN pg_attribute a ON a.attrelid=c.oid WHERE n.nspname='public' AND c.relname='devices' AND c.relkind='r' AND r.rolname='postgres' AND a.attname='device_id' AND a.attnum>0 AND NOT a.attisdropped AND a.attnotnull AND a.atttypid='pg_catalog.text'::regtype AND EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid=c.oid AND i.indisunique AND i.indisvalid AND i.indisready AND i.indpred IS NULL AND i.indexprs IS NULL AND i.indnkeyatts=1 AND i.indkey::text=a.attnum::text)) THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='parent_contract_devices_device_id'; END IF;
IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_roles r ON r.oid=c.relowner JOIN pg_attribute a ON a.attrelid=c.oid WHERE n.nspname='public' AND c.relname='devices' AND c.relkind='r' AND r.rolname='postgres' AND a.attname='id' AND a.attnum>0 AND NOT a.attisdropped AND a.attnotnull AND a.atttypid='pg_catalog.uuid'::regtype AND EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid=c.oid AND i.indisunique AND i.indisvalid AND i.indisready AND i.indpred IS NULL AND i.indexprs IS NULL AND i.indnkeyatts=1 AND i.indkey::text=a.attnum::text)) THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='parent_contract_devices_id'; END IF;
IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_roles r ON r.oid=c.relowner JOIN pg_attribute a ON a.attrelid=c.oid WHERE n.nspname='public' AND c.relname='drivers' AND c.relkind='r' AND r.rolname='postgres' AND a.attname='id' AND a.attnum>0 AND NOT a.attisdropped AND a.attnotnull AND a.atttypid='pg_catalog.text'::regtype AND EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid=c.oid AND i.indisunique AND i.indisvalid AND i.indisready AND i.indpred IS NULL AND i.indexprs IS NULL AND i.indnkeyatts=1 AND i.indkey::text=a.attnum::text)) THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='parent_contract_drivers_id'; END IF;
END; $pre$;
LOCK TABLE public."campaigns", public."devices", public."drivers" IN SHARE ROW EXCLUSIVE MODE;
CREATE TABLE public."playlists" (
    "id" TEXT NOT NULL,
    "campaign_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "loopType" TEXT NOT NULL DEFAULT 'SEQUENTIAL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "playlists_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."analytics_events" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "campaign_id" TEXT,
    "media_id" TEXT,
    "event_type" TEXT NOT NULL,
    "event_data" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "is_simulated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."campaign_metrics" (
    "id" BIGSERIAL NOT NULL,
    "campaign_id" UUID NOT NULL,
    "device_id" UUID,
    "date" TIMESTAMP(3) NOT NULL,
    "city" TEXT,
    "total_impressions" INTEGER NOT NULL DEFAULT 0,
    "total_completions" INTEGER NOT NULL DEFAULT 0,
    "total_errors" INTEGER NOT NULL DEFAULT 0,
    "unique_devices" INTEGER NOT NULL DEFAULT 0,
    "avg_completion_rate" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_metrics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."active_ads" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "active_ads_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "analytics_events_device_id_idx" ON public."analytics_events"("device_id");

CREATE INDEX "analytics_events_campaign_id_idx" ON public."analytics_events"("campaign_id");

CREATE INDEX "analytics_events_event_type_idx" ON public."analytics_events"("event_type");

CREATE INDEX "analytics_events_occurred_at_idx" ON public."analytics_events"("occurred_at");

CREATE INDEX "analytics_events_processed_idx" ON public."analytics_events"("processed");

CREATE INDEX "campaign_metrics_campaign_id_idx" ON public."campaign_metrics"("campaign_id");

CREATE INDEX "campaign_metrics_date_idx" ON public."campaign_metrics"("date");

CREATE UNIQUE INDEX "campaign_metrics_campaign_id_date_city_key" ON public."campaign_metrics"("campaign_id", "date", "city");

CREATE UNIQUE INDEX "active_ads_driver_id_campaign_id_key" ON public."active_ads"("driver_id", "campaign_id");

ALTER TABLE public."playlists" ADD CONSTRAINT "playlists_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES public."campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public."analytics_events" ADD CONSTRAINT "analytics_events_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES public."devices"("device_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE public."campaign_metrics" ADD CONSTRAINT "campaign_metrics_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES public."campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public."campaign_metrics" ADD CONSTRAINT "campaign_metrics_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES public."devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public."active_ads" ADD CONSTRAINT "active_ads_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES public."drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE public."playlists" OWNER TO postgres;
ALTER TABLE public."playlists" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."playlists" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."active_ads" OWNER TO postgres;
ALTER TABLE public."active_ads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."active_ads" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."analytics_events" OWNER TO postgres;
ALTER TABLE public."analytics_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."analytics_events" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."campaign_metrics" OWNER TO postgres;
ALTER TABLE public."campaign_metrics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."campaign_metrics" FORCE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public."playlists", public."active_ads", public."analytics_events", public."campaign_metrics" FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL PRIVILEGES ON SEQUENCE public.campaign_metrics_id_seq FROM PUBLIC,anon,authenticated,service_role;
DO $post$ BEGIN
IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.campaign_metrics_id_seq'::regclass AND relkind='S' AND relowner='postgres'::regrole) OR EXISTS(SELECT 1 FROM pg_class c CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl,acldefault('S',c.relowner))) a WHERE c.oid='public.campaign_metrics_id_seq'::regclass AND a.grantee<>c.relowner) THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='sequence_owner_acl_postcondition_failed'; END IF;
IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('playlists','active_ads','analytics_events','campaign_metrics') AND c.relowner='postgres'::regrole AND c.relrowsecurity AND c.relforcerowsecurity)<>4 OR EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) a WHERE n.nspname='public' AND c.relname IN ('playlists','active_ads','analytics_events','campaign_metrics') AND a.grantee<>c.relowner) OR EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('playlists','active_ads','analytics_events','campaign_metrics')) THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='family_owner_rls_acl_postcondition_failed'; END IF;
END; $post$;
COMMIT;
