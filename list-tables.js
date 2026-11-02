const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function listTablesAndMigrations() {
  try {
    await client.connect();

    console.log('=== Tables in database ===');
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_name
    `);
    res.rows.forEach(row => console.log(' -', row.table_name));

    // Check Prisma migration status
    console.log('\n=== _prisma_migrations status ===');
    const migrationRes = await client.query(`
      SELECT version, applied_time, hash 
      FROM _prisma_migrations 
      ORDER BY applied_time
    `);
    console.log('Migration history:');
    migrationRes.rows.forEach(row => console.log(` - ${row.version} | ${row.applied_time} | ${row.hash}`));
    if (migrationRes.rowCount === 0) {
      console.log('No migrations recorded yet');
    }

    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

listTablesAndMigrations();
