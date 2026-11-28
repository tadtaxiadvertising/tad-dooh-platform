-- TAD P0 #538: read-only catalog-level postcontainment invariant.
-- Operator must run with a metadata-inspection-only role on the authorized project.
-- PASS is not an HTTP or media-byte integrity attestation.
-- Do not add DDL/DML, security-definer wrappers, secrets or object names.
WITH policy AS (
  SELECT policyname, cmd, roles, permissive, qual, with_check
  FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects'
), state AS (
  SELECT
    (SELECT COUNT(*) FROM policy)::integer AS policy_count,
    (SELECT COUNT(*)
     FROM policy p
     JOIN storage.buckets b
       ON b.public
      AND p.qual = format('(bucket_id = %L::text)', b.id)
     WHERE p.cmd = 'SELECT'
       AND p.roles = ARRAY['public']::name[]
       AND p.permissive = 'PERMISSIVE'
       AND p.with_check IS NULL)::integer AS authorized_public_read_policies,
    (SELECT COUNT(*) FROM policy WHERE cmd <> 'SELECT')::integer AS non_read_policies,
    (SELECT c.relrowsecurity FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'storage' AND c.relname = 'objects') AS rls_enabled,
    (SELECT COUNT(*) FROM storage.objects)::bigint AS storage_object_metadata_count
)
SELECT
  (statement_timestamp() AT TIME ZONE 'UTC')::text AS observed_utc,
  policy_count, authorized_public_read_policies, non_read_policies,
  rls_enabled, storage_object_metadata_count,
  CASE WHEN policy_count = 1
         AND authorized_public_read_policies = 1
         AND non_read_policies = 0
         AND rls_enabled IS TRUE
    THEN 'RLS_METADATA_CONTAINED_HTTP_UNVERIFIED'
    ELSE 'BLOCK_P0_STORAGE_POLICY_DRIFT'
  END AS verdict
FROM state;
