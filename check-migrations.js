const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function checkMigrations() {
  try {
    await client.connect();
    
    // Check migration history
    const res = await client.query(`
      SELECT version, applied_time, hash 
      FROM prisma_migrations 
      ORDER BY applied_time
    `);
    console.log('Migration history:', JSON.stringify(res.rows, null, 2));
    
    // Check driver_locations table
    const res2 = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'driver_locations'
    `);
    console.log('driver_locations table exists:', res2.rowCount > 0);
    
    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkMigrations();
