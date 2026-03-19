
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedTestSantiago() {
  console.log('🚀 Iniciando Configuración: Campaña de Prueba Santiago (STI)...');

  // 1. Obtener un Anunciante de Santiago
  const advertiser = await prisma.advertiser.findFirst({
    where: { companyName: { contains: 'Santiago' } }
  });

  if (!advertiser) {
    console.error('❌ No se encontró un anunciante de Santiago. Ejecuta el seed de Santiago primero.');
    return;
  }

  // 2. Crear la Campaña
  const campaign = await prisma.campaign.upsert({
    where: { id: 'promo-santiago-test-2026' },
    update: {},
    create: {
      id: 'promo-santiago-test-2026',
      name: 'PROMO SANTIAGO: VERANO NXS 2026',
      advertiser: advertiser.companyName,
      advertiserId: advertiser.id,
      status: 'ACTIVE',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
      targetCity: 'Santiago',
      targetCities: JSON.stringify(['Santiago']),
      targetImpressions: 500000,
      budget: 150000,
      targetUrl: 'https://tad.do/promo-sti'
    }
  });
  console.log(`✅ Campaña "${campaign.name}" creada.`);

  // 3. Seleccionar 50 Choferes de Santiago
  const drivers = await prisma.driver.findMany({
    where: { device: { city: 'Santiago' } },
    take: 50,
    include: { device: true }
  });

  console.log(`📦 Asignando campaña a ${drivers.length} unidades Nexus...`);

  for (const driver of drivers) {
    if (driver.device) {
      await prisma.deviceCampaign.upsert({
        where: {
          device_id_campaign_id: {
            device_id: driver.device.id,
            campaign_id: campaign.id
          }
        },
        update: {},
        create: {
          device_id: driver.device.id,
          campaign_id: campaign.id
        }
      });
    }
  }

  // 4. Generar Métricas Falsas de Santiago
  console.log('📊 Inyectando métricas de Telemetría (Heartbeats & Playbacks)...');
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    await prisma.campaignMetric.upsert({
      where: {
        campaignId_date_city: {
          campaignId: campaign.id,
          date: new Date(date.toISOString().split('T')[0]),
          city: 'Santiago'
        }
      },
      update: {},
      create: {
        campaignId: campaign.id,
        date: new Date(date.toISOString().split('T')[0]),
        city: 'Santiago',
        totalImpressions: Math.floor(15000 + Math.random() * 5000),
        totalCompletions: Math.floor(14000 + Math.random() * 4000),
        uniqueDevices: 45 + Math.floor(Math.random() * 5)
      }
    });
  }

  console.log('\n======================================================');
  console.log('🎉 CAMPAÑA SANTIAGO ACTIVA Y MONITOREABLE');
  console.log('======================================================');
}

seedTestSantiago()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
