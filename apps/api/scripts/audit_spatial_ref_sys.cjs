const { Client } = require('pg');
require('dotenv').config({ path: 'apps/api/.env' });

const connStr = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connStr) {
  console.error('No connection string found in apps/api/.env');
  process.exit(1);
}

const maskedHost = connStr.split('@')[1]?.split('/')[0] || 'unknown';
console.log(`[DBA Audit] Connecting to database at: ${maskedHost}`);

const client = new Client({
  connectionString: connStr,
  ssl: { rejectUnauthorized: false }
});

async function runAudit() {
  try {
    await client.connect();
    console.log('[DBA Audit] Connection established successfully.');

    // Step 1: Reconnaissance (both pg_tables and information_schema)
    const res = await client.query("SELECT schemaname, tablename, tableowner, rowsecurity FROM pg_tables WHERE tablename = 'spatial_ref_sys';");
    console.log('[DBA Audit] spatial_ref_sys pg_tables info:', JSON.stringify(res.rows, null, 2));

    // Also check current_user, session_user, current_database
    const userRes = await client.query("SELECT current_user, session_user, current_database(), version();");
    console.log('[DBA Audit] Session info:', JSON.stringify(userRes.rows[0], null, 2));

    // Check permissions on spatial_ref_sys
    const permRes = await client.query(`
      SELECT grantee, privilege_type 
      FROM information_schema.role_table_grants 
      WHERE table_name = 'spatial_ref_sys';
    `);
    console.log('[DBA Audit] spatial_ref_sys grants:', JSON.stringify(permRes.rows, null, 2));

    // Check extensions
    const extRes = await client.query("SELECT extname, extversion, extowner::regrole as owner FROM pg_extension WHERE extname = 'postgis';");
    console.log('[DBA Audit] PostGIS extension info:', JSON.stringify(extRes.rows, null, 2));

    // Check table row count of spatial_ref_sys to make sure it is healthy
    const countRes = await client.query("SELECT count(*) FROM public.spatial_ref_sys;");
    console.log('[DBA Audit] spatial_ref_sys row count:', countRes.rows[0].count);

  } catch (err) {
    console.error('[DBA Audit] Error during audit:', err);
  } finally {
    await client.end();
  }
}

runAudit();
