/**
 * TAD STRESS TEST S60
 * Simulates 60 devices syncing concurrently to test Prisma pooling and Supabase stability.
 */

const BASE_URL = 'http://localhost:3000/api';
const NUM_DEVICES = 60;
const CONCURRENCY = 60;

async function runStressTest() {
  console.log(`🚀 STARTING TAD STRESS TEST S60`);
  console.log(`📡 Target: ${BASE_URL}`);
  console.log(`📱 Simulating ${NUM_DEVICES} devices...\n`);

  const results = {
    success: 0,
    failed: 0,
    durations: [],
    errors: []
  };

  const startTotal = Date.now();

  // Prepare device IDs
  const deviceIds = Array.from({ length: NUM_DEVICES }, (_, i) => `TAD-STRESS-${String(i+1).padStart(3, '0')}`);

  // Step 1: Pre-register devices (sequential to avoid noise in stress test)
  console.log('📦 Pre-registering stress devices...');
  for (const deviceId of deviceIds) {
    try {
      await fetch(`${BASE_URL}/device/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId })
      });
    } catch (e) {
      // Ignore if already registered
    }
  }

  console.log('⚡ Starting Mass Sync Blowout (Concurrency: 60)...');

  // Step 2: Concurrent Sync Requests
  const syncRequests = deviceIds.map(async (deviceId) => {
    const startReq = Date.now();
    try {
      const res = await fetch(`${BASE_URL}/device/sync?device_id=${deviceId}`);
      const duration = Date.now() - startReq;
      
      if (res.ok) {
        results.success++;
        results.durations.push(duration);
      } else {
        results.failed++;
        const errText = await res.text();
        results.errors.push(`Status ${res.status}: ${errText.slice(0, 50)}...`);
      }
    } catch (e) {
      results.failed++;
      results.errors.push(e.message);
    }
  });

  await Promise.all(syncRequests);

  const totalTime = Date.now() - startTotal;
  const avgTime = results.durations.reduce((a, b) => a + b, 0) / results.durations.length;
  const maxTime = Math.max(...results.durations);
  const minTime = Math.min(...results.durations);

  console.log(`\n📊 TEST RESULTS:`);
  console.log(`-------------------------------------------`);
  console.log(`✅ Success: ${results.success}`);
  console.log(`❌ Failed:  ${results.failed}`);
  console.log(`⏱️ Avg Response: ${avgTime.toFixed(2)}ms`);
  console.log(`🚀 Max Response: ${maxTime}ms`);
  console.log(`🐌 Min Response: ${minTime}ms`);
  console.log(`🏁 Total Test Time: ${totalTime}ms`);
  console.log(`-------------------------------------------`);

  if (results.failed > 0) {
    console.log(`\n❌ Error Sample:`);
    console.log(results.errors.slice(0, 3).join('\n'));
    console.warn('\n⚠️ POSSIBLE POOL EXHAUSTION DETECTED');
  } else {
    console.log('\n🏆 TAD PLATFORM STABILIZED - 60 DEVICES HANDLED WITHOUT ERRORS');
  }
}

runStressTest().catch(console.error);
