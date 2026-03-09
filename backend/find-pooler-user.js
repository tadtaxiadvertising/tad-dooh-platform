const { Client } = require('pg');

async function checkPooler() {
  const host = `aws-0-us-west-2.pooler.supabase.com`;
  
  // Try with project ref
  let client = new Client({
    host: host,
    port: 6543,
    user: 'postgres.ltdcdhqixvbpdcitthqf',
    password: 'Tad.avertising2026',
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  });

  try {
    await client.connect();
    console.log(`✅ SUCCESS on postgres.ltdcdhqixvbpdcitthqf`);
    await client.end();
  } catch (err) {
    console.log(`❌ ERROR on postgres.ltdcdhqixvbpdcitthqf: ${err.message}`);
  }

  // Try without project ref
  client = new Client({
    host: host,
    port: 6543,
    user: 'postgres',
    password: 'Tad.avertising2026',
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  });

  try {
    await client.connect();
    console.log(`✅ SUCCESS on postgres`);
    await client.end();
  } catch (err) {
    console.log(`❌ ERROR on postgres: ${err.message}`);
  }
}

checkPooler();
