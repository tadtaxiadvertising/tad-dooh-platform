-- #217 DRAFT: E-bi. ISOLATED RESTORED CLONE ONLY.
-- No startup hook, migration ledger changes, backfill, or production execution.
-- Application grants/policies require a separate reviewed phase.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $scope$ BEGIN IF current_database()<>'restored' OR inet_server_addr() IS NOT NULL OR current_setting('tad.recovery_scope',true) IS DISTINCT FROM 'isolated-clone-217' THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='isolated_clone_required'; END IF; END; $scope$;
SET LOCAL ROLE postgres;
SET LOCAL search_path=pg_catalog,public;
DO $pre$ BEGIN
IF EXISTS (SELECT 1 FROM (VALUES ('bi_dashboard_snapshots')) t(name) WHERE to_regclass(format('public.%I',t.name)) IS NOT NULL) THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='family_requires_all_tables_absent'; END IF;
IF (SELECT count(*) FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role'))<>3 THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='application_roles_required'; END IF;

END; $pre$;
CREATE TABLE public."bi_dashboard_snapshots" (
    "id" TEXT NOT NULL,
    "snapshot_date" TIMESTAMP(3) NOT NULL,
    "mrr" DOUBLE PRECISION NOT NULL,
    "total_devices" INTEGER NOT NULL,
    "online_devices" INTEGER NOT NULL,
    "offline_devices" INTEGER NOT NULL,
    "critical_devices" INTEGER NOT NULL,
    "active_campaigns" INTEGER NOT NULL,
    "total_impressions_mtd" INTEGER NOT NULL,
    "delivery_rate_avg" DOUBLE PRECISION NOT NULL,
    "sync_health_rate" DOUBLE PRECISION NOT NULL,
    "yield_per_screen" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "arpu" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "churn_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "projected_revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bi_dashboard_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bi_dashboard_snapshots_snapshot_date_key" ON public."bi_dashboard_snapshots"("snapshot_date");
ALTER TABLE public."bi_dashboard_snapshots" OWNER TO postgres;
ALTER TABLE public."bi_dashboard_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."bi_dashboard_snapshots" FORCE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public."bi_dashboard_snapshots" FROM PUBLIC,anon,authenticated,service_role;
DO $post$ BEGIN
IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('bi_dashboard_snapshots') AND c.relowner='postgres'::regrole AND c.relrowsecurity AND c.relforcerowsecurity)<>1 OR EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) a WHERE n.nspname='public' AND c.relname IN ('bi_dashboard_snapshots') AND a.grantee<>c.relowner) OR EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('bi_dashboard_snapshots')) THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='family_owner_rls_acl_postcondition_failed'; END IF;
END; $post$;
COMMIT;
