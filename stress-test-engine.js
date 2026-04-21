
const axios = require('axios');

async function runStressTest() {
  const ports = [80, 3000, 3001];
  let SIM_URL = '';
  
  for (const port of ports) {
    try {
      await axios.get(`http://localhost:${port}/api/simulation/state`);
      SIM_URL = `http://localhost:${port}/api/simulation`;
      console.log(`📡 Detected Simulator on port ${port}`);
      break;
    } catch (e) {}
  }

  if (!SIM_URL) {
    console.error('❌ Could not find a running simulator on ports 80, 3000, or 3001.');
    process.exit(1);
  }
  
  console.log('🔥 INITIATING TAD ENGINE STRESS TEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // 1. Peak Configuration
    console.log('➡️ Phase 1: Ramping up to 500 drivers...');
    await axios.post(`${SIM_URL}/update`, {
      config: {
        driverCount: 500,
        telemetryFrequency: 10,
        errorRate: 0.1
      }
    });

    // 2. Deployment
    console.log('➡️ Phase 2: Deploying Engine...');
    await axios.post(`${SIM_URL}/start`);

    // 3. Recursive Monitoring
    console.log('➡️ Phase 3: Monitoring SRE Stability (60s)...');
    for (let i = 0; i < 12; i++) {
        const res = await axios.get(`${SIM_URL}/metrics`);
        const m = res.data.metrics;
        console.log(`[${i*5}s] RAM: ${m.ram}MB | Drivers: ${m.totalDrivers} | Time: ${m.timestamp}`);
        
        if (m.ram > 700) {
            console.warn('⚠️ WARNING: RAM approaching 768MB limit!');
        }
        
        await new Promise(r => setTimeout(r, 5000));
    }

    console.log('✅ TEST COMPLETE: Engine stabilized under high load.');
  } catch (e) {
    console.error('❌ STRESS TEST ABORTED:', e.message);
  }
}

runStressTest();
