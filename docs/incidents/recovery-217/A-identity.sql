-- #217 DRAFT: A-identity. ISOLATED RESTORED CLONE ONLY.
-- No startup hook, migration ledger changes, backfill, or production execution.
-- Application grants/policies require a separate reviewed phase.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $scope$ BEGIN IF current_database()<>'restored' OR inet_server_addr() IS NOT NULL OR current_setting('tad.recovery_scope',true) IS DISTINCT FROM 'isolated-clone-217' THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='isolated_clone_required'; END IF; END; $scope$;
SET LOCAL ROLE postgres;
SET LOCAL search_path=pg_catalog,public;
DO $pre$ BEGIN
IF EXISTS (SELECT 1 FROM (VALUES ('fleets'),('portal_requests'),('contract_acceptances')) t(name) WHERE to_regclass(format('public.%I',t.name)) IS NOT NULL) THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='family_requires_all_tables_absent'; END IF;
IF (SELECT count(*) FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role'))<>3 THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='application_roles_required'; END IF;
IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_roles r ON r.oid=c.relowner JOIN pg_attribute a ON a.attrelid=c.oid WHERE n.nspname='public' AND c.relname='advertisers' AND c.relkind='r' AND r.rolname='postgres' AND a.attname='id' AND a.attnum>0 AND NOT a.attisdropped AND a.attnotnull AND a.atttypid='pg_catalog.uuid'::regtype AND EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid=c.oid AND i.indisunique AND i.indisvalid AND i.indisready AND i.indpred IS NULL AND i.indexprs IS NULL AND i.indnkeyatts=1 AND i.indkey::text=a.attnum::text)) THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='parent_contract_advertisers_id'; END IF;
IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_roles r ON r.oid=c.relowner JOIN pg_attribute a ON a.attrelid=c.oid WHERE n.nspname='public' AND c.relname='drivers' AND c.relkind='r' AND r.rolname='postgres' AND a.attname='id' AND a.attnum>0 AND NOT a.attisdropped AND a.attnotnull AND a.atttypid='pg_catalog.text'::regtype AND EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid=c.oid AND i.indisunique AND i.indisvalid AND i.indisready AND i.indpred IS NULL AND i.indexprs IS NULL AND i.indnkeyatts=1 AND i.indkey::text=a.attnum::text)) THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='parent_contract_drivers_id'; END IF;
END; $pre$;
LOCK TABLE public."advertisers", public."drivers" IN SHARE ROW EXCLUSIVE MODE;
CREATE TABLE public."fleets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fleets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."portal_requests" (
    "id" TEXT NOT NULL,
    "advertiser_id" UUID,
    "driver_id" TEXT,
    "campaign_id" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "data" TEXT DEFAULT '{}',
    "admin_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portal_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."contract_acceptances" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_acceptances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fleets_name_key" ON public."fleets"("name");

CREATE INDEX "portal_requests_advertiser_id_idx" ON public."portal_requests"("advertiser_id");

CREATE INDEX "portal_requests_driver_id_idx" ON public."portal_requests"("driver_id");

CREATE INDEX "portal_requests_status_idx" ON public."portal_requests"("status");

CREATE INDEX "portal_requests_type_idx" ON public."portal_requests"("type");

CREATE INDEX "contract_acceptances_driver_id_idx" ON public."contract_acceptances"("driver_id");

ALTER TABLE public."portal_requests" ADD CONSTRAINT "portal_requests_advertiser_id_fkey" FOREIGN KEY ("advertiser_id") REFERENCES public."advertisers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public."portal_requests" ADD CONSTRAINT "portal_requests_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES public."drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public."contract_acceptances" ADD CONSTRAINT "contract_acceptances_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES public."drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE public."fleets" OWNER TO postgres;
ALTER TABLE public."fleets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."fleets" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."portal_requests" OWNER TO postgres;
ALTER TABLE public."portal_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."portal_requests" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."contract_acceptances" OWNER TO postgres;
ALTER TABLE public."contract_acceptances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."contract_acceptances" FORCE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public."fleets", public."portal_requests", public."contract_acceptances" FROM PUBLIC,anon,authenticated,service_role;
DO $post$ BEGIN
IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('fleets','portal_requests','contract_acceptances') AND c.relowner='postgres'::regrole AND c.relrowsecurity AND c.relforcerowsecurity )<>3 OR EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) a WHERE n.nspname='public' AND c.relname IN ('fleets','portal_requests','contract_acceptances') AND a.grantee<>c.relowner) OR EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('fleets','portal_requests','contract_acceptances')) THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='family_owner_rls_acl_postcondition_failed'; END IF;
END; $post$;
COMMIT;
