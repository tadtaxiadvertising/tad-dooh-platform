const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding local development data...');

  // 1. Crear Chofer
  let driver = await prisma.driver.findFirst({
    where: { OR: [{ phone: '8090000000' }, { taxiPlate: 'A123456' }] }
  });

  if (!driver) {
    driver = await prisma.driver.create({
      data: {
        fullName: 'Arismendy Test',
        phone: '8090000000',
        licensePlate: 'T-LOCAL-01',
        taxiNumber: 'LOCAL-001',
        taxiPlate: 'A123456',
        status: 'ACTIVE',
        subscriptionPaid: true,
      },
    });
  }

  console.log('✅ Chofer creado:', driver.fullName);

  // 2. Crear Dispositivo
  const device = await prisma.device.upsert({
    where: { deviceId: 'TADSTI-001' },
    update: {},
    create: {
      deviceId: 'TADSTI-001',
      taxiNumber: 'LOCAL-001',
      city: 'Santiago',
      status: 'online',
    },
  });

  // Desvincular de cualquier otro chofer antes para evitar error de constraint Unique
  await prisma.driver.updateMany({
    where: { deviceId: device.deviceId },
    data: { deviceId: null }
  });

  // Vincular Chofer al Dispositivo (La FK está en Driver)
  await prisma.driver.update({
    where: { id: driver.id },
    data: { deviceId: device.deviceId }
  });

  console.log('✅ Dispositivo creado:', device.deviceId);

  // 3. Crear Suscripción (para evitar 402)
  const subscription = await prisma.subscription.upsert({
    where: { deviceId: 'TADSTI-001' },
    update: {
      status: 'ACTIVE',
      validUntil: new Date('2027-12-31'),
    },
    create: {
      deviceId: 'TADSTI-001',
      driverId: driver.id,
      plan: 'ANNUAL',
      amount: 6000,
      status: 'ACTIVE',
      dueDate: new Date('2027-12-31'),
      validUntil: new Date('2027-12-31'),
    },
  });

  // 4. Crear algunos eventos de analytics para que el dashboard no esté vacío
  const now = new Date();
  const mockEvents = [];
  for (let i = 0; i < 20; i++) {
    const occurredAt = new Date(now.getTime() - i * 15 * 60 * 1000); // Cada 15 min
    mockEvents.push({
      deviceId: device.deviceId,
      eventType: 'PLAYBACK_START',
      eventData: JSON.stringify({ videoId: 'mock-video-id', duration: 15 }),
      occurredAt,
    });
  }

  await prisma.analyticsEvent.createMany({
    data: mockEvents
  });

  console.log('✅ 20 eventos de reproducción creados.');

  // 5. Crear algunas ubicaciones históricas (hoy)
  const mockLocations = [];
  for (let i = 0; i < 50; i++) {
    const ts = new Date(now.getTime() - i * 60 * 1000); // Cada minuto
    mockLocations.push({
      driverId: driver.id,
      deviceId: device.deviceId,
      latitude: 18.4862 + (Math.random() - 0.5) * 0.01,
      longitude: -69.9312 + (Math.random() - 0.5) * 0.01,
      speed: 30 + Math.random() * 20,
      timestamp: ts,
    });
  }

  await prisma.driverLocation.createMany({
    data: mockLocations
  });

  console.log('✅ 50 ubicaciones históricas creadas.');

  console.log('🚀 Base de datos lista para pruebas locales.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
