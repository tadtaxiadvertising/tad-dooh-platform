
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';
const NUM_DEVICES = 100;
const DURATION_MS = 60000;
const HEARTBEAT_INTERVAL = 10000; // Lo aumentamos a 10s para ver si fluye
const PLAYBACK_INTERVAL = 12000; // Lo aumentamos a 12s

console.log('🚀 INICIANDO PRUEBA DE ESTRÉS - TAD PLATFORM (V4 STAGGERED)');
console.log(`📊 Dispositivos: ${NUM_DEVICES} | Duración: ${DURATION_MS/1000}s`);

async function run() {
  const devices = Array.from({ length: NUM_DEVICES }, (_, i) => `STRESS_DEVICE_${i}`);

  console.log('📝 Registrando 100 dispositivos...');
  // Los registramos en bloques de 10 para no saturar el pooler de una vez
  for (let i = 0; i < devices.length; i += 10) {
    const chunk = devices.slice(i, i + 10);
    await Promise.allSettled(chunk.map(did => 
      axios.post(`${API_BASE}/device/register`, {
        device_id: did,
        app_version: '5.4-stress',
        model: 'StressV4'
      }, { timeout: 5000 })
    ));
    process.stdout.write('.');
  }
  console.log('\n✅ Registro completado. Iniciando tráfico escalonado...');

  let heartbeatsSent = 0;
  let playbacksSent = 0;
  let errors = 0;
  const startTime = Date.now();
  const intervals = [];

  devices.forEach((did, index) => {
    // Escalonamos la entrada de cada dispositivo 200ms uno de otro -> 100 * 200ms = 20s para entrar todos
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
          }, { timeout: 4000 });
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
          }, { timeout: 4000 });
          playbacksSent++;
        } catch (e) {
          errors++;
        }
      }, PLAYBACK_INTERVAL);

      intervals.push(hInterval, pInterval);
    }, index * 200); 
  });

  const monitor = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    console.log(`⏱  [${elapsed}s] Sent: HB=${heartbeatsSent} | PB=${playbacksSent} | Errors=${errors}`);
  }, 5000);

  setTimeout(() => {
    intervals.forEach(clearInterval);
    clearInterval(monitor);
    console.log('\n🏁 PRUEBA DE ESTRÉS FINALIZADA');
    console.log(`📈 RESULTADOS (100 Devs / Con limit=25):`);
    console.log(`   - Exitosa: HB=${heartbeatsSent}, PB=${playbacksSent}`);
    console.log(`   - Fallida: ${errors}`);
    process.exit(0);
  }, DURATION_MS + 25000); // Damos margen para que entren todos
}

run();
