const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const deviceId = 'TAD-DEV-009B';
  console.log(`Checking campaigns for device: ${deviceId}`);
  
  const device = await prisma.device.findUnique({
    where: { deviceId },
    include: { driver: true }
  });
  
  if (!device) {
    console.log('Device not found');
    return;
  }
  
  console.log(`Device UUID: ${device.id}`);
  console.log(`Driver ID: ${device.driverId || 'none'}`);
  
  const now = new Date();
  const campaigns = await prisma.campaign.findMany({
    where: {
      active: true,
      OR: [
        { targetAll: true },
        { devices: { some: { device_id: device.id } } },
        { targets: { some: { deviceId } } },
        ...(device.driverId ? [{ targetDrivers: { some: { id: device.driverId } } }] : [])
      ]
    },
    include: {
      mediaAssets: true,
      media: true,
      videos: true
    }
  });
  
  console.log(`Found ${campaigns.length} campaigns`);
  campaigns.forEach(c => {
    const assetsCount = (c.mediaAssets?.length || 0) + (c.media?.length || 0) + (c.videos?.length || 0);
    console.log(`- Campaign: "${c.name}" [${c.id}] | Active: ${c.active} | Assets: ${assetsCount}`);
    console.log(`  TargetAll: ${c.targetAll} | IsGlobal: ${c.isGlobal}`);
    
    // Check match criteria
    const isGlobal = c.targetAll || c.isGlobal;
    const isDirect = (c as any).deviceId === deviceId; // Legacy
    const isV2Uuid = false; // Need to check devices relation
    
    console.log(`  Dates: ${c.startDate} to ${c.endDate}`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
