const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando creación de 100 tablets STI para Santiago...');
  
  const devices = [];
  for (let i = 1; i <= 100; i++) {
    const code = `STI${String(i).padStart(4, '0')}`; // Formato: STI0001, STI0002...
    devices.push({
      deviceId: code,
      name: `Tablet ${code}`,
      city: 'Santiago',
      status: 'ACTIVE',
      appVersion: '2.1.3',
      isOnline: true, // Forzamos Online para que aparezcan en el monitoreo activo
      batteryLevel: 95,
      taxiNumber: `STI-${String(i).padStart(3, '0')}` // Opcional: Placa para visualización
    });
  }

  try {
    const result = await prisma.device.createMany({
      data: devices,
      skipDuplicates: true,
    });
    
    console.log(`✅ ¡Éxito! Se crearon ${result.count} nuevas tablets STI en el sistema.`);
    
    // También creamos un chofer genérico para cada STI y los vinculamos
    // Para simplificar, vinculamos STI0001 a un chofer principal
    const sti0001 = await prisma.device.findUnique({ where: { deviceId: 'STI0001' } });
    if (sti0001) {
       await prisma.driver.updateMany({
         where: { fullName: 'Arismendy Test' },
         data: { deviceId: 'STI0001' }
       });
       console.log('✅ STI0001 vinculado al chofer de prueba.');
    }

  } catch (error) {
    console.error('❌ Error al crear las tablets:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
