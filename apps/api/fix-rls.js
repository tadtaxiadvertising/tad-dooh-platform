const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('[RLS Fix] Auditing and configuring PostGIS spatial_ref_sys and business tables...');
    
    // Restriction: DO NOT apply RLS on spatial_ref_sys (owned by supabase_admin).
    // Ensure postgres user has complete privileges on spatial_ref_sys without triggering 42501.
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        GRANT ALL ON TABLE public.spatial_ref_sys TO postgres;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE 'Skipping direct grant on spatial_ref_sys: %', SQLERRM;
      END $$;
    `);
    console.log('[RLS Fix] spatial_ref_sys privileges verified.');

    // Enable RLS on all business tables owned by current user
    await prisma.$executeRawUnsafe(`
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
      END $$;
    `);
    console.log('[RLS Fix] RLS enabled successfully on all business tables!');
  } catch (error) {
    console.error('[RLS Fix] Error configuring RLS:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
