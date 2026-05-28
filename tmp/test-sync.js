// Test script: verifica el flujo completo de transmisión/recepción
const BASE = 'http://localhost:3000/api';

async function testSync() {
  console.log('=== TAD SYNC TEST ===\n');

  // 1. Register device
  console.log('1. Registrando dispositivo de prueba...');
  try {
    const reg = await fetch(`${BASE}/device/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: 'TAD-TEST0001', app_version: 'v3.0-test' })
    });
    const regData = await reg.json();
    console.log('   ✅ Register:', reg.status, JSON.stringify(regData));
  } catch (e) {
    console.log('   ❌ Register failed:', e.message);
  }

  // 2. Sync device
  console.log('\n2. Sincronizando dispositivo (POST /device/sync)...');
  try {
    const sync = await fetch(`${BASE}/device/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: 'TAD-TEST0001', lastHash: '' })
    });
    const syncData = await sync.json();
    console.log('   Status:', sync.status);
    console.log('   Blocked:', syncData.blocked);
    console.log('   Update:', syncData.update);
    console.log('   Media Assets:', syncData.media_assets?.length || 0);
    if (syncData.media_assets && syncData.media_assets.length > 0) {
      syncData.media_assets.forEach((a, i) => {
        console.log(`   📹 [${i}] ${a.filename} → ${a.url?.substring(0, 80)}...`);
      });
    }
    console.log('   Sync Hash:', syncData.sync_hash);
    if (syncData.reason) console.log('   Reason:', syncData.reason);
  } catch (e) {
    console.log('   ❌ Sync failed:', e.message);
  }

  // 3. Get campaigns
  console.log('\n3. Listando campañas activas...');
  try {
    const camps = await fetch(`${BASE}/campaigns`);
    const campData = await camps.json();
    const active = Array.isArray(campData) ? campData.filter(c => c.active) : [];
    console.log(`   Total: ${Array.isArray(campData) ? campData.length : 0}, Activas: ${active.length}`);
    active.forEach(c => {
      console.log(`   📢 [${c.id?.substring(0,8)}] "${c.name}" | targetAll=${c.targetAll} | media=${c.media?.length || 0} assets=${c.mediaAssets?.length || 0}`);
    });
  } catch (e) {
    console.log('   ❌ Campaigns failed:', e.message);
  }

  // 4. Get tablet playlist
  console.log('\n4. Playlist de la tablet TAD-TEST0001...');
  try {
    const pl = await fetch(`${BASE}/campaigns/tablet/TAD-TEST0001/playlist`);
    const plData = await pl.json();
    console.log('   Status:', pl.status);
    console.log('   Total Campaigns:', plData.totalCampaigns);
    console.log('   Driver:', plData.driverName);
    if (plData.campaigns) {
      plData.campaigns.forEach(c => {
        const mediaCount = (c.media?.length || 0) + (c.mediaAssets?.length || 0);
        console.log(`   📹 "${c.name}" → ${mediaCount} archivo(s)`);
      });
    }
  } catch (e) {
    console.log('   ❌ Playlist failed:', e.message);
  }

  // 5. Heartbeat
  console.log('\n5. Enviando heartbeat...');
  try {
    const hb = await fetch(`${BASE}/device/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: 'TAD-TEST0001',
        player_status: 'playing',
        battery_level: 85,
        storage_free: '2.1GB'
      })
    });
    const hbData = await hb.json();
    console.log('   ✅ Heartbeat:', hb.status, JSON.stringify(hbData));
  } catch (e) {
    console.log('   ❌ Heartbeat failed:', e.message);
  }

  console.log('\n=== TEST COMPLETE ===');
}

testSync();
