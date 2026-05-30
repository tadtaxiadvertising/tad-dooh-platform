const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Prepare Driver
  const driverId = '0b002cbb-e6bf-48ea-9a81-38cb61e84ab6'; // Simulated Driver 20
  await prisma.driver.update({
    where: { id: driverId },
    data: { subscriptionPaid: true, status: 'ACTIVE' }
  });
  console.log('✅ Driver Updated (Paid & Active)');

  // 2. Find/Create Device
  let device = await prisma.device.findFirst({ where: { driverId } });
  if (!device) {
    device = await prisma.device.create({
      data: {
        deviceId: 'TEST-DEV-20',
        driverId: driverId,
        status: 'ACTIVE'
      }
    });
    console.log('✅ Created New Device linked to Driver');
  } else {
    console.log('✅ Found existing Device:', device.deviceId);
  }

  console.log('Ready for test with:');
  console.log('DRIVER_ID:', driverId);
  console.log('DEVICE_ID:', device.deviceId);

  await prisma.$disconnect();
}

main();
