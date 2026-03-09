const { Client } = require('pg');

const regions = [
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1',
  'sa-east-1', 'ap-southeast-1', 'ap-northeast-1', 'ap-northeast-2',
  'ap-southeast-2', 'ap-south-1', 'ca-central-1'
];

async function checkPooler(region) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  const client = new Client({
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
    console.log(`✅ SUCCESS on ${region}`);
    await client.end();
    return host;
  } catch (err) {
    if (err.message.includes('password authentication failed')) {
      console.log(`⚠️ AUTH FAILED on ${region} (but pooler is correct)`);
      return host;
    } else {
      console.log(`❌ ERROR on ${region}: ${err.message}`);
      return null;
    }
  }
}

async function run() {
  const promises = regions.map(r => checkPooler(r));
  await Promise.all(promises);
}
run();
