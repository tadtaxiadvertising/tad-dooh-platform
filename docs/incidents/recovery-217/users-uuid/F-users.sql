-- #217 DRAFT. ISOLATED RESTORED CLONE ONLY.
-- public.users is an application profile/role registry, not auth.users.
-- No Auth identities, credentials, claims or existing campaign rows are copied.
-- No FK is added to existing campaigns; creator provisioning is a separate step.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $scope$
BEGIN
    IF current_database() <> 'restored'
       OR inet_server_addr() IS NOT NULL
       OR current_setting('tad.recovery_scope', true)
           IS DISTINCT FROM 'isolated-clone-217' THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'isolated_clone_required';
    END IF;
END;
$scope$;

SET LOCAL ROLE postgres;
SET LOCAL search_path = pg_catalog, public;

DO $pre$
BEGIN
    IF to_regclass('public.users') IS NOT NULL THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'users_requires_absent_table';
    END IF;
    IF (SELECT count(*) FROM pg_roles
        WHERE rolname IN ('anon', 'authenticated', 'service_role')) <> 3 THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'application_roles_required';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_attribute a ON a.attrelid = c.oid
        WHERE n.nspname = 'public' AND c.relname = 'campaigns' AND c.relkind = 'r'
          AND c.relowner = 'postgres'::regrole
          AND a.attname = 'created_by' AND a.attnum > 0 AND NOT a.attisdropped
          AND a.atttypid = 'pg_catalog.uuid'::regtype
    ) THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'campaign_creator_uuid_required';
    END IF;
END;
$pre$;

LOCK TABLE public.campaigns IN SHARE ROW EXCLUSIVE MODE;

-- Prisma uuid() generates the UUID in the client; there is no DB ID default.
-- The existing role/password columns describe the current application model.
-- This empty-table expansion does not provision an administrator or login.
CREATE TABLE public.users (
    id UUID NOT NULL,
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX users_email_key ON public.users (email);

ALTER TABLE public.users OWNER TO postgres;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.users
    FROM PUBLIC, anon, authenticated, service_role;

DO $post$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class
        WHERE oid = 'public.users'::regclass AND relkind = 'r'
          AND relowner = 'postgres'::regrole AND relrowsecurity AND relforcerowsecurity
    ) OR EXISTS (
        SELECT 1 FROM pg_policy WHERE polrelid = 'public.users'::regclass
    ) OR EXISTS (
        SELECT 1 FROM pg_class c
        CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) a
        WHERE c.oid = 'public.users'::regclass AND a.grantee <> c.relowner
    ) THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'users_owner_rls_acl_postcondition_failed';
    END IF;
END;
$post$;
COMMIT;
