const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function checkTables() {
  try {
    await client.connect();
    
    console.log('=== Checking driver_locations table ===');
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('driver_locations', 'driver_installs')
    `);
    console.log(JSON.stringify(res.rows, null, 2));
    
    // Check driver_locations columns
    const res2 = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'driver_locations'
      ORDER BY ordinal_position
    `);
    console.log('driver_locations columns:', JSON.stringify(res2.rows, null, 2));
    
    // Check if unique constraint exists
    const res3 = await client.query(`
      SELECT conname 
      FROM pg_constraint 
      WHERE conrelid = 'driver_locations'::regclass
    `);
    console.log('driver_locations constraints:', JSON.stringify(res3.rows, null, 2));
    
    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkTables();
