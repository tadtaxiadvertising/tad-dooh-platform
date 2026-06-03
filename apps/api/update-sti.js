const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Actualizando "lastSeen" para todas las tablets STI...');
  
  try {
    const result = await prisma.device.updateMany({
      where: {
        deviceId: {
          startsWith: 'STI'
        }
      },
      data: {
        lastSeen: new Date(),
        status: 'ACTIVE',
        batteryLevel: 98,
        playerStatus: 'playing'
      }
    });
    
    console.log(`✅ ¡Éxito! Se actualizaron ${result.count} tablets STI.`);
    
  } catch (error) {
    console.error('❌ Error en actualización:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
