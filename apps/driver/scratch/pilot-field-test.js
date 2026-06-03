const http = require('http');

/**
 * TAD DOOH PLATFORM - PILOT FIELD TEST SIMULATOR
 * Simulates real-world driver movement in Santiago and Santo Domingo.
 */

const API_URL = process.env.API_URL || 'http://localhost:3000/api/v1';

// Definición de Nodos de Prueba
const NODES = [
  { id: '0b002cbb-e6bf-48ea-9a81-38cb61e84ab6', name: 'Simulated Driver 20', deviceId: 'STI0020', city: 'Santiago' },
];

async function runFieldTest() {
  console.log(`\n================================================`);
  console.log(`📡 TAD FIELD TEST SIMULATOR - INICIANDO`);
  console.log(`Target API: ${API_URL}`);
  console.log(`================================================\n`);

  const results = [];

  for (const node of NODES) {
    console.log(`🚚 Simulando Nodo: ${node.name} (${node.city})`);
    
    // Simular un trayecto de 5 minutos (30 puntos en 3 batches de 10)
    let startLat = node.city === 'Santiago' ? 19.4517 : 18.4861;
    let startLng = node.city === 'Santiago' ? -70.6970 : -69.9312;

    for (let batchIdx = 0; batchIdx < 3; batchIdx++) {
      const points = [];
      for (let p = 0; p < 10; p++) {
        // Movimiento lineal simulado
        startLat += 0.0001;
        startLng += 0.0001;
        
        points.push({
          lat: startLat,
          lng: startLng,
          speed: 45 + Math.random() * 10,
          timestamp: Date.now() - (30 - (batchIdx * 10 + p)) * 1000,
          // Metadata extendida para simulación real
          battery: Math.floor(Math.random() * 20) + 80, // 80-100%
          network: Math.random() > 0.2 ? '4G' : '3G',
          appVersion: '11.0.0-pilot'
        });
      }

      const payload = {
        driverId: node.id,
        deviceId: node.deviceId,
        points: points
      };

      try {
        const response = await post(`${API_URL}/fleet/track-batch`, payload);
        console.log(`  ✅ Batch ${batchIdx + 1}/3 enviado. Status: ${response.statusCode}`);
        results.push({ node: node.id, batch: batchIdx + 1, status: 'SUCCESS', code: response.statusCode });
      } catch (err) {
        console.error(`  ❌ Error en Batch ${batchIdx + 1}: ${err.message}`);
        results.push({ node: node.id, batch: batchIdx + 1, status: 'FAILED', error: err.message });
      }

      // Delay entre batches (simula batching real de 30s)
      await new Promise(r => setTimeout(r, 1000));
    }
    console.log(`------------------------------------------------`);
  }

  console.log(`\n📊 RESUMEN DE PRUEBA DE CAMPO`);
  console.log(`Total Nodos: ${NODES.length}`);
  console.log(`Éxitos: ${results.filter(r => r.status === 'SUCCESS').length}`);
  console.log(`Fallos: ${results.filter(r => r.status === 'FAILED').length}`);
  console.log(`\n[!] Prueba completada. El Admin Dashboard debería reflejar estos datos en "Fleet Pulse".`);
}

function post(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(data))
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body }));
    });

    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

runFieldTest().catch(console.error);
