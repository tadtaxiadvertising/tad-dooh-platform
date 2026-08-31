#!/usr/bin/env node
// TAD Simulator v2.0 — CLI stress-test tool for tablet telemetry endpoints

import { generateGPSPoint, generatePlaybackEvent, generateHeartbeat, API_URLS, VIDEO_IDS, SAMPLING_INTERVAL_GPS, SAMPLING_INTERVAL_PLAYBACK, SAMPLING_INTERVAL_HEARTBEAT, CONFIG } from './generators.js';
import axios from 'axios';

const { TABLET_COUNT, SIMULATION_DURATION_MINUTES, MAX_CONCURRENT, TABLET_KEY } = CONFIG;

const DEVICE_IDS = Array.from({ length: TABLET_COUNT }, (_, i) => `SIM-TAB-${String(i + 1).padStart(3, '0')}`);

let gpsSent = 0, gpsFail = 0;
let playbackSent = 0, playbackFail = 0;
let heartbeatSent = 0, heartbeatFail = 0;
let totalLatency = 0, latencySamples = 0;

const startTime = Date.now();
const durationMs = SIMULATION_DURATION_MINUTES * 60 * 1000;
let elapsed = 0;

function logStats() {
  elapsed = Math.floor((Date.now() - startTime) / 1000);
  const remaining = Math.max(0, Math.ceil((durationMs - elapsed * 1000) / 1000));
  const avgLatency = latencySamples > 0 ? (totalLatency / latencySamples).toFixed(0) : '0';
  console.log(
    `[${String(elapsed).padStart(4)}s] ` +
    `GPS:${gpsSent}/${gpsFail} ` +
    `Play:${playbackSent}/${playbackFail} ` +
    `HB:${heartbeatSent}/${heartbeatFail} ` +
    `| avg latency:${avgLatency}ms ` +
    `| remaining:${remaining}s`
  );
}

async function sendGPSBatch(deviceId) {
  const point = generateGPSPoint(deviceId);
  try {
    const start = Date.now();
    await axios.post(API_URLS.gps, [point], {
      headers: { 'X-Tablet-Key': TABLET_KEY, 'Content-Type': 'application/json' },
      timeout: 10000,
    });
    gpsSent++;
    trackLatency(Date.now() - start);
  } catch (e) {
    gpsFail++;
    if (gpsFail <= 3) console.error('GPS error:', e.message?.slice(0, 80));
  }
}

async function sendPlayback(deviceId) {
  const event = generatePlaybackEvent(deviceId);
  try {
    const start = Date.now();
    await axios.post(API_URLS.playback, [event], {
      headers: { 'X-Tablet-Key': TABLET_KEY, 'Content-Type': 'application/json' },
      timeout: 10000,
    });
    playbackSent++;
    trackLatency(Date.now() - start);
  } catch (e) {
    playbackFail++;
  }
}

async function sendHeartbeat(deviceId) {
  const hb = generateHeartbeat(deviceId);
  try {
    await axios.post(API_URLS.heartbeat, hb, {
      headers: { 'X-Tablet-Key': TABLET_KEY, 'Content-Type': 'application/json' },
      timeout: 5000,
    });
    heartbeatSent++;
  } catch (e) {
    heartbeatFail++;
  }
}

function trackLatency(ms) {
  totalLatency += ms;
  latencySamples++;
}

// Run all devices in parallel per interval with p-limit
async function withConcurrency(items, fn) {
  const queue = [...items];
  const workers = Array.from({ length: MAX_CONCURRENT }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (item) await fn(item);
    }
  });
  await Promise.all(workers);
}

async function main() {
  console.log('🚀 TAD Simulator v2.0 starting...');
  console.log(`   Tablets: ${TABLET_COUNT} | Concurrent: ${MAX_CONCURRENT} | Duration: ${SIMULATION_DURATION_MINUTES} min`);
  console.log(`   GPS: ${API_URLS.gps}`);
  console.log(`   Playback: ${API_URLS.playback}`);
  console.log(`   Heartbeat: ${API_URLS.heartbeat}\n`);

  // GPS loop
  const gpsTimer = setInterval(() => {
    withConcurrency(DEVICE_IDS, sendGPSBatch);
  }, SAMPLING_INTERVAL_GPS);

  // Playback loop
  const playbackTimer = setInterval(() => {
    withConcurrency(DEVICE_IDS, sendPlayback);
  }, SAMPLING_INTERVAL_PLAYBACK);

  // Heartbeat loop
  const heartbeatTimer = setInterval(() => {
    withConcurrency(DEVICE_IDS, sendHeartbeat);
  }, SAMPLING_INTERVAL_HEARTBEAT);

  // Stats display
  const statsTimer = setInterval(logStats, 2000);

  // Stop after duration
  setTimeout(() => {
    clearInterval(gpsTimer);
    clearInterval(playbackTimer);
    clearInterval(heartbeatTimer);
    clearInterval(statsTimer);
    console.log('\n🛑 Simulation complete.');
    logStats();
    process.exit(0);
  }, durationMs);

  // Ctrl+C handler
  process.on('SIGINT', () => {
    clearInterval(gpsTimer);
    clearInterval(playbackTimer);
    clearInterval(heartbeatTimer);
    clearInterval(statsTimer);
    console.log('\n🛑 Simulation stopped by user.');
    logStats();
    process.exit(0);
  });
}

main();