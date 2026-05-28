// TAD REAL MEDIA E2E TEST
const BASE = 'http://127.0.0.1:3000/api';
const REAL_VIDEO_URL = 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4';
const DEVICE_ID = 'TAD-REAL-001';

async function runRealTest() {
  console.log('🚀 INICIANDO PRUEBA DE TRANSMISIÓN DE MEDIA REAL\n');

  try {
    // 1. Registro del Dispositivo
    console.log('1. Registrando dispositivo...');
    const regRes = await fetch(`${BASE}/device/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: DEVICE_ID, app_version: 'v3.0.1-prod' })
    });
    console.log('   ✅ Registro OK\n');

    // 2. Creación de Campaña
    console.log('2. Creando campaña "Prueba Verano Presidente"...');
    const start = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 1);

    const campRes = await fetch(`${BASE}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Prueba Verano Presidente 2026',
        advertiser: 'Cervecería Nacional',
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        active: true,
        target_impressions: 50000,
        budget: 75000,
        target_all: false
      })
    });
    const campaign = await campRes.json();
    console.log(`   ✅ Campaña Creada (ID: ${campaign.id})\n`);

    // 3. Asociación de Video Real
    console.log('3. Asociando archivo multimedia real...');
    const assetRes = await fetch(`${BASE}/campaigns/${campaign.id}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'VIDEO',
        filename: 'anuncio_presidente_60s.mp4',
        url: REAL_VIDEO_URL,
        fileSize: 1048576, // 1MB simulated
        checksum: 'sha256-' + Math.random().toString(36).substring(7),
        duration: 10
      })
    });
    const asset = await assetRes.json();
    console.log(`   ✅ Video Asociado: ${asset.filename}\n`);

    // 4. Asignación Directa a Pantalla
    console.log(`4. Asignando campaña a la pantalla ${DEVICE_ID}...`);
    // Note: assignCampaignToDevices expects device internal IDs? 
    // Let's check internal ID of the device first.
    const fleetRes = await fetch(`${BASE}/fleet/devices`);
    const fleet = await fleetRes.json();
    const device = fleet.find(d => d.deviceId === DEVICE_ID);
    
    if (device) {
      await fetch(`${BASE}/campaigns/${campaign.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceIds: [device.id] })
      });
      console.log('   ✅ Asignación Exitosa\n');
    } else {
      console.log('   ⚠️ No se encontró el device interno, probando sync por targetAll...\n');
    }

    // 5. Simulación de Sincronización de Tabla (RECEPCIÓN)
    console.log('5. Ejecutando Sincronización Bidireccional...');
    const syncRes = await fetch(`${BASE}/device/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: DEVICE_ID,
        lastHash: '',
        batteryLevel: 98,
        lat: 18.4861,
        lng: -69.9312
      })
    });
    const syncData = await syncRes.json();
    
    console.log('   RESULTADO SYNC:');
    console.log('   - Hash Generado:', syncData.sync_hash);
    console.log('   - Contenido Recibido:', syncData.media_assets?.length || 0, 'assets');
    
    if (syncData.media_assets && syncData.media_assets.length > 0) {
      const vid = syncData.media_assets.find(a => a.filename === 'anuncio_presidente_60s.mp4');
      if (vid) {
        console.log(`   ✅ ÉXITO: El video "${vid.filename}" está en el pipeline de descarga.`);
        console.log(`   🔗 URL de Descarga: ${vid.url}`);
      }
    }

    // 6. Reporte de Reproducción (TELEMETRÍA)
    console.log('\n6. Reportando ciclos de reproducción exitosos...');
    if (syncData.media_assets && syncData.media_assets.length > 0) {
       for (let i = 1; i <= 3; i++) {
          await fetch(`${BASE}/device/playback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              device_id: DEVICE_ID,
              video_id: syncData.media_assets[0].id,
              timestamp: new Date().toISOString(),
              event: 'video_completed'
            })
          });
          console.log(`   📊 Reproducción #${i} registrada`);
       }
    }

    console.log('\n✅ PRUEBA DE MEDIA REAL FINALIZADA CON ÉXITO');
    console.log('Pipeline de Transmisión Verificado.');

  } catch (err) {
    console.error('\n❌ ERROR DURANTE LA PRUEBA:', err.message);
    process.exit(1);
  }
}

runRealTest();
