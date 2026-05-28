const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Actualizando TODA la base de datos con datos realistas...');

  const now = new Date();
  const devices = await prisma.device.findMany({
    where: { deviceId: { startsWith: 'STI' } }
  });

  console.log(`📊 Procesando ${devices.length} dispositivos STI.`);

  for (const device of devices) {
    const playbacks = [];
    const analytics = [];
    const adsCount = 60 + Math.floor(Math.random() * 100); // 60-160 ads
    
    for (let j = 0; j < adsCount; j++) {
      const ts = new Date(now.getTime() - Math.random() * 48 * 60 * 60 * 1000); // Últimas 48h
      
      // 1. Playback Confirm (Para el contador principal de Impressions)
      playbacks.push({
        deviceId: device.deviceId,
        eventType: 'play_confirm',
        videoId: 'video-hq-01',
        timestamp: ts,
      });

      // 2. Algunos QR Scans (Para el CTR)
      if (Math.random() > 0.95) { // 5% de CTR
        analytics.push({
          deviceId: device.deviceId,
          eventType: 'QR_SCAN',
          campaignId: 'global-campaign',
          eventData: JSON.stringify({ source: 'tablet' }),
          occurredAt: ts,
        });
      }
    }
    
    // Batch inserts for performance
    await prisma.playbackEvent.createMany({ data: playbacks });
    if (analytics.length > 0) {
      await prisma.analyticsEvent.createMany({ data: analytics });
    }
  }

  console.log('✅ Base de datos actualizada: Impresiones, Scans y CTR ahora son realistas.');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
