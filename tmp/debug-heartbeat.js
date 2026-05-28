
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';
const NUM_DEVICES = 10; // Reducimos para debuggear
const DURATION_MS = 10000;

async function run() {
  const did = 'DEBUG_DEVICE_99';
  console.log('🔍 PROBANDO UN SOLO HEARTBEAT Y REGISTRO...');
  
  try {
    const reg = await axios.post(`${API_BASE}/device/register`, {
      device_id: did,
      app_version: 'debug-1.0'
    });
    console.log('✅ REGISTRO OK:', reg.status);
    
    const hb = await axios.post(`${API_BASE}/device/heartbeat`, {
      device_id: did,
      battery_level: 50,
      player_status: 'debug',
      lat: 18.0,
      lng: -69.0,
      timestamp: new Date().toISOString()
    });
    console.log('✅ HEARTBEAT OK:', hb.status);

  } catch (e) {
    console.error('❌ ERROR DETECTADO:');
    if (e.response) {
      console.error('Status:', e.response.status);
      console.error('Data:', JSON.stringify(e.response.data));
    } else {
      console.error('Message:', e.message);
    }
  }
}

run();
