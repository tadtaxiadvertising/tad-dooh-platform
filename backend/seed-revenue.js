const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('📈 Generando datos de facturación (PlaybackEvents) para la flota STI...');

  const devices = await prisma.device.findMany({
    where: { deviceId: { startsWith: 'STI' } }
  });

  const now = new Date();
  
  for (const device of devices) {
    const playbacks = [];
    const adsCount = 50 + Math.floor(Math.random() * 80); // 50-130 anuncios
    
    for (let j = 0; j < adsCount; j++) {
      playbacks.push({
        deviceId: device.deviceId,
        eventType: 'PLAYBACK_COMPLETED',
        videoId: 'video-seed-v1', // Requerido por el esquema
        timestamp: new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000),
      });
    }
    
    await prisma.playbackEvent.createMany({
       data: playbacks
    });
  }

  console.log('✅ Visualización de ingresos (Revenue) corregida para toda la flota STI.');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
