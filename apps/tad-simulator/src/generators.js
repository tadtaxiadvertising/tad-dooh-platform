// TAD Simulator v2.0.0 — Generators
// Load testing CLI tool for stress-testing tablet telemetry endpoints

const SAMPLING_INTERVAL_GPS = 5000; // 5s between GPS batches
const SAMPLING_INTERVAL_PLAYBACK = 30000; // 30s between playback events
const SAMPLING_INTERVAL_HEARTBEAT = 60000; // 60s between heartbeats

const API_BASE = process.env.TAD_SIMULATOR_API_URL || 'http://localhost:3000/api/v1';

export const CONFIG = {
  API_BASE,
  TABLET_COUNT: parseInt(process.env.TABLET_COUNT || '10', 10),
  SIMULATION_DURATION_MINUTES: parseInt(process.env.SIMULATION_DURATION_MINUTES || '5', 10),
  MAX_CONCURRENT: parseInt(process.env.MAX_CONCURRENT || '5', 10),
  TABLET_KEY: process.env.TAD_TABLET_KEY?.trim() || null,
  IS_SIMULATED: process.env.IS_SIMULATED !== 'false',
};

const API_URLS = {
  gps: `${API_BASE}/telemetry/sync`,
  playback: `${API_BASE}/telemetry/playback-batch`,
  heartbeat: `${API_BASE}/device/heartbeat`,
};

const VIDEO_IDS = ['VID-001', 'VID-002', 'VID-003', 'VID-004', 'VID-005'];

function generateGPSPoint(deviceId) {
  return {
    driverId: `SIM-${deviceId}`,
    lat: 18.47 + Math.random() * 0.06,
    lng: -69.95 + Math.random() * 0.12,
    speed: Math.random() * 60,
    timestamp: new Date(Date.now() - Math.random() * 60000).toISOString(),
  };
}

function generatePlaybackEvent(deviceId) {
  return {
    deviceId,
    videoId: VIDEO_IDS[Math.floor(Math.random() * VIDEO_IDS.length)],
    eventType: 'play_confirm',
    lat: 18.47 + Math.random() * 0.06,
    lng: -69.95 + Math.random() * 0.12,
    clientTimestamp: new Date().toISOString(),
    isSimulated: true,
  };
}

function generateHeartbeat(deviceId) {
  return {
    deviceId,
    battery: Math.floor(Math.random() * 81) + 20,
    network: '4G',
  };
}

export {
  generateGPSPoint, generatePlaybackEvent, generateHeartbeat,
  API_URLS, VIDEO_IDS,
  SAMPLING_INTERVAL_GPS, SAMPLING_INTERVAL_PLAYBACK, SAMPLING_INTERVAL_HEARTBEAT,
};
