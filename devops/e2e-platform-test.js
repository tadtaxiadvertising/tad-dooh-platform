const BASE_URL = 'https://tad-api.vercel.app/api';

async function runTests() {
  console.log('--- TAD DOOH Platform E2E Tests ---');
  let deviceId = 'test-tablet-' + Date.now();
  let campaignId = '';

  try {
    // 1. Device Registration
    console.log('1. Device Registration');
    let res = await fetch(`${BASE_URL}/device/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId, app_version: '1.0.0' })
    });
    let data = await res.json();
    if (!data.success) {
      console.error(data);
      throw new Error('Registration failed');
    }
    console.log('✅ Device registered');

    // 2. Heartbeat Updates
    console.log('2. Heartbeat Updates');
    res = await fetch(`${BASE_URL}/device/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        device_id: deviceId, 
        battery_level: 100,
        storage_free: '10GB',
        player_status: 'standby'
      })
    });
    data = await res.json();
    if (!data.success) throw new Error('Heartbeat failed');
    console.log('✅ Heartbeat successful');

    // 3. Campaign Creation
    console.log('3. Campaign Creation');
    res = await fetch(`${BASE_URL}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name: 'Test Setup Campaign', 
        advertiser: 'Test Brand',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000).toISOString()
      })
    });
    data = await res.json();
    campaignId = data.id;
    if (!campaignId) throw new Error('Campaign creation failed');
    console.log('✅ Campaign created:', campaignId);

    // Add Media Asset to Campaign
    res = await fetch(`${BASE_URL}/campaigns/${campaignId}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'video',
        filename: 'ad.mp4',
        url: 'https://cdn.example.com/ad.mp4',
        fileSize: 1024,
        checksum: 'abc123hash',
        duration: 15
      })
    });
    await res.json();

    // 4. Tablet Sync
    console.log('4. Tablet Sync');
    res = await fetch(`${BASE_URL}/device/sync?device_id=${deviceId}`);
    data = await res.json();
    if (!data.media_assets) throw new Error("Tablet sync did not return media assets");
    console.log('✅ Tablet sync successful');

    // 5. Analytics Ingestion
    console.log('5. Analytics Ingestion');
    res = await fetch(`${BASE_URL}/analytics/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        deviceId, 
        campaignId,
        eventType: 'video_completed',
        timestamp: new Date().toISOString()
      })
    });
    data = await res.json();
    if (!data.success) throw new Error('Analytics ingestion failed');
    console.log('✅ Analytics ingestion successful');

    // 6. Fleet Monitoring
    console.log('6. Fleet Monitoring');
    res = await fetch(`${BASE_URL}/fleet/devices`);
    data = await res.json();
    if (!Array.isArray(data)) throw new Error('Fleet monitoring returned invalid data');
    console.log('✅ Fleet monitoring successful');

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY 🎉');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTests();
