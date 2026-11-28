-- TAD P0 #217 — READ-ONLY RESTORE BASELINE (source and approved isolated clone)
-- No DDL/DML, dynamic SQL, personal records, tokens, URLs or backup contents.
-- Run ONLY with an approved metadata/aggregate-inspection role against the
-- correct authorized target. Permission errors must NOT be 'fixed' by giving
-- anon/authenticated broader access.
--
-- Run once against the source around a coordinated backup checkpoint and
-- again after the restore in the isolated, side-effect-disabled clone.
-- Only compare numbers from a justified point-in-time snapshot: the default
-- three separate role/schema/data dump commands do not themselves prove a
-- single consistent snapshot if concurrent writes continue. Coordinate
-- quiescence or a provider-supported consistent snapshot method with the owner.
-- Storage object metadata is NOT a binary-object backup. Compare actual
-- Storage object bytes/checksums via an independent, secured export.
-- Never paste logs, rows, backup files or credentials into tickets.
--
-- This is an INITIAL diagnostic only. Matching counts do NOT prove restore
-- completeness or functional correctness; still inspect schema, constraints,
-- RLS/grants, Auth and media bytes, and rehearse application-level recovery.
SELECT
  (SELECT COUNT(*)
   FROM information_schema.tables
   WHERE table_schema = 'public' AND table_type = 'BASE TABLE')
   AS public_tables,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = 'public') AS public_columns,
  (SELECT COUNT(*) FROM public._prisma_migrations) AS migration_history_rows,
  (SELECT COUNT(*) FROM public._prisma_migrations
   WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL)
   AS migration_finished_rows,
  (SELECT COUNT(*) FROM public._prisma_migrations
   WHERE logs IS NOT NULL AND length(logs) > 0)
   AS historical_error_log_rows,
  (SELECT COUNT(*) FROM auth.users) AS auth_user_rows,
  (SELECT COUNT(*) FROM storage.buckets) AS storage_bucket_rows,
  (SELECT COUNT(*) FROM storage.objects) AS storage_object_metadata_rows,
  (SELECT COUNT(*) FROM public.system_settings) AS system_settings_rows,
  (SELECT COUNT(*)
   FROM pg_constraint c
   JOIN pg_class t ON t.oid = c.conrelid
   JOIN pg_namespace n ON n.oid = t.relnamespace
   WHERE n.nspname = 'public' AND c.contype = 'f')
   AS physical_public_foreign_keys,
  (SELECT COUNT(*)
   FROM pg_class t JOIN pg_namespace n ON n.oid = t.relnamespace
   WHERE n.nspname = 'public'
     AND t.relkind = 'r'
     AND t.relrowsecurity)
   AS public_tables_rls_enabled,
  EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'postgis')
   AS postgis_present,
  to_regclass('public.commission_ledger') IS NOT NULL
   AS commission_ledger_present;
