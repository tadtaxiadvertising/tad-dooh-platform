
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDevices() {
  const devices = await prisma.device.findMany({
    where: { isSimulated: true },
    select: { deviceId: true, lastLat: true, lastLng: true, isOnline: true }
  });
  console.log('SIMULATED DEVICES COUNT:', devices.length);
  if (devices.length > 0) {
    console.log('SAMPLE DEVICES:', JSON.stringify(devices.slice(0, 3), null, 2));
  }
}

checkDevices().catch(e => console.error(e)).finally(() => prisma.$disconnect());
