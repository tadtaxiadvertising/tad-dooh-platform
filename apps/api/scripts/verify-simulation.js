
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 TAD SIMULATION VERIFIER - SRE DIAGNOSTIC REPORT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000);

    // 1. Connectivity Check
    const activeSimDevices = await prisma.device.count({
      where: {
        deviceId: { startsWith: 'STI' },
        lastSeen: { gte: fiveMinAgo }
      }
    });

    // 2. Telemetry Check (Heatmap Hit)
    const recentPoints = await prisma.driverLocation.count({
      where: {
        driverId: { startsWith: 'sim-driver-' },
        timestamp: { gte: fifteenMinAgo }
      }
    });

    // 3. Financial Event Check
    const recentPlaybacks = await prisma.playbackEvent.findMany({
      where: {
        deviceId: { startsWith: 'STI' },
        timestamp: { gte: fifteenMinAgo }
      },
      take: 5
    });

    const provisionedCount = await prisma.driver.count({
        where: { id: { startsWith: 'sim-driver-' } }
    });

    console.log('📊 [NETWORK STATUS]');
    console.log(`- Simulated Devices Provisioned: ${provisionedCount}`);
    console.log(`- Active Sources (Last 5m):     ${activeSimDevices} units`);
    console.log(`- Data Injection Rate:         ${(recentPoints / 15).toFixed(1)} pts/min (Global)`);
    console.log('');

    console.log('🔥 [HEATMAP ANALYSIS]');
    if (recentPoints > 0) {
      console.log('✅ SUCCESS: Heatmap data is actively hitting the database.');
    } else {
      console.log('❌ FAILURE: No recent telemetry detected. Heatmap will be EMPTY.');
    }
    console.log('');

    console.log('💰 [FINANCIAL INTEGRITY]');
    const highValueEvents = recentPlaybacks.filter(p => p.revenue >= 500).length;
    if (recentPlaybacks.length > 0) {
      console.log(`- Recent Playbacks: ${recentPlaybacks.length} events detected`);
      console.log(`- High-Value Trigger (RD$ 500): ${highValueEvents > 0 ? '✅ DETECTED' : '⚠️ NOT DETECTED YET'}`);
    } else {
      console.log('❌ No playback events processed in the last 15 minutes.');
    }
    console.log('');

    console.log('🏁 [FINAL VERDICT]');
    if (activeSimDevices > 0 && recentPoints > 0) {
      console.log('🟢 ENGINE IS OPERATIONAL: Coordinates are correctly impacting the Heatmap.');
    } else {
      console.log('🔴 ENGINE IS STALLED: Check simulator container logs or DATABASE_URL.');
    }

  } catch (error) {
    console.error('❌ DIAGNOSTIC CRASHED:', error.message);
  } finally {
    await prisma.$disconnect();
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
}

verify();
