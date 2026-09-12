-- Safely enable RLS on public tables, respecting table ownership and skipping PostGIS extension tables.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tableowner = CURRENT_USER
          AND tablename != 'spatial_ref_sys'
    ) LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY;';
    END LOOP;

    -- Ensure postgres has full grants on spatial_ref_sys without triggering 42501
    GRANT ALL ON TABLE public.spatial_ref_sys TO postgres;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error during RLS batch enablement: %', SQLERRM;
END $$;
