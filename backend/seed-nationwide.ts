const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedNationwide() {
  console.log('🚀 Iniciando Ingesta Masiva: Plataforma Nacional (SDQ, STI, PUJ, POP)...');

  // 1. Limpiar la BD
  console.log('🧹 Limpiando base de datos existente...');
  await prisma.campaignMetric.deleteMany();
  await prisma.deviceCampaign.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.advertiser.deleteMany();
  await prisma.driver.deleteMany();
  
  // Clean related events before device
  if (prisma.analyticsEvent) await prisma.analyticsEvent.deleteMany();
  if (prisma.deviceLog) await prisma.deviceLog.deleteMany();
  
  await prisma.device.deleteMany();
  await prisma.fleet.deleteMany();

  // 2. Crear Regiones & Flotas
  const regions = [
    { city: 'Santo Domingo', code: 'SDQ', count: 40 },
    { city: 'Santiago', code: 'STI', count: 30 },
    { city: 'Punta Cana', code: 'PUJ', count: 20 },
    { city: 'Puerto Plata', code: 'POP', count: 10 },
  ];

  const firstNames = ['Juan', 'José', 'Luis', 'Pedro', 'Carlos', 'Manuel', 'Ricardo', 'Fernando', 'Miguel', 'Andrés', 'Ramón', 'Santiago', 'David', 'Jorge', 'Héctor', 'Raúl', 'Ángel', 'Javier', 'Oscar', 'Wellington'];
  const lastNames = ['Rodríguez', 'González', 'Hernández', 'García', 'Pérez', 'Martínez', 'López', 'Sánchez', 'Ramírez', 'Díaz', 'Vásquez', 'Castillo', 'Moreno', 'Rosario', 'Espinal', 'Valdez', 'Cruz', 'Mendoza', 'Ferreira', 'Batista'];

  const allDeviceIds = [];
  const allAdvertisers = [];

  for (const region of regions) {
    console.log(`📍 Configurando ${region.city} (${region.count} pantallas)...`);
    
    const fleetName = `Central Taxis ${region.city}`;
    await prisma.fleet.create({ data: { name: fleetName, city: region.city } });

    // Conductores & Pantallas
    for (let i = 1; i <= region.count; i++) {
       const fullName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
       const deviceId = `${region.code}${i.toString().padStart(4, '0')}`;
       allDeviceIds.push(deviceId);

       const device = await prisma.device.create({
          data: {
             deviceId,
             status: 'ONLINE',
             city: region.city,
             lastLat: region.code === 'SDQ' ? 18.4861 + (Math.random() - 0.5)*0.1 : region.code === 'STI' ? 19.4517 + (Math.random() - 0.5)*0.1 : region.code === 'PUJ' ? 18.5820 + (Math.random() - 0.5)*0.1 : 19.7808 + (Math.random() - 0.5)*0.1,
             lastLng: region.code === 'SDQ' ? -69.9312 + (Math.random() - 0.5)*0.1 : region.code === 'STI' ? -70.6970 + (Math.random() - 0.5)*0.1 : region.code === 'PUJ' ? -68.4055 + (Math.random() - 0.5)*0.1 : -70.6871 + (Math.random() - 0.5)*0.1,
             isOnline: true,
             fleet: fleetName,
             batteryLevel: 60 + Math.floor(Math.random() * 40)
          }
       });

       await prisma.driver.create({
          data: {
             fullName,
             cedula: `031-${Math.floor(1000000 + Math.random() * 9000000)}-${Math.floor(Math.random() * 9)}`,
             phone: `809-${region.code}-${i.toString().padStart(4, '0')}`,
             licensePlate: `A${Math.floor(100000 + Math.random() * 900000)}`,
             taxiPlate: `TP-${Math.floor(1000 + Math.random() * 9000)}`,
             taxiNumber: deviceId, // Direct mapping ID => Taxi
             deviceId: device.deviceId,
             subscriptionPaid: Math.random() > 0.2,
             status: 'ACTIVE'
          }
       });
    }

    // Anunciantes
    const bizTypes = ['Restaurante', 'Centro Médico', 'Supermercado', 'Inmobiliaria'];
    for (let j = 1; j <= 5; j++) {
       const companyName = `${bizTypes[Math.floor(Math.random() * bizTypes.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]} ${region.city}`;
       const ad = await prisma.advertiser.create({
         data: {
           companyName,
           contactName: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
           email: `contacto${j}@${companyName.toLowerCase().replace(/\s+/g, '')}.com`,
           phone: `829444${Math.floor(1000 + Math.random() * 9000)}`,
           status: 'ACTIVE'
         }
       });
       allAdvertisers.push({ ...ad, city: region.city });
    }
  }

  console.log('✅ Conductores, Pantallas y Anunciantes generados.');
  console.log('⚙️ Asignando Campañas Globales y Regionales...');

  // 3. Crear Campañas (1 Nacional, 4 Regionales)
  const campaignsArgs = [
    { id: 'camp-nacional-2026', name: 'PROMO NACIONAL PRESIDENTE', targetCity: 'Global', budget: 500000 },
    ...regions.map(r => ({ id: `camp-${r.code.toLowerCase()}-2026`, name: `PROMO REGIONAL ${r.city.toUpperCase()}`, targetCity: r.city, budget: 100000 }))
  ];

  for (const c of campaignsArgs) {
     const ad = allAdvertisers.find(a => c.targetCity === 'Global' || a.city === c.targetCity) || allAdvertisers[0];
     
     const campaign = await prisma.campaign.create({
        data: {
           id: c.id,
           name: c.name,
           advertiser: ad.companyName,
           advertiserId: ad.id,
           status: 'ACTIVE',
           startDate: new Date(),
           endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
           targetCity: c.targetCity,
           targetCities: JSON.stringify(c.targetCity === 'Global' ? [] : [c.targetCity]),
           targetImpressions: c.budget * 2,
           budget: c.budget,
           targetUrl: `https://tad.do/promo-${c.id}`
        }
     });

     // Asignar pantallas
     const devicesToAssign = c.targetCity === 'Global' 
        ? await prisma.device.findMany() 
        : await prisma.device.findMany({ where: { city: c.targetCity } });

     console.log(`   -> Asignando campaña ${c.name} a ${devicesToAssign.length} pantallas...`);
     await prisma.deviceCampaign.createMany({
        data: devicesToAssign.map(d => ({
           device_id: d.id,
           campaign_id: campaign.id
        })),
        skipDuplicates: true
     });

     // Metrics
     const now = new Date();
     for (let i = 0; i < 5; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        await prisma.campaignMetric.create({
           data: {
              campaignId: campaign.id,
              date: new Date(date.toISOString().split('T')[0]),
              city: c.targetCity,
              totalImpressions: Math.floor(c.budget / 10 + Math.random() * 500),
              totalCompletions: Math.floor(c.budget / 12 + Math.random() * 400),
              uniqueDevices: devicesToAssign.length
           }
        });
     }
  }

  console.log('\n======================================================');
  console.log('🎉 BASE DE DATOS NACIONAL (100 PANTALLAS) CARGADA!');
  console.log('======================================================');
}

seedNationwide()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
