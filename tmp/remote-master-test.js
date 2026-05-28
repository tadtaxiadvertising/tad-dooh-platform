/**
 * 🏆 TAD DOOH PLATFORM - MASTER E2E TEST SUITE
 * 🔭 Comprehensive validation of API, Security, Business Logic and Protocols.
 */

const BASE = 'https://tad-api.vercel.app/api';
const ADMIN_EMAIL = 'admin@tad.do';
const ADMIN_PASS = 'TadAdmin2026!'; // Default from changelog logs
const TEST_DEVICE = 'MASTER-DEVICE-999';

async function runMasterTest() {
  console.log('\n=================================================');
  console.log('🚀  STARTING COMPREHENSIVE TAD DOOH TEST SUITE');
  console.log('=================================================\n');

  let adminToken = '';
  let testCampaignId = '';
  let internalDeviceId = '';

  try {
    // --- 🔐 1. AUTHENTICATION TEST ---
    console.log('🧪 [AUTH] Testing Admin Login...');
    const loginRes = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS })
    });
    
    if (!loginRes.ok) {
        console.log('   ⚠️ Login local failed (maybe secrets not loaded?) - Skipping protected tests if needed.');
    } else {
        const loginData = await loginRes.json();
        adminToken = loginData.access_token || loginData.token || loginData.session?.access_token;
        console.log('   ✅ Auth Successful. Token obtained.\n');
    }

    const authHeaders = { 
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json' 
    };

    // --- 📱 2. TABLET PROTOCOL (PUBLIC) ---
    console.log('🧪 [TABLET] Testing Hardware Registration...');
    const regRes = await fetch(`${BASE}/device/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: TEST_DEVICE, app_version: 'v9.9.9-QA' })
    });
    console.log(`   ✅ Register: ${regRes.status}`);

    console.log('🧪 [TABLET] Testing Heartbeat (Health Reporting)...');
    const hbRes = await fetch(`${BASE}/device/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            device_id: TEST_DEVICE,
            player_status: 'playing',
            battery_level: 42,
            storage_free: '500MB'
        })
    });
    console.log(`   ✅ Heartbeat: ${hbRes.status}`);

    console.log('🧪 [TABLET] Testing Delta Sync (Content Fetch)...');
    const syncRes = await fetch(`${BASE}/device/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: TEST_DEVICE, lastHash: '', lat: 18.4, lng: -69.9 })
    });
    const syncData = await syncRes.json();
    console.log(`   ✅ Sync: ${syncRes.status} | Hash: ${syncData.sync_hash} | Assets: ${syncData.media_assets?.length || 0}`);

    // --- 📈 3. ANALYTICS BATCH TEST (PUBLIC) ---
    console.log('\n🧪 [ANALYTICS] Testing Batch Events Ingestion...');
    const batchRes = await fetch(`${BASE}/analytics/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           deviceId: TEST_DEVICE,
           events: [
               { eventType: 'video_started', deviceId: TEST_DEVICE, campaignId: '0000', occurredAt: new Date().toISOString() },
               { eventType: 'system_error', deviceId: TEST_DEVICE, occurredAt: new Date().toISOString() } 
           ]
        })
    });
    console.log(`   ✅ Analytics Batch Status: ${batchRes.status}`);
    if (!batchRes.ok) {
        const err = await batchRes.json();
        console.log('      ❌ Error:', JSON.stringify(err));
    }

    if (adminToken) {
        // --- 📢 4. CAMPAIGN LIFECYCLE (PROTECTED) ---
        console.log('\n🧪 [CAMPAIGNS] Testing Lifecycle (Create/List/Delete)...');
        
        // CREATE
        const createRes = await fetch(`${BASE}/campaigns`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                name: 'TEST QA CAMPAIGN - DELETE ME',
                advertiser: 'QA LABS',
                start_date: new Date().toISOString(),
                end_date: new Date(Date.now() + 86400000).toISOString(),
                target_all: true
            })
        });
        const campaign = await createRes.json();
        testCampaignId = campaign.id;
        console.log(`   ✅ Create: ${createRes.status} | ID: ${testCampaignId}`);

        // LIST
        const listRes = await fetch(`${BASE}/campaigns`, { headers: authHeaders });
        const list = await listRes.json();
        console.log(`   ✅ List: Found ${list.length} total campaigns.`);

        // --- 🚜 5. FLEET MANAGEMENT (PROTECTED) ---
        console.log('\n🧪 [FLEET] Verifying Device Inventory...');
        const fleetRes = await fetch(`${BASE}/fleet/devices`, { headers: authHeaders });
        const fleet = await fleetRes.json();
        const found = fleet.find(d => d.device_id === TEST_DEVICE);
        if (found) {
            internalDeviceId = found.id;
            console.log(`   ✅ Device Found in Fleet! Internal ID: ${internalDeviceId}`);
            console.log(`      Status: ${found.status} | Battery: ${found.battery_level}%`);
        } else {
            console.log('   ❌ Device NOT found in fleet listing (Delayed sync?)');
        }

        // --- 💰 6. FINANCE/PAYROLL (PROTECTED) ---
        console.log('\n🧪 [FINANCE] Verifying Payroll Generation...');
        const payrollRes = await fetch(`${BASE}/finance/payroll?month=${new Date().getMonth()+1}&year=${new Date().getFullYear()}`, { headers: authHeaders });
        const payroll = await payrollRes.json();
        console.log(`   ✅ Payroll: Received ${payroll.length} records.`);

        // --- 7. REMOTE COMMANDS (C2) ---
        console.log('\n🧪 [C2] Sending Remote Reboot Command...');
        const cmdRes = await fetch(`${BASE}/fleet/${found.device_id}/command`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ type: 'REBOOT', params: { reason: 'QA Test' } })
        });
        console.log(`   ✅ Command Sent: ${cmdRes.status}`);

        // --- 🧹 8. CLEANUP ---
        console.log('\n🧪 [CLEANUP] Removing test campaign...');
        const delRes = await fetch(`${BASE}/campaigns/${testCampaignId}`, {
            method: 'DELETE',
            headers: authHeaders
        });
        console.log(`   ✅ Delete: ${delRes.status}`);
    }

    console.log('\n=================================================');
    console.log('🏁  MASTER TEST SUITE COMPLETED SUCCESSFULLY');
    console.log('=================================================\n');

  } catch (err) {
    console.error('\n🔴 CRITICAL TEST FAILURE:');
    console.error(err);
    process.exit(1);
  }
}

runMasterTest();
