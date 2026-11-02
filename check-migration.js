const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function checkMigration() {
  try {
    await client.connect();
    
    // Check current migration history
    const res = await client.query(`
      SELECT 
        version,
        applied_time,
        hash
      FROM prisma_migrations 
      ORDER BY applied_time DESC 
      LIMIT 20
    `);
    console.log('Recent migrations:', JSON.stringify(res.rows, null, 2));
    
    // Check if driver_locations table exists
    const res2 = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('driver_locations', 'driver_location')
    `);
    console.log('driver_locations table:', JSON.stringify(res2.rows, null, 2));
    
    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkMigration();
