const { Client } = require('pg');

async function testConn(host, user, password, port = 6543) {
  const name = `${host}:${port} (${user})`;
  const c = new Client({ 
    user, 
    host, 
    database: 'postgres', 
    password, 
    port, 
    ssl: { rejectUnauthorized: false }, 
    connectionTimeoutMillis: 5000 
  });
  try {
    await c.connect();
    console.log(`✅ SUCCESS: ${name}`);
    await c.end();
    return true;
  } catch (e) {
    console.log(`❌ FAILED: ${name} -> ${e.message}`);
    return false;
  }
}

async function runAll() {
  const ref = 'ltdcdhqixvbpdcitthqf';
  const pass = 'Tad.avertising2026';
  const hosts = [
    'aws-0-us-west-2.pooler.supabase.com',
    'aws-0-us-east-1.pooler.supabase.com'
  ];
  
  const users = [
    `postgres.${ref}`,
    'postgres'
  ];
  const passwords = ['Tad.avertising2026', 'Tad.advertising2026', 'Tad.advertising2025', 'Tad.avertising2025'];

  for (const host of hosts) {
    for (const user of users) {
      for (const pass of passwords) {
        await testConn(host, user, pass);
        await testConn(host, user, pass, 5432);
      }
    }
  }
}

runAll();
