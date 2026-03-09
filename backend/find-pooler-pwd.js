const { Client } = require('pg');

async function testPassword(pwd) {
  const client = new Client({
    host: 'aws-0-us-west-2.pooler.supabase.com',
    port: 6543,
    user: 'postgres.ltdcdhqixvbpdcitthqf',
    password: pwd,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  });

  try {
    await client.connect();
    console.log(`✅ SUCCESS with ${pwd}`);
    await client.end();
  } catch (err) {
    console.log(`❌ ERROR with ${pwd}: ${err.message}`);
  }
}

async function run() {
  await testPassword('Tad.advertising2026');
  await testPassword('Tad.avertising2026');
  
  // also check us-east-1 just in case the proxy forwards the error from the backend instead of shortcircuiting
  const c2 = new Client({
    host: 'aws-0-us-east-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.ltdcdhqixvbpdcitthqf',
    password: 'Tad.advertising2026',
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  });
  try {
    await c2.connect();
    console.log(`✅ SUCCESS on us-east-1 with Tad.advertising2026`);
    await c2.end();
  } catch (err) {
    console.log(`❌ ERROR on us-east-1: ${err.message}`);
  }
}
run();
