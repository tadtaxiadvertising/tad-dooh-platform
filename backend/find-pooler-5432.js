const { Client } = require('pg');

async function checkPooler5432() {
  const host = `aws-0-us-west-2.pooler.supabase.com`;
  
  let client = new Client({
    host: host,
    port: 5432,
    user: 'postgres.ltdcdhqixvbpdcitthqf',
    password: 'Tad.avertising2026',
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  });

  try {
    await client.connect();
    console.log(`✅ SUCCESS on 5432`);
    await client.end();
  } catch (err) {
    console.log(`❌ ERROR on 5432: ${err.message}`);
  }
}

checkPooler5432();
