const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando creación de 100 tablets para Santiago...');
  
  const devices = [];
  for (let i = 1; i <= 100; i++) {
    const code = `TADSTI-${String(i).padStart(3, '0')}`;
    devices.push({
      deviceId: code,
      name: `Tablet ${code}`,
      city: 'Santiago',
      status: 'ACTIVE',
      appVersion: '2.1.3',
      isOnline: false,
      batteryLevel: 100
    });
  }

  // Usamos createMany para eficiencia si el provider lo soporta (PostgreSQL sí)
  try {
    const result = await prisma.device.createMany({
      data: devices,
      skipDuplicates: true, // Por si acaso ya existen algunos
    });
    
    console.log(`✅ ¡Éxito! Se crearon ${result.count} nuevas tablets en el sistema.`);
  } catch (error) {
    console.error('❌ Error al crear las tablets:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
