import http from 'http';

const API_URL = process.env.API_URL || 'http://localhost:3000/api/v1';
const DRIVERS_TO_SIMULATE = 5;
const BATCHES_PER_DRIVER = 10;
const POINTS_PER_BATCH = 10;

async function simulateTelemetry() {
  console.log(`🚀 Iniciando Simulación de Estrés de Telemetría`);
  console.log(`Target: ${API_URL}`);
  console.log(`Config: ${DRIVERS_TO_SIMULATE} drivers, ${BATCHES_PER_DRIVER} batches cada uno\n`);

  const startTime = Date.now();
  let totalRequests = 0;
  let successCount = 0;
  let failCount = 0;

  const drivers = Array.from({ length: DRIVERS_TO_SIMULATE }, (_, i) => ({
    driverId: `SIM_DRIVER_${i}`,
    deviceId: `SIM_DEVICE_${i}`
  }));

  for (let b = 0; b < BATCHES_PER_DRIVER; b++) {
    console.log(`📦 Enviando Batch #${b + 1}...`);
    
    const batchPromises = drivers.map(async (driver) => {
      const payload = {
        driverId: driver.driverId,
        deviceId: driver.deviceId,
        points: Array.from({ length: POINTS_PER_BATCH }, () => ({
          lat: 18.4861 + (Math.random() - 0.5) * 0.1,
          lng: -69.9312 + (Math.random() - 0.5) * 0.1,
          speed: Math.floor(Math.random() * 60),
          timestamp: Date.now()
        }))
      };

      return new Promise((resolve) => {
        const req = http.request(`${API_URL}/fleet/track-batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }, (res) => {
          totalRequests++;
          if (res.statusCode === 201 || res.statusCode === 200) {
            successCount++;
          } else {
            failCount++;
            console.error(`  ❌ Error ${res.statusCode} para ${driver.driverId}`);
          }
          resolve();
        });

        req.on('error', (e) => {
          totalRequests++;
          failCount++;
          console.error(`  ❌ Request Error: ${e.message}`);
          resolve();
        });

        req.write(JSON.stringify(payload));
        req.end();
      });
    });

    await Promise.all(batchPromises);
    // Pequeño delay entre batches para no saturar el event loop local, 
    // pero simulando tráfico real.
    await new Promise(r => setTimeout(r, 500));
  }

  const duration = (Date.now() - startTime) / 1000;
  console.log(`\n🏁 Simulación Finalizada`);
  console.log(`--------------------------`);
  console.log(`Duración Total: ${duration.toFixed(2)}s`);
  console.log(`Total Requests: ${totalRequests}`);
  console.log(`Éxitos: ${successCount}`);
  console.log(`Fallos: ${failCount}`);
  console.log(`Throughput: ${(totalRequests / duration).toFixed(2)} req/s`);
}

simulateTelemetry().catch(console.error);
