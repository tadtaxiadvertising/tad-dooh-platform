
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedSantiago() {
  console.log('🚀 Iniciando Ingesta Masiva: Santiago de los Caballeros Ecosystem...');

  // 1. Crear Fleets (Central de Taxis)
  const fleetNames = ['Taxi Santiago 24/7', 'Monumental Taxis', 'Estrella de Santiago', 'Cibao Express', 'Apolo Taxi'];
  const fleets = [];
  for (const name of fleetNames) {
    const fleet = await prisma.fleet.upsert({
      where: { name },
      update: {},
      create: { name, city: 'Santiago' }
    });
    fleets.push(fleet);
  }
  console.log(`✅ ${fleets.length} Centrales de Taxi sincronizadas.`);

  // 2. Crear 100 Choferes y 100 Dispositivos asociados
  console.log('📦 Generando 100 Choferes con Hardware Nexus...');
  const firstNames = ['Juan', 'José', 'Luis', 'Pedro', 'Carlos', 'Manuel', 'Ricardo', 'Fernando', 'Miguel', 'Andrés', 'Ramón', 'Santiago', 'David', 'Jorge', 'Héctor', 'Raúl', 'Ángel', 'Javier', 'Oscar', 'Wellington'];
  const lastNames = ['Rodríguez', 'González', 'Hernández', 'García', 'Pérez', 'Martínez', 'López', 'Sánchez', 'Ramírez', 'Díaz', 'Vásquez', 'Castillo', 'Moreno', 'Rosario', 'Espinal', 'Valdez', 'Cruz', 'Mendoza', 'Ferreira', 'Batista'];

  for (let i = 1; i <= 100; i++) {
    const fullName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
    const deviceId = `NEXUS-STI-${1000 + i}`;
    
    // Crear Dispositivo
    await prisma.device.upsert({
      where: { deviceId },
      update: {},
      create: {
        deviceId,
        status: 'ONLINE',
        city: 'Santiago',
        lastLat: 19.4517 + (Math.random() - 0.5) * 0.02,
        lastLng: -70.6970 + (Math.random() - 0.5) * 0.02,
        isOnline: true,
        fleet: fleetNames[Math.floor(Math.random() * fleetNames.length)]
      }
    });

    // Crear Chofer
    await prisma.driver.upsert({
      where: { phone: `809555${i.toString().padStart(4, '0')}` },
      update: {},
      create: {
        fullName,
        cedula: `031-${Math.floor(1000000 + Math.random() * 9000000)}-${Math.floor(Math.random() * 9)}`,
        phone: `809555${i.toString().padStart(4, '0')}`,
        licensePlate: `A${Math.floor(100000 + Math.random() * 900000)}`,
        taxiPlate: `TP-${i.toString().padStart(4, '0')}`,
        taxiNumber: `STI-${i.toString().padStart(3, '0')}`,
        deviceId,
        subscriptionPaid: Math.random() > 0.3,
        status: 'ACTIVE'
      }
    });
  }
  console.log('✅ 100 Choferes registrados con terminales activas.');

  // 3. Crear 100 Anunciantes (Marcas Locales Santiago)
  console.log('💼 Generando 100 Marcas y Anunciantes del Cibao...');
  const businessTypes = ['Restaurante', 'Ferretería', 'Tienda', 'Centro Médico', 'Inmobiliaria', 'Repuestos', 'Salón de Belleza', 'Barbería', 'Supermercado', 'Colegio', 'Farmacia', 'Gym'];
  const sectors = ['Villa Olga', 'La Trinitaria', 'Los Jardines', 'Pontezuela', 'El Dorado', 'Cerros de Gurabo', 'Pueblo Nuevo', 'Santiago Oeste', 'Tamboril', 'Licey'];

  for (let i = 1; i <= 100; i++) {
    const bizType = businessTypes[Math.floor(Math.random() * businessTypes.length)];
    const sector = sectors[Math.floor(Math.random() * sectors.length)];
    const companyName = `${bizType} ${lastNames[Math.floor(Math.random() * lastNames.length)]} Santiago`;
    
    await prisma.advertiser.upsert({
      where: { email: `admin@${companyName.toLowerCase().replace(/\s+/g, '')}.com` },
      update: {},
      create: {
        companyName,
        contactName: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
        email: `admin@${companyName.toLowerCase().replace(/\s+/g, '')}.com`,
        phone: `829444${i.toString().padStart(4, '0')}`,
        status: 'ACTIVE'
      }
    });
  }
  console.log('✅ 100 Anunciantes registrados exitosamente.');

  console.log('\n======================================================');
  console.log('🎉 BASE DE DATOS SANTIAGO (STI) CARGADA EXITOSAMENTE');
  console.log('======================================================');
}

seedSantiago()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export {};
