
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const devices = await prisma.device.findMany({
    where: {
      deviceId: { contains: 'STI' }
    },
    select: {
      deviceId: true,
      lastLat: true,
      lastLng: true,
      isOnline: true,
      taxiNumber: true
    }
  });

  console.log('--- Devices with STI prefix ---');
  console.log('Total count:', devices.length);
  
  const withGps = devices.filter(d => d.lastLat && d.lastLng);
  console.log('With GPS:', withGps.length);
  
  if (withGps.length > 0) {
    console.log('Sample with GPS:', withGps[0]);
  } else {
    console.log('NO DEVICES HAVE GPS COORDINATES');
  }

  const simulated = devices.filter(d => d.deviceId.includes('-'));
  console.log('Simulated (with hyphen):', simulated.length);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
