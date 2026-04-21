
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runDirectSimulation() {
  console.log('--- Direct Simulation Test ---');
  
  // Simulation params
  const config = {
    name: 'Manual Test Santiago',
    activeNodes: 10,
    centerLat: 19.4517,
    centerLng: -70.697,
    radiusKm: 5,
    minSpeed: 20,
    maxSpeed: 50,
    anomalyRate: 0.05
  };

  const paddedId = '9999'; // Test with a specific ID
  const deviceId = `STI-SIM-${paddedId}`;
  const driverId = `SIM_DRV_${paddedId}`;
  const taxiNumber = `TX-${paddedId}`;

  console.log(`Setting up device ${deviceId}...`);
  
  await prisma.driver.upsert({
    where: { id: driverId },
    update: { isSimulated: true, status: 'ACTIVE' },
    create: {
      id: driverId,
      fullName: 'Manual Test Driver',
      phone: '+10009999',
      licensePlate: 'TEST-9999',
      isSimulated: true,
      status: 'ACTIVE'
    }
  });

  await prisma.device.upsert({
    where: { deviceId },
    update: { isSimulated: true, status: 'ACTIVE', taxiNumber },
    create: {
      deviceId,
      name: 'Manual Test Screen',
      isSimulated: true,
      status: 'ACTIVE',
      driverId,
      taxiNumber,
      city: 'Santiago'
    }
  });

  console.log('Generating motion...');
  const lat = config.centerLat + 0.01;
  const lng = config.centerLng + 0.01;

  await prisma.device.update({
    where: { deviceId },
    data: {
      lastLat: lat,
      lastLng: lng,
      lastSeen: new Date(),
      isOnline: true
    }
  });

  console.log('Verifying DB update...');
  const dev = await prisma.device.findUnique({ where: { deviceId } });
  console.log('Device Data:', {
    deviceId: dev.deviceId,
    lastLat: dev.lastLat,
    lastLng: dev.lastLng,
    taxiNumber: dev.taxiNumber
  });

  if (dev.lastLat === lat && dev.lastLng === lng && dev.taxiNumber === taxiNumber) {
    console.log('SUCCESS: Simulation logic verified in DB');
  } else {
    console.log('FAILURE: DB mismatch');
  }
}

runDirectSimulation()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
