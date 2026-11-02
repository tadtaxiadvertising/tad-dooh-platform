const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function checkTables() {
  try {
    await client.connect();
    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%driver%'");
    console.log('Driver-related tables:', JSON.stringify(res.rows, null, 2));
    
    const res2 = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%location%'");
    console.log('Location-related tables:', JSON.stringify(res2.rows, null, 2));
    
    const res3 = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%telemetry%'");
    console.log('Telemetry-related tables:', JSON.stringify(res3.rows, null, 2));
    
    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkTables();
