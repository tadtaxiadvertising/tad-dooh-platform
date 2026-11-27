-- Catalog aggregates only; no customer rows, function bodies or persistent writes.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '5s';
WITH application_tables AS (
  SELECT c.oid, c.relrowsecurity, c.relforcerowsecurity,
         EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid) AS has_policy
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
    AND NOT EXISTS (
      SELECT 1 FROM pg_depend d
      WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype = 'e'
    )
)
SELECT count(*)::int AS application_tables,
  count(*) FILTER (WHERE relrowsecurity)::int AS rls_enabled,
  count(*) FILTER (WHERE relforcerowsecurity)::int AS rls_forced,
  count(*) FILTER (WHERE relrowsecurity AND NOT has_policy)::int AS rls_without_policy,
  count(*) FILTER (WHERE NOT relrowsecurity AND (
    has_table_privilege('anon', oid, 'SELECT,INSERT,UPDATE,DELETE') OR
    has_table_privilege('authenticated', oid, 'SELECT,INSERT,UPDATE,DELETE')
  ))::int AS grants_without_rls,
  count(*) FILTER (WHERE relrowsecurity AND NOT has_policy AND
    has_table_privilege('anon', oid, 'SELECT,INSERT,UPDATE,DELETE'))::int AS no_policy_with_anon_grants,
  count(*) FILTER (WHERE relrowsecurity AND NOT has_policy AND
    has_table_privilege('authenticated', oid, 'SELECT,INSERT,UPDATE,DELETE'))::int AS no_policy_with_authenticated_grants
FROM application_tables;
COMMIT;
