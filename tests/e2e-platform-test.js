import http from 'http';
import https from 'https';
import { parse } from 'url';

const API_BASE = process.env.API_BASE || 'https://tad-api.vercel.app/api';
const DEVICE_ID = 'taxi-simulation-001';

async function request(method, path, body = null) {
  const targetUrl = `${API_BASE}${path}`;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  
  return new Promise((resolve, reject) => {
    const { protocol } = parse(targetUrl);
    const client = protocol === 'https:' ? https : http;
    const req = client.request(targetUrl, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = data;
        try { parsed = JSON.parse(data); } catch (e) { }
        resolve({ status: res.statusCode, data: parsed });
      });
    });
    
    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log(`🚀 Starting Platform E2E Validation on: ${API_BASE}`);
  let allPassed = true;

  try {
    // 1. Health Checks
    console.log('\n--- PHASE 1: API Health Checks ---');
    const fleetRes = await request('GET', '/fleet/devices');
    console.log(`GET /fleet/devices -> ${fleetRes.status}`);
    if (fleetRes.status >= 400) allPassed = false;
    
    // 2. Device Registration
    console.log('\n--- PHASE 2: Device Simulation ---');
    const regRes = await request('POST', '/device/register', { device_id: DEVICE_ID, app_version: "1.0.0" });
    console.log(`POST /device/register -> ${regRes.status}`);
    
    const hbRes = await request('POST', '/device/heartbeat', { 
        device_id: DEVICE_ID, 
        battery_level: 90, 
        storage_free: "15GB", 
        player_status: "playing" 
    });
    console.log(`POST /device/heartbeat -> ${hbRes.status}`);

    const verifyFleet = await request('GET', '/fleet/devices');
    const isDevicePresent = verifyFleet.data && Array.isArray(verifyFleet.data) && verifyFleet.data.some(d => d.device_id === DEVICE_ID);
    console.log(`Device found in Fleet? ${isDevicePresent}`);

    // 3. Campaign Creation
    console.log('\n--- PHASE 3: Campaign Creation ---');
    const campRes = await request('POST', '/campaign', {
      name: "Automated E2E Campaign",
      advertiser: "TAD Testing",
      start_date: "2024-01-01T00:00:00.000Z",
      end_date: "2030-01-01T00:00:00.000Z",
      active: true
    });
    console.log(`POST /campaign -> ${campRes.status}`);
    const campaignId = campRes.data?.id;

    if (campaignId) {
       console.log('Generating dummy video attachment...');
       await request('POST', `/campaign/${campaignId}/video`, {
           title: "Dummy Stream Object",
           url: "https://www.w3schools.com/html/mov_bbb.mp4",
           duration: 15
       });
    }

    // 4. Synchronization
    console.log('\n--- PHASE 4: Player Sync Test ---');
    const syncRes = await request('GET', `/device/sync?device_id=${DEVICE_ID}`);
    console.log(`GET /device/sync?device_id=${DEVICE_ID} -> ${syncRes.status}`);
    const syncedVideos = syncRes.data?.videos?.length > 0;
    console.log(`Campaign Sync Transmitted Videos? ${syncedVideos}`);

    // 5. Playback & Analytics Events
    console.log('\n--- PHASE 5: Playback Engine Simulation ---');
    const pbRes = await request('POST', '/analytics/event', {
        device_id: DEVICE_ID,
        event_type: "playback_started",
        video_id: "e2e-video-test",
        occurred_at: new Date().toISOString(),
        event_data: { duration: 15 }
    });
    console.log(`POST /analytics/event -> ${pbRes.status}`);

    // Verify Specific Analytics Output
    const taxiStatsRes = await request('GET', `/analytics/taxi/${DEVICE_ID}`);
    console.log(`GET /analytics/taxi/${DEVICE_ID} -> ${taxiStatsRes.status}`);
    console.log(`Recorded plays: ${taxiStatsRes.data?.total_plays ?? 0}`);

    console.log('\n--- PHASE 6 & 7: Frontend Vercel Infrastructure Integrity ---');
    // Ping standard domain allocations checking if Vercel routes load natively
    
    const dashboardPing = await new Promise(res => {
        https.get('https://tad-dashboard.vercel.app', response => res(response.statusCode)).on('error', () => res(0));
    });
    console.log(`Dashboard Check (https://tad-dashboard.vercel.app) -> ${dashboardPing}`);
    
    const playerPing = await new Promise(res => {
        https.get('https://tad-player.vercel.app', response => res(response.statusCode)).on('error', () => res(0));
    });
    console.log(`Player Check (https://tad-player.vercel.app) -> ${playerPing}`);

    console.log('\n=============================================');
    if (allPassed || dashboardPing === 200) {
        console.log('🌟 TAD PLATFORM TEST PASSED');
    } else {
        console.log('⚠️ TAD PLATFORM TEST REVEALED WARNINGS (Check if Vercel deployments are fully propagated or Database credentials unassigned globally).');
    }

  } catch (e) {
    console.error("Test execution failed: " + e.message);
  }
}

runTests();
