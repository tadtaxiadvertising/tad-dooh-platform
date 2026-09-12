-- Enable RLS safely on PostGIS metadata table exposed in public schema without breaking if not table owner (ERROR 42501).
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename = 'spatial_ref_sys' 
          AND tableowner = CURRENT_USER
    ) THEN
        EXECUTE 'ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;';
    ELSE
        -- postgres is not superuser in Supabase (owned by supabase_admin); grant access safely
        GRANT ALL ON TABLE public.spatial_ref_sys TO postgres;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Skipping spatial_ref_sys RLS modification: %', SQLERRM;
END $$;
