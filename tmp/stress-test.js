
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';
const NUM_DEVICES = 50;
const DURATION_MS = 30000;
const HEARTBEAT_INTERVAL = 3000;
const PLAYBACK_INTERVAL = 5000;

console.log('🚀 INICIANDO PRUEBA DE ESTRÉS - TAD PLATFORM (V2 FIX)');
console.log(`📊 Dispositivos: ${NUM_DEVICES} | Duración: ${DURATION_MS/1000}s`);

async function run() {
  const devices = Array.from({ length: NUM_DEVICES }, (_, i) => `STRESS_DEVICE_${i}`);

  console.log('📝 Registrando dispositivos...');
  for (const did of devices) {
    try {
      await axios.post(`${API_BASE}/device/register`, {
        device_id: did,
        app_version: '5.4-stress',
        model: 'Pixel Stress V1'
      });
    } catch (e) {
      // Ignorar
    }
  }

  let heartbeatsSent = 0;
  let playbacksSent = 0;
  let errors = 0;
  const startTime = Date.now();
  const intervals = [];

  devices.forEach((did, index) => {
    setTimeout(() => {
      // Heartbeat Loop (GPS)
      const hInterval = setInterval(async () => {
        try {
          await axios.post(`${API_BASE}/device/heartbeat`, {
            device_id: did,
            battery_level: 80 + Math.random() * 10,
            lat: 18.4861 + (Math.random() - 0.5) * 0.01,
            lng: -69.9312 + (Math.random() - 0.5) * 0.01,
            player_status: 'playing',
            timestamp: new Date().toISOString()
          });
          heartbeatsSent++;
        } catch (e) {
          errors++;
          // console.error(`HB_ERR ${did}:`, e.response?.data || e.message);
        }
      }, HEARTBEAT_INTERVAL);

      // Playback Loop (Analytics)
      const pInterval = setInterval(async () => {
        try {
          await axios.post(`${API_BASE}/device/playback`, {
            device_id: did,
            video_id: 'STRESS_CAMPAIGN_MEDIA_1',
            timestamp: new Date().toISOString(),
            lat: 18.4861,
            lng: -69.9312
          });
          playbacksSent++;
        } catch (e) {
          errors++;
          // console.error(`PB_ERR ${did}:`, e.response?.data || e.message);
        }
      }, PLAYBACK_INTERVAL);

      intervals.push(hInterval, pInterval);
    }, index * 100); 
  });

  const monitor = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    console.log(`⏱  [${elapsed}s] Sent: HB=${heartbeatsSent} | PB=${playbacksSent} | Failures=${errors}`);
  }, 5000);

  setTimeout(() => {
    intervals.forEach(clearInterval);
    clearInterval(monitor);
    console.log('\n🏁 PRUEBA DE ESTRÉS FINALIZADA');
    console.log(`📈 RESULTADOS TOTALES DE LA SESIÓN:`);
    console.log(`   - Heartbeats (GPS) Exitosos: ${heartbeatsSent}`);
    console.log(`   - Playbacks (Analytics) Exitosos: ${playbacksSent}`);
    console.log(`   - Errores/Timeouts: ${errors}`);
    
    if (errors < (heartbeatsSent + playbacksSent) * 0.05) {
      console.log('✅ ESTADO: SISTEMA ESTABLE (Menos del 5% de error)');
    } else {
      console.log('⚠️ ESTADO: POSIBLE DEGRADACIÓN (Alta tasa de errores)');
    }
    process.exit(0);
  }, DURATION_MS);
}

run().catch(err => {
  console.error('CRITICAL_FAIL:', err.message);
  process.exit(1);
});
