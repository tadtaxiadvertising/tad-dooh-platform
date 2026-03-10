// test-e2e.js — Quick E2E test of all critical endpoints
const BASE = 'http://localhost:3000/api';

async function test() {
  console.log('=== TAD E2E Test Suite (Localhost) ===\n');
  
  // 1. Device Register
  console.log('1. POST /device/register');
  let res = await fetch(`${BASE}/device/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id: 'TAD-E2ETEST1', app_version: 'v2.0.0-localhost' })
  });
  let data = await res.json();
  console.log('   Status:', res.status, '| Response:', JSON.stringify(data));
  
  // 2. Device Sync (no content expected)  
  console.log('\n2. GET /device/sync?device_id=TAD-E2ETEST1');
  res = await fetch(`${BASE}/device/sync?device_id=TAD-E2ETEST1`);
  data = await res.json();
  console.log('   Status:', res.status, '| Response:', JSON.stringify(data));
  console.log('   ✅ media_assets count:', data.media_assets?.length ?? 'N/A');
  
  // 3. Device Slots
  console.log('\n3. GET /device/TAD-E2ETEST1/slots');
  res = await fetch(`${BASE}/device/TAD-E2ETEST1/slots`);
  data = await res.json();
  console.log('   Status:', res.status, '| Response:', JSON.stringify(data));
  
  // 4. Auth Login (to get JWT for protected routes)
  console.log('\n4. POST /auth/login');
  res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@tad.do', password: 'TadAdmin2026!' })
  });
  data = await res.json();
  const token = data.access_token;
  console.log('   Status:', res.status, '| Token:', token ? token.substring(0, 20) + '...' : 'NONE');
  
  if (!token) {
    console.log('\n⚠️ No JWT token available. Skipping protected route tests.');
    return;
  }
  
  // 5. Fleet Devices (protected)
  console.log('\n5. GET /fleet/devices');
  res = await fetch(`${BASE}/fleet/devices`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  data = await res.json();
  console.log('   Status:', res.status, '| Devices:', Array.isArray(data) ? data.length : 'error');
  if (Array.isArray(data) && data.length > 0) {
    data.forEach(d => console.log(`     📱 ${d.device_id} | status=${d.status} | lastSeen=${d.last_seen || d.lastSeen || 'never'}`));
  }
  
  // 6. Campaigns (protected)
  console.log('\n6. GET /campaigns');
  res = await fetch(`${BASE}/campaigns`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  data = await res.json();
  console.log('   Status:', res.status, '| Campaigns:', Array.isArray(data) ? data.length : 'error');
  if (Array.isArray(data) && data.length > 0) {
    data.forEach(c => console.log(`     🎯 ${c.name} | active=${c.active} | assets=${c.mediaAssets?.length || 0}`));
  }
  
  // 7. Media Library (protected)
  console.log('\n7. GET /media');
  res = await fetch(`${BASE}/media`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  data = await res.json();
  console.log('   Status:', res.status, '| Media files:', Array.isArray(data) ? data.length : 'error');
  
  console.log('\n=== E2E Tests Complete ===');
}

test().catch(e => console.error('Fatal:', e));
