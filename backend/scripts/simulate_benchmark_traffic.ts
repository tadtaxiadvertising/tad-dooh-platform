import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Coordenadas base: Santo Domingo
const BASE_LAT = 18.4861;
const BASE_LNG = -69.9312;

async function simulate() {
  console.log('📡 Iniciando simulación de tráfico para 20 dispositivos...');
  
  const devices = await prisma.device.findMany({
    where: { deviceId: { startsWith: 'TAD-DEV' } }
  });

  if (devices.length === 0) {
    console.error('❌ No se encontraron dispositivos con prefijo TAD-DEV. Ejecuta seed_benchmark primero.');
    return;
  }

  const campaigns = await prisma.campaign.findMany({ where: { status: 'ACTIVE' } });
  
  for (const device of devices) {
    // 1. Heartbeat
    await prisma.device.update({
      where: { id: device.id },
      data: {
        lastSeen: new Date(),
        isOnline: true,
        batteryLevel: Math.floor(Math.random() * 20) + 80, // 80-100%
        lastLat: BASE_LAT + (Math.random() - 0.5) * 0.05,
        lastLng: BASE_LNG + (Math.random() - 0.5) * 0.05,
        playerStatus: 'playing'
      }
    });

    // 2. Playback Events (1-3 events per device)
    if (campaigns.length > 0) {
      const numEvents = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < numEvents; i++) {
        const randomCampaign = campaigns[Math.floor(Math.random() * campaigns.length)];
        await prisma.playbackEvent.create({
          data: {
            deviceId: device.deviceId,
            videoId: randomCampaign.id,
            eventType: 'play_confirm',
            timestamp: new Date(),
            lat: device.lastLat || BASE_LAT,
            lng: device.lastLng || BASE_LNG,
          }
        });
        
        // Also record AnalyticsEvent for Dashboard stats
        await prisma.analyticsEvent.create({
           data: {
             deviceId: device.deviceId,
             eventType: 'impression',
             campaignId: randomCampaign.id,
             occurredAt: new Date(),
             eventData: JSON.stringify({ source: 'benchmark_simulation' })
           }
        });
      }
    }

    console.log(`✅ Telemetría enviada para: ${device.deviceId}`);
  }

  console.log('📊 Simulación completada. El Dashboard debería reflejar 20 unidades Online y nuevas impresiones.');
}

simulate().finally(() => prisma.$disconnect());
