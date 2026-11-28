-- #217 DRAFT: C-crm. ISOLATED RESTORED CLONE ONLY.
-- No startup hook, migration ledger changes, backfill, or production execution.
-- Application grants/policies require a separate reviewed phase.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $scope$ BEGIN IF current_database()<>'restored' OR inet_server_addr() IS NOT NULL OR current_setting('tad.recovery_scope',true) IS DISTINCT FROM 'isolated-clone-217' THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='isolated_clone_required'; END IF; END; $scope$;
SET LOCAL ROLE postgres;
SET LOCAL search_path=pg_catalog,public;
DO $pre$ BEGIN
IF EXISTS (SELECT 1 FROM (VALUES ('leads'),('qr_scans'),('conversations'),('conversation_messages'),('referral_attributions'),('conversion_events')) t(name) WHERE to_regclass(format('public.%I',t.name)) IS NOT NULL) THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='family_requires_all_tables_absent'; END IF;
IF (SELECT count(*) FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role'))<>3 THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='application_roles_required'; END IF;

END; $pre$;
CREATE TABLE public."qr_scans" (
    "id" TEXT NOT NULL,
    "qr_code" TEXT NOT NULL,
    "referrer_code" TEXT,
    "scanned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "device_id" TEXT,
    "driver_id" TEXT,
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "lead_id" TEXT,

    CONSTRAINT "qr_scans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."conversations" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "contact_phone" TEXT,
    "contact_name" TEXT,
    "lead_id" TEXT,
    "driver_id" TEXT,
    "advertiser_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "stage" TEXT NOT NULL DEFAULT 'INITIAL',
    "consent_given" BOOLEAN NOT NULL DEFAULT false,
    "consent_at" TIMESTAMP(3),
    "assigned_to" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."conversation_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "message_type" TEXT NOT NULL DEFAULT 'TEXT',
    "meta_message_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."leads" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT,
    "referrer_code" TEXT,
    "referrer_id" TEXT,
    "contact_name" TEXT,
    "contact_phone" TEXT,
    "contact_email" TEXT,
    "city" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."referral_attributions" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "referrer_id" TEXT NOT NULL,
    "referrer_code" TEXT NOT NULL,
    "first_contact_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conversion_at" TIMESTAMP(3),
    "conversion_type" TEXT,
    "commission_created" BOOLEAN NOT NULL DEFAULT false,
    "commission_id" TEXT,
    "metadata" JSONB,

    CONSTRAINT "referral_attributions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."conversion_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "referrer_id" TEXT,
    "referrer_code" TEXT,
    "amount" DOUBLE PRECISION,
    "commission_amount" DOUBLE PRECISION,
    "idempotency_key" TEXT NOT NULL,
    "confirmed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "conversion_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "qr_scans_qr_code_idx" ON public."qr_scans"("qr_code");

CREATE INDEX "qr_scans_referrer_code_idx" ON public."qr_scans"("referrer_code");

CREATE INDEX "qr_scans_scanned_at_idx" ON public."qr_scans"("scanned_at");

CREATE INDEX "qr_scans_driver_id_idx" ON public."qr_scans"("driver_id");

CREATE INDEX "qr_scans_lead_id_idx" ON public."qr_scans"("lead_id");

CREATE UNIQUE INDEX "conversations_thread_id_key" ON public."conversations"("thread_id");

CREATE INDEX "conversations_thread_id_idx" ON public."conversations"("thread_id");

CREATE INDEX "conversations_lead_id_idx" ON public."conversations"("lead_id");

CREATE INDEX "conversations_driver_id_idx" ON public."conversations"("driver_id");

CREATE INDEX "conversations_advertiser_id_idx" ON public."conversations"("advertiser_id");

CREATE INDEX "conversations_status_idx" ON public."conversations"("status");

CREATE INDEX "conversations_stage_idx" ON public."conversations"("stage");

CREATE INDEX "conversation_messages_conversation_id_idx" ON public."conversation_messages"("conversation_id");

CREATE INDEX "conversation_messages_created_at_idx" ON public."conversation_messages"("created_at");

CREATE INDEX "leads_referrer_code_idx" ON public."leads"("referrer_code");

CREATE INDEX "leads_status_idx" ON public."leads"("status");

CREATE INDEX "leads_type_idx" ON public."leads"("type");

CREATE UNIQUE INDEX "referral_attributions_lead_id_key" ON public."referral_attributions"("lead_id");

CREATE INDEX "referral_attributions_referrer_id_idx" ON public."referral_attributions"("referrer_id");

CREATE INDEX "referral_attributions_conversion_type_idx" ON public."referral_attributions"("conversion_type");

CREATE UNIQUE INDEX "conversion_events_idempotency_key_key" ON public."conversion_events"("idempotency_key");

CREATE INDEX "conversion_events_referrer_id_idx" ON public."conversion_events"("referrer_id");

CREATE INDEX "conversion_events_type_idx" ON public."conversion_events"("type");

CREATE INDEX "conversion_events_entity_id_idx" ON public."conversion_events"("entity_id");

ALTER TABLE public."conversation_messages" ADD CONSTRAINT "conversation_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES public."conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public."referral_attributions" ADD CONSTRAINT "referral_attributions_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES public."leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE public."leads" OWNER TO postgres;
ALTER TABLE public."leads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."leads" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."qr_scans" OWNER TO postgres;
ALTER TABLE public."qr_scans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."qr_scans" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."conversations" OWNER TO postgres;
ALTER TABLE public."conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."conversations" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."conversation_messages" OWNER TO postgres;
ALTER TABLE public."conversation_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."conversation_messages" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."referral_attributions" OWNER TO postgres;
ALTER TABLE public."referral_attributions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."referral_attributions" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."conversion_events" OWNER TO postgres;
ALTER TABLE public."conversion_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."conversion_events" FORCE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public."leads", public."qr_scans", public."conversations", public."conversation_messages", public."referral_attributions", public."conversion_events" FROM PUBLIC,anon,authenticated,service_role;
DO $post$ BEGIN
IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('leads','qr_scans','conversations','conversation_messages','referral_attributions','conversion_events') AND c.relowner='postgres'::regrole AND c.relrowsecurity AND c.relforcerowsecurity)<>6 OR EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) a WHERE n.nspname='public' AND c.relname IN ('leads','qr_scans','conversations','conversation_messages','referral_attributions','conversion_events') AND a.grantee<>c.relowner) OR EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('leads','qr_scans','conversations','conversation_messages','referral_attributions','conversion_events')) THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='family_owner_rls_acl_postcondition_failed'; END IF;
END; $post$;
COMMIT;
