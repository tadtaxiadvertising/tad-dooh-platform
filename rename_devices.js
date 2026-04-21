const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting device renaming process...');
  
  const devices = await prisma.device.findMany({
    orderBy: { createdAt: 'asc' }
  });
  
  console.log(`Found ${devices.length} devices to rename.`);
  
  for (let i = 0; i < devices.length; i++) {
    const oldId = devices[i].deviceId;
    const newId = `STI${String(i + 1).padStart(3, '0')}`;
    const uuid = devices[i].id;
    
    if (oldId === newId) {
      console.log(`Device ${uuid} already has name ${newId}, skipping.`);
      continue;
    }
    
    console.log(`Renaming ${oldId} -> ${newId} (UUID: ${uuid})`);
    
    // We update the record by UUID which is the immutable primary key in Prisma logic (mostly)
    // But since deviceId is used as a foreign key in some tables, we need to be careful.
    
    try {
      await prisma.$transaction([
        // 1. Update the device itself
        prisma.device.update({
          where: { id: uuid },
          data: { 
            deviceId: newId,
            taxiNumber: newId 
          }
        }),
        // 2. Update related tables that use deviceId as a STRING reference
        prisma.deviceHeartbeat.updateMany({ where: { deviceId: oldId }, data: { deviceId: newId } }),
        prisma.playbackEvent.updateMany({ where: { deviceId: oldId }, data: { deviceId: newId } }),
        prisma.analyticsEvent.updateMany({ where: { deviceId: oldId }, data: { deviceId: newId } }),
        prisma.playlistItem.updateMany({ where: { deviceId: oldId }, data: { deviceId: newId } }),
      ]);
      console.log(`✅ ${oldId} successfully renamed to ${newId}`);
    } catch (error) {
      console.error(`❌ Failed to rename ${oldId}:`, error.message);
    }
  }
  
  console.log('Renaming process complete.');
}

main().finally(() => prisma.$disconnect());
