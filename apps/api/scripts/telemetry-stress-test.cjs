const axios = require('axios');

const API_URL = 'http://localhost:3000/api/v1';
const TAXI_COUNT = 100;
const DURATION_MS = 30000;
const BATCH_INTERVAL_MS = 2000;

// Mock Driver IDs (UUIDs genéricos para la prueba)
const driverIds = Array.from({ length: TAXI_COUNT }, (_, i) => `00000000-0000-0000-0000-${i.toString().padStart(12, '0')}`);

async function simulateTaxi(driverId) {
  const startTime = Date.now();
  let successCount = 0;
  let errorCount = 0;

  while (Date.now() - startTime < DURATION_MS) {
    const batch = Array.from({ length: 5 }, (_, i) => ({
      driverId,
      lat: 18.4861 + (Math.random() * 0.01),
      lng: -69.9312 + (Math.random() * 0.01),
      speed: 30 + (Math.random() * 20),
      timestamp: new Date(Date.now() - (i * 2000)).toISOString()
    }));

    try {
      await axios.post(`${API_URL}/telemetry/sync`, batch, {
        timeout: 5000,
        headers: { 'x-stress-test': 'true' }
      });
      successCount++;
    } catch (err) {
      errorCount++;
    }

    await new Promise(resolve => setTimeout(resolve, BATCH_INTERVAL_MS));
  }

  return { driverId, successCount, errorCount };
}

async function runStressTest() {
  console.log(`🚀 Iniciando Stress Test: ${TAXI_COUNT} taxis simulados durante ${DURATION_MS/1000}s...`);
  
  const tasks = driverIds.map(id => simulateTaxi(id));
  const results = await Promise.all(tasks);

  const totalSuccess = results.reduce((sum, r) => sum + r.successCount, 0);
  const totalError = results.reduce((sum, r) => sum + r.errorCount, 0);

  console.log('\n📊 RESULTADOS STRESS TEST:');
  console.log(`- Total Requests Enviadas: ${totalSuccess + totalError}`);
  console.log(`- Éxitos (201 Created): ${totalSuccess}`);
  console.log(`- Fallos (401/500/Timeout): ${totalError}`);
  console.log(`- Tasa de Éxito: ${((totalSuccess / (totalSuccess + totalError)) * 100).toFixed(2)}%`);
}

runStressTest();
