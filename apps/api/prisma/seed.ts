import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding with Campaigns...');

  const hashedPassword = await bcrypt.hash('tad12345', 10);

  // 1. Create ADMIN User
  await prisma.user.upsert({
    where: { email: 'admin@tadtaxi.com' },
    update: {},
    create: {
      email: 'admin@tadtaxi.com',
      name: 'TAD Admin Master',
      role: 'ADMIN',
      password: hashedPassword,
    },
  });

  // 2. Create 5 Advertisers and their Campaigns
  const advertisersData = [
    { name: 'Banco TAD', email: 'contacto@bancotad.com.do', campaignName: 'Préstamos Flash 2026', category: 'Finanzas' },
    { name: 'TAD Beverages', email: 'marketing@tadbeverage.do', campaignName: 'Refrescante TAD Verano', category: 'Consumo' },
    { name: 'Telco TAD', email: 'soporte@tadtel.com', campaignName: 'Fibra Óptica 1Gbps', category: 'Tecnología' },
    { name: 'Supermercados TAD', email: 'ventas@supermercados-tad.do', campaignName: 'Ofertas del Fin de Semana', category: 'Retail' },
    { name: 'Energía TAD', email: 'info@tadenegia.do', campaignName: 'Paneles Solares TAD', category: 'Energía' },
  ];

  const now = new Date();
  const nextMonth = new Date();
  nextMonth.setMonth(now.getMonth() + 1);

  for (const advData of advertisersData) {
    const advertiser = await prisma.advertiser.upsert({
      where: { email: advData.email },
      update: {},
      create: {
        companyName: advData.name,
        contactName: advData.name.replace('TAD', 'Manager'),
        email: advData.email,
        phone: '809-555-' + Math.floor(1000 + Math.random() * 9000),
        status: 'ACTIVE',
        password: hashedPassword,
        category: advData.category,
      },
    });

    // Create a Campaign for each Advertiser
    const campaign = await prisma.campaign.create({
      data: {
        name: advData.campaignName,
        advertiser: advertiser.companyName,
        advertiserId: advertiser.id,
        description: `Campaña publicitaria de alto impacto para ${advData.name}.`,
        status: 'ACTIVE',
        active: true,
        startDate: now,
        endDate: nextMonth,
        targetCity: Math.random() > 0.5 ? 'Santo Domingo' : 'Santiago',
        targetImpressions: 50000,
        budget: 25000,
        category: advData.category,
        priority: 1,
      },
    });

    // Add 1 Media Asset per campaign
    await prisma.mediaAsset.create({
      data: {
        campaignId: campaign.id,
        type: 'VIDEO',
        filename: `${advData.name.toLowerCase().replace(' ', '_')}_promo.mp4`,
        url: `https://storage.tadtaxi.do/media/${campaign.id}.mp4`,
        fileSize: 15240000,
        checksum: 'md5_' + Math.random().toString(36).substring(7),
        duration: 15,
        qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://tadtaxi.do/c/${campaign.id}`,
      },
    });
  }

  // 3. Create 10 Drivers and 10 Devices
  const driversData = [
    { name: 'Juan Manuel Perez', phone: '8294441111' },
    { name: 'Maria Altagracia Garcia', phone: '8294442222' },
    { name: 'Jose Antonio Rodriguez', phone: '8294443333' },
    { name: 'Francisca Elena Santos', phone: '8294444444' },
    { name: 'Luis Emilio Vargas', phone: '8294445555' },
    { name: 'Ana Patricia Lopez', phone: '8294446666' },
    { name: 'Carlos David Torres', phone: '8294447777' },
    { name: 'Ramona Isabel Nuñez', phone: '8294448888' },
    { name: 'Pedro Julio Guerrero', phone: '8294449999' },
    { name: 'Marta Cecilia Morel', phone: '8294440000' },
  ];

  for (let i = 0; i < driversData.length; i++) {
    const driver = await prisma.driver.upsert({
      where: { phone: driversData[i].phone },
      update: {},
      create: {
        fullName: driversData[i].name,
        phone: driversData[i].phone,
        cedula: '001-' + Math.floor(1000000 + Math.random() * 9000000) + '-0',
        taxiNumber: 'TX-' + (i + 1).toString().padStart(3, '0'),
        status: 'ACTIVE',
        password: hashedPassword,
        onboardingStatus: 'COMPLETED',
        contractAccepted: true,
      },
    });

    const devId = `TAD-DEV-${(i + 1).toString().padStart(3, '0')}`;
    await prisma.device.upsert({
      where: { deviceId: devId },
      update: { driverId: driver.id },
      create: {
        deviceId: devId,
        name: `Tablet de ${driver.fullName}`,
        status: 'ACTIVE',
        isOnline: true,
        batteryLevel: 95,
        city: i % 2 === 0 ? 'Santo Domingo' : 'Santiago',
        driverId: driver.id,
        appVersion: '2.1.0',
      },
    });
  }

  console.log('✅ Seeding complete with Campaigns! credentials for all: password = tad12345');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
