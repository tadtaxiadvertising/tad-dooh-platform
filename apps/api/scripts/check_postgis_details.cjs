const { Client } = require('pg');
require('dotenv').config({ path: 'apps/api/.env' });

const connStr = process.env.DIRECT_URL || process.env.DATABASE_URL;
const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

async function checkPostgisDetails() {
  await client.connect();
  try {
    // Check if spatial_ref_sys belongs to postgis extension
    const extDep = await client.query(`
      SELECT e.extname, d.deptype
      FROM pg_extension e
      JOIN pg_depend d ON d.refobjid = e.oid
      WHERE d.objid = 'public.spatial_ref_sys'::regclass;
    `);
    console.log('[Extension dependency of spatial_ref_sys]:', extDep.rows);

    // Check grants on spatial_ref_sys
    const grants = await client.query(`
      SELECT grantee, privilege_type
      FROM information_schema.table_privileges
      WHERE table_schema = 'public' AND table_name = 'spatial_ref_sys';
    `);
    console.log('[Table privileges for spatial_ref_sys]:', grants.rows);

    // Check RLS status of all tables
    const rlsTables = await client.query(`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);
    console.log('[RLS status on all tables]:', rlsTables.rows.map(r => `${r.tablename}: ${r.rowsecurity}`));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkPostgisDetails();
