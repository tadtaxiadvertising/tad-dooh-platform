const { Client } = require('pg');
require('dotenv').config({ path: 'apps/api/.env' });

const connStr = process.env.DIRECT_URL || process.env.DATABASE_URL;
const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

async function explore() {
  await client.connect();
  try {
    // 1. Check roles and attributes
    const rolesRes = await client.query(`
      SELECT rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb, rolcanlogin, rolreplication, rolbypassrls
      FROM pg_roles 
      WHERE rolname IN ('postgres', 'supabase_admin', 'supabase_storage_admin', 'supabase_auth_admin', 'anon', 'authenticated', 'service_role');
    `);
    console.log('[Roles]:', rolesRes.rows);

    // 2. Check role memberships
    const memRes = await client.query(`
      SELECT r.rolname, m.rolname AS memberof
      FROM pg_roles r
      JOIN pg_auth_members am ON r.oid = am.member
      JOIN pg_roles m ON am.roleid = m.oid
      WHERE r.rolname IN ('postgres', 'supabase_admin');
    `);
    console.log('[Memberships]:', memRes.rows);

    // 3. Check what tables are in public and their owners and RLS status
    const tablesRes = await client.query(`
      SELECT tablename, tableowner, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);
    console.log('[Public Tables count]:', tablesRes.rows.length);
    const nonPostgres = tablesRes.rows.filter(t => t.tableowner !== 'postgres');
    console.log('[Non-postgres owned tables in public]:', nonPostgres);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

explore();
