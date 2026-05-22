-- Enable RLS on PostGIS metadata table exposed in public schema to satisfy Supabase security linting.
ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
