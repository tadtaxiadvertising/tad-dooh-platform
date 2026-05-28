
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';
const NUM_DEVICES = 100; // Let's try 100 to really stress it
const DURATION_MS = 60000;
const HEARTBEAT_INTERVAL = 5000;
const PLAYBACK_INTERVAL = 8000;

console.log('🚀 INICIANDO PRUEBA DE ESTRÉS - TAD PLATFORM (V3 PARALLEL)');
console.log(`📊 Dispositivos: ${NUM_DEVICES} | Duración: ${DURATION_MS/1000}s`);

async function run() {
  const devices = Array.from({ length: NUM_DEVICES }, (_, i) => `STRESS_DEVICE_${i}`);

  console.log('📝 Registrando 100 dispositivos en paralelo...');
  await Promise.allSettled(devices.map(did => 
    axios.post(`${API_BASE}/device/register`, {
      device_id: did,
      app_version: '5.4-stress',
      model: 'StressBot V3'
    }, { timeout: 5000 })
  ));
  console.log('✅ Registro completado. Iniciando flujo de tráfico...');

  let heartbeatsSent = 0;
  let playbacksSent = 0;
  let errors = 0;
  const startTime = Date.now();
  const intervals = [];

  devices.forEach((did, index) => {
    // Escalonar picos de CPU
    setTimeout(() => {
      const hInterval = setInterval(async () => {
        try {
          await axios.post(`${API_BASE}/device/heartbeat`, {
            device_id: did,
            battery_level: 85,
            lat: 18.4861,
            lng: -69.9312,
            player_status: 'playing',
            timestamp: new Date().toISOString()
          }, { timeout: 3000 });
          heartbeatsSent++;
        } catch (e) {
          errors++;
        }
      }, HEARTBEAT_INTERVAL);

      const pInterval = setInterval(async () => {
        try {
          await axios.post(`${API_BASE}/device/playback`, {
            device_id: did,
            video_id: 'STRESS_MEDIA',
            timestamp: new Date().toISOString(),
            lat: 18.4861,
            lng: -69.9312
          }, { timeout: 3000 });
          playbacksSent++;
        } catch (e) {
          errors++;
        }
      }, PLAYBACK_INTERVAL);

      intervals.push(hInterval, pInterval);
    }, (index % 50) * 100); 
  });

  const monitor = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    console.log(`⏱  [${elapsed}s] Trafico: HB=${heartbeatsSent} | PB=${playbacksSent} | Failures=${errors}`);
  }, 5000);

  setTimeout(() => {
    intervals.forEach(clearInterval);
    clearInterval(monitor);
    console.log('\n🏁 PRUEBA DE ESTRÉS FINALIZADA');
    console.log(`📈 RESULTADOS TOTALES (100 Dispositivos / 60s):`);
    console.log(`   - Heartbeats (GPS) Exitosos: ${heartbeatsSent}`);
    console.log(`   - Playbacks (Analytics) Exitosos: ${playbacksSent}`);
    console.log(`   - Errores/Timeouts: ${errors}`);
    
    if (errors < (heartbeatsSent + playbacksSent) * 0.1) {
      console.log('✅ ESTADO: SISTEMA ALTAMENTE RESILIENTE ( < 10% error under load)');
    } else {
      console.log('⚠️ ESTADO: DEGRADACIÓN DETECTADA ( VPS RAM / DB saturation)');
    }
    process.exit(0);
  }, DURATION_MS + 2000);
}

run().catch(err => {
  console.error('CRITICAL_FAIL:', err.message);
  process.exit(1);
});
