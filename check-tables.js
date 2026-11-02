const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function checkTables() {
  try {
    await client.connect();
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%driver%'
    `);
    console.log('Driver-related tables:', res.rows);
    
    const res2 = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%location%'
    `);
    console.log('Location-related tables:', res2.rows);
    
    const res3 = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%telemetry%'
    `);
    console.log('Telemetry-related tables:', res3.rows);
    
    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkTables();
