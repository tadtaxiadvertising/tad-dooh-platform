async function healthCheck() {
  console.log('🏥 TAD Platform Health Check\n');
  
  // 1. Dashboard
  console.log('1️⃣  Dashboard (tad-dashboard.vercel.app)...');
  try {
    const dash = await fetch('https://tad-dashboard.vercel.app/login');
    console.log(`   ✅ Status: ${dash.status} ${dash.statusText}`);
  } catch(e) { console.log(`   ❌ ${e.message}`); }

  // 2. API Auth
  console.log('2️⃣  API Auth (tad-api.vercel.app)...');
  try {
    const auth = await fetch('https://tad-api.vercel.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@tad.do', password: 'TadAdmin2026!' })
    });
    const data = await auth.json();
    console.log(`   Status: ${auth.status}`);
    if (auth.ok) console.log('   ✅ Token received!');
    else console.log(`   ⚠️ Response: ${JSON.stringify(data)}`);
  } catch(e) { console.log(`   ❌ ${e.message}`); }

  // 3. Device Register (Public)
  console.log('3️⃣  Device Register (Public endpoint)...');
  try {
    const reg = await fetch('https://tad-api.vercel.app/api/device/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },  
      body: JSON.stringify({ device_id: 'HEALTH-CHECK-001', app_version: 'v1.0-healthcheck' })
    });
    console.log(`   Status: ${reg.status}`);
    if (reg.ok) console.log('   ✅ Device endpoint responsive!');
    else {
      const txt = await reg.text();
      console.log(`   ⚠️ Response: ${txt.substring(0, 200)}`);
    }
  } catch(e) { console.log(`   ❌ ${e.message}`); }

  console.log('\n🏁 Health Check Complete.');
}

healthCheck();
