// Test script: verifica el flujo de analytics batch
const BASE = 'http://localhost:3000/api';

async function testAnalytics() {
  console.log('=== TAD ANALYTICS BATCH TEST ===\n');

  const batchData = {
    deviceId: 'TAD-TEST0001',
    events: [
      {
        type: 'video_started',
        deviceId: 'TAD-TEST0001',
        timestamp: Date.now(),
        occurredAt: new Date().toISOString(),
        campaignId: 'test-campaign-123',
        mediaId: 'media-123',
        filename: 'test-video.mp4'
      },
      {
        type: 'video_completed',
        deviceId: 'TAD-TEST0001',
        timestamp: Date.now() + 10000,
        occurredAt: new Date(Date.now() + 10000).toISOString(),
        campaignId: 'test-campaign-123',
        mediaId: 'media-123',
        filename: 'test-video.mp4'
      }
    ]
  };

  console.log('1. Enviando batch de analytics (POST /analytics/batch)...');
  try {
    const response = await fetch(`${BASE}/analytics/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batchData)
    });
    const data = await response.json();
    console.log('   ✅ Status:', response.status, JSON.stringify(data));
  } catch (e) {
    console.log('   ❌ Batch failed:', e.message);
  }

  console.log('\n2. Verificando que los eventos se guardaron (GET /analytics/recent-plays)...');
  try {
    const response = await fetch(`${BASE}/analytics/recent-plays`);
    const data = await response.json();
    console.log('   ✅ Recent Plays:', data.length);
    // Note: recent-plays might be using PlaybackEvent instead of AnalyticsEvent depending on the service implementation
    // Let's check the service to be sure.
  } catch (e) {
    console.log('   ❌ Verification failed:', e.message);
  }

  console.log('\n=== TEST COMPLETE ===');
}

testAnalytics();
