const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const deviceId = 'TAD-DEV-009B';
  const device = await prisma.device.findUnique({
    where: { deviceId },
    include: { driver: true }
  });
  
  if (!device) return console.log('Device not found');
  
  const now = new Date();
  const campaigns = await prisma.campaign.findMany({
    where: { active: true },
    include: { mediaAssets: true, media: true, videos: true, targets: true, devices: true, targetDrivers: true }
  });
  
  console.log(`Analyzing ${campaigns.length} total active campaigns for ${deviceId}`);
  
  for (const c of campaigns) {
    const isGlobal = c.targetAll || c.isGlobal || c.targetCity === 'Global';
    const hasLegacyTarget = c.targets.some(t => t.deviceId === deviceId);
    const hasV2Target = c.devices.some(d => d.device_id === device.id);
    const hasDriverTarget = device.driverId && c.targetDrivers.some(d => d.id === device.driverId);
    
    if (isGlobal || hasLegacyTarget || hasV2Target || hasDriverTarget) {
      const assetsCount = (c.mediaAssets?.length || 0) + (c.media?.length || 0) + (c.videos?.length || 0);
      console.log(`\nMATCH: "${c.name}" [${c.id}]`);
      console.log(`   Criteria: Global=${isGlobal}, LegacyRec=${hasLegacyTarget}, V2Device=${hasV2Target}, DriverMap=${hasDriverTarget}`);
      console.log(`   Assets: ${assetsCount}`);
      console.log(`   Dates: ${c.startDate.toISOString()} to ${c.endDate.toISOString()}`);
      if (now < c.startDate || now > c.endDate) console.log(`   ⚠️ NOW (${now.toISOString()}) is OUTSIDE this range!`);
    }
  }
}

main().finally(() => prisma.$disconnect());
