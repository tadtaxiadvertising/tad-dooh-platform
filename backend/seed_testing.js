const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding production-ready test data...');

  // 1. Crear Device
  const device = await prisma.device.upsert({
    where: { deviceId: 'TAD-TEST-001' },
    update: {},
    create: {
      deviceId: 'TAD-TEST-001',
      name: 'Taxi Test 1',
      status: 'ONLINE',
      city: 'Santo Domingo',
    }
  });

  // 2. Crear Driver
  const driver = await prisma.driver.upsert({
    where: { id: 'test-driver-id' },
    update: { deviceId: device.deviceId },
    create: {
      id: 'test-driver-id',
      fullName: 'Juan Perez Test',
      phone: '809-000-0000',
      taxiPlate: 'A123456',
      taxiNumber: 'BC123',
      deviceId: device.deviceId,
      status: 'ACTIVE'
    }
  });

  // 3. Crear Campaña
  const campaign = await prisma.campaign.create({
    data: {
      name: 'Campaña Coca-Cola Test',
      advertiser: 'Coca-Cola',
      status: 'ACTIVE',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      budget: 50000,
    }
  });

  // 4. Vincular (Usando los IDs internos UUID)
  await prisma.deviceCampaign.create({
    data: {
      device_id: device.id,
      campaign_id: campaign.id
    }
  });

  console.log('✅ Seed successful!');
}

seed().catch(e => console.error(e)).finally(() => prisma.$disconnect());
