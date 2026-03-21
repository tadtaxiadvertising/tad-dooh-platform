const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSyncData() {
  console.log('--- AUDITORÍA DE SINCRONIZACIÓN ---');
  
  const campaigns = await prisma.campaign.findMany({
    where: { active: true },
    include: { _count: { select: { media: true, mediaAssets: true } } }
  });
  
  console.log(`Campañas Activas: ${campaigns.length}`);
  campaigns.forEach(c => {
    console.log(`- [${c.id}] ${c.name} | Global: ${c.targetAll || c.isGlobal} | Media: ${c._count.media + c._count.mediaAssets}`);
  });

  const devices = await prisma.device.findMany({
    include: { driver: true }
  });
  
  console.log(`\nDispositivos: ${devices.length}`);
  devices.forEach(d => {
    console.log(`- [${d.deviceId}] ${d.taxiNumber} | Driver: ${d.driver?.fullName || 'N/A'}`);
  });
}

checkSyncData().catch(console.error).finally(() => prisma.$disconnect());
