-- #217 DRAFT: D-finance. ISOLATED RESTORED CLONE ONLY.
-- No startup hook, migration ledger changes, backfill, or production execution.
-- Application grants/policies require a separate reviewed phase.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $scope$ BEGIN IF current_database()<>'restored' OR inet_server_addr() IS NOT NULL OR current_setting('tad.recovery_scope',true) IS DISTINCT FROM 'isolated-clone-217' THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='isolated_clone_required'; END IF; END; $scope$;
SET LOCAL ROLE postgres;
SET LOCAL search_path=pg_catalog,public;
DO $pre$ BEGIN
IF EXISTS (SELECT 1 FROM (VALUES ('advertiser_subscriptions'),('settlement_batches'),('commissions'),('commission_ledger'),('payment_intents'),('payment_evidence'),('payment_verifications'),('reconciliation_reports')) t(name) WHERE to_regclass(format('public.%I',t.name)) IS NOT NULL) THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='family_requires_all_tables_absent'; END IF;
IF (SELECT count(*) FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role'))<>3 THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='application_roles_required'; END IF;
IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_roles r ON r.oid=c.relowner JOIN pg_attribute a ON a.attrelid=c.oid WHERE n.nspname='public' AND c.relname='drivers' AND c.relkind='r' AND r.rolname='postgres' AND a.attname='id' AND a.attnum>0 AND NOT a.attisdropped AND a.attnotnull AND a.atttypid='pg_catalog.text'::regtype AND EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid=c.oid AND i.indisunique AND i.indisvalid AND i.indisready AND i.indpred IS NULL AND i.indexprs IS NULL AND i.indnkeyatts=1 AND i.indkey::text=a.attnum::text)) THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='parent_contract_drivers_id'; END IF;
IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_roles r ON r.oid=c.relowner JOIN pg_attribute a ON a.attrelid=c.oid WHERE n.nspname='public' AND c.relname='advertisers' AND c.relkind='r' AND r.rolname='postgres' AND a.attname='id' AND a.attnum>0 AND NOT a.attisdropped AND a.attnotnull AND a.atttypid='pg_catalog.uuid'::regtype AND EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid=c.oid AND i.indisunique AND i.indisvalid AND i.indisready AND i.indpred IS NULL AND i.indexprs IS NULL AND i.indnkeyatts=1 AND i.indkey::text=a.attnum::text)) THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='parent_contract_advertisers_id'; END IF;
IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_roles r ON r.oid=c.relowner JOIN pg_attribute a ON a.attrelid=c.oid WHERE n.nspname='public' AND c.relname='leads' AND c.relkind='r' AND r.rolname='postgres' AND a.attname='id' AND a.attnum>0 AND NOT a.attisdropped AND a.attnotnull AND a.atttypid='pg_catalog.text'::regtype AND EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid=c.oid AND i.indisunique AND i.indisvalid AND i.indisready AND i.indpred IS NULL AND i.indexprs IS NULL AND i.indnkeyatts=1 AND i.indkey::text=a.attnum::text)) THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='parent_contract_leads_id'; END IF;
END; $pre$;
LOCK TABLE public."advertisers", public."drivers", public."leads" IN SHARE ROW EXCLUSIVE MODE;
CREATE TABLE public."reconciliation_reports" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "device_id" TEXT,
    "subscription_status" TEXT NOT NULL,
    "subscription_due_date" TIMESTAMP(3),
    "subscription_amount" DOUBLE PRECISION NOT NULL,
    "total_playbacks" INTEGER NOT NULL,
    "active_campaigns" INTEGER NOT NULL,
    "revenue_contracted" DOUBLE PRECISION NOT NULL,
    "revenue_received" DOUBLE PRECISION NOT NULL,
    "payroll_due" DOUBLE PRECISION NOT NULL,
    "payroll_paid" DOUBLE PRECISION NOT NULL,
    "has_discrepancy" BOOLEAN NOT NULL DEFAULT false,
    "discrepancy_type" TEXT NOT NULL DEFAULT 'OK',
    "discrepancy_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reconciliation_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."advertiser_subscriptions" (
    "id" TEXT NOT NULL,
    "advertiser_id" UUID NOT NULL,
    "number_of_screens" INTEGER NOT NULL,
    "monthly_rate" DOUBLE PRECISION NOT NULL DEFAULT 1500.0,
    "tax_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.18,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "next_billing_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advertiser_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."commissions" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 500.0,
    "source_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "paid_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "revoked_by" TEXT,
    "revocation_reason" TEXT,
    "reference" TEXT NOT NULL,
    "metadata" JSONB,
    "settlement_batch_id" TEXT,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."settlement_batches" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "gross_total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "net_total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "withholdings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "referents_count" INTEGER NOT NULL DEFAULT 0,
    "commissions_count" INTEGER NOT NULL DEFAULT 0,
    "referents" JSONB,
    "commissions" JSONB,
    "generated_by" TEXT NOT NULL,
    "approved_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "paid_at" TIMESTAMP(3),
    "paid_by" TEXT,
    "payment_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlement_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."payment_intents" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'DOP',
    "provider" TEXT,
    "reference" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "provider_ref" TEXT,
    "provider_data" JSONB,
    "lead_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "payment_intents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."payment_evidence" (
    "id" TEXT NOT NULL,
    "payment_intent_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_hash" TEXT,
    "file_size" BIGINT,
    "mime_type" TEXT,
    "submitted_by" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "review_note" TEXT,
    "metadata" JSONB,

    CONSTRAINT "payment_evidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."payment_verifications" (
    "id" TEXT NOT NULL,
    "payment_intent_id" TEXT NOT NULL,
    "verified_by" TEXT NOT NULL,
    "verified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "amount_confirmed" DOUBLE PRECISION,
    "note" TEXT,
    "metadata" JSONB,

    CONSTRAINT "payment_verifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."commission_ledger" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "commission_id" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "source_type" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "period" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "commission_ledger_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reconciliation_reports_period_idx" ON public."reconciliation_reports"("period");

CREATE INDEX "reconciliation_reports_driver_id_idx" ON public."reconciliation_reports"("driver_id");

CREATE UNIQUE INDEX "reconciliation_reports_period_driver_id_key" ON public."reconciliation_reports"("period", "driver_id");

CREATE INDEX "advertiser_subscriptions_advertiser_id_idx" ON public."advertiser_subscriptions"("advertiser_id");

CREATE INDEX "advertiser_subscriptions_status_idx" ON public."advertiser_subscriptions"("status");

CREATE UNIQUE INDEX "commissions_reference_key" ON public."commissions"("reference");

CREATE INDEX "commissions_driver_id_idx" ON public."commissions"("driver_id");

CREATE INDEX "commissions_status_idx" ON public."commissions"("status");

CREATE INDEX "commissions_source_type_idx" ON public."commissions"("source_type");

CREATE INDEX "commissions_settlement_batch_id_idx" ON public."commissions"("settlement_batch_id");

CREATE UNIQUE INDEX "settlement_batches_period_key" ON public."settlement_batches"("period");

CREATE INDEX "settlement_batches_status_idx" ON public."settlement_batches"("status");

CREATE UNIQUE INDEX "payment_intents_reference_key" ON public."payment_intents"("reference");

CREATE UNIQUE INDEX "payment_intents_idempotency_key_key" ON public."payment_intents"("idempotency_key");

CREATE INDEX "payment_intents_status_idx" ON public."payment_intents"("status");

CREATE INDEX "payment_intents_lead_id_idx" ON public."payment_intents"("lead_id");

CREATE INDEX "payment_intents_reference_idx" ON public."payment_intents"("reference");

CREATE UNIQUE INDEX "payment_evidence_payment_intent_id_key" ON public."payment_evidence"("payment_intent_id");

CREATE INDEX "payment_evidence_review_status_idx" ON public."payment_evidence"("review_status");

CREATE UNIQUE INDEX "payment_verifications_payment_intent_id_key" ON public."payment_verifications"("payment_intent_id");

CREATE INDEX "commission_ledger_driver_id_idx" ON public."commission_ledger"("driver_id");

CREATE INDEX "commission_ledger_period_idx" ON public."commission_ledger"("period");

CREATE INDEX "commission_ledger_status_idx" ON public."commission_ledger"("status");

CREATE UNIQUE INDEX "CommissionLedger_driver_id_period_reference_key" ON public."commission_ledger"("driver_id", "period", "reference");

ALTER TABLE public."reconciliation_reports" ADD CONSTRAINT "reconciliation_reports_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES public."drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public."advertiser_subscriptions" ADD CONSTRAINT "advertiser_subscriptions_advertiser_id_fkey" FOREIGN KEY ("advertiser_id") REFERENCES public."advertisers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public."commissions" ADD CONSTRAINT "commissions_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES public."drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE public."commissions" ADD CONSTRAINT "commissions_settlement_batch_id_fkey" FOREIGN KEY ("settlement_batch_id") REFERENCES public."settlement_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public."payment_intents" ADD CONSTRAINT "payment_intents_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES public."leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public."payment_evidence" ADD CONSTRAINT "payment_evidence_payment_intent_id_fkey" FOREIGN KEY ("payment_intent_id") REFERENCES public."payment_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE public."payment_verifications" ADD CONSTRAINT "payment_verifications_payment_intent_id_fkey" FOREIGN KEY ("payment_intent_id") REFERENCES public."payment_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE public."advertiser_subscriptions" OWNER TO postgres;
ALTER TABLE public."advertiser_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."advertiser_subscriptions" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."settlement_batches" OWNER TO postgres;
ALTER TABLE public."settlement_batches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."settlement_batches" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."commissions" OWNER TO postgres;
ALTER TABLE public."commissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."commissions" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."commission_ledger" OWNER TO postgres;
ALTER TABLE public."commission_ledger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."commission_ledger" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."payment_intents" OWNER TO postgres;
ALTER TABLE public."payment_intents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."payment_intents" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."payment_evidence" OWNER TO postgres;
ALTER TABLE public."payment_evidence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."payment_evidence" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."payment_verifications" OWNER TO postgres;
ALTER TABLE public."payment_verifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."payment_verifications" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."reconciliation_reports" OWNER TO postgres;
ALTER TABLE public."reconciliation_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."reconciliation_reports" FORCE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public."advertiser_subscriptions", public."settlement_batches", public."commissions", public."commission_ledger", public."payment_intents", public."payment_evidence", public."payment_verifications", public."reconciliation_reports" FROM PUBLIC,anon,authenticated,service_role;
DO $post$ BEGIN
IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('advertiser_subscriptions','settlement_batches','commissions','commission_ledger','payment_intents','payment_evidence','payment_verifications','reconciliation_reports') AND c.relowner='postgres'::regrole AND c.relrowsecurity AND c.relforcerowsecurity)<>8 OR EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) a WHERE n.nspname='public' AND c.relname IN ('advertiser_subscriptions','settlement_batches','commissions','commission_ledger','payment_intents','payment_evidence','payment_verifications','reconciliation_reports') AND a.grantee<>c.relowner) OR EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('advertiser_subscriptions','settlement_batches','commissions','commission_ledger','payment_intents','payment_evidence','payment_verifications','reconciliation_reports')) THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='family_owner_rls_acl_postcondition_failed'; END IF;
END; $post$;
COMMIT;
