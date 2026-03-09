const { Client } = require('pg');

async function testFake() {
  const client = new Client({
    host: 'aws-0-us-west-2.pooler.supabase.com',
    port: 6543,
    user: 'postgres.foobarbaz1234',
    password: 'password',
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  });

  try {
    await client.connect();
    console.log(`✅ SUCCESS on fake`);
    await client.end();
  } catch (err) {
    console.log(`❌ ERROR on fake: ${err.message}`);
  }
}
testFake();
