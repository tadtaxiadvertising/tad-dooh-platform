const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Eliminando dispositivos obsoletos con formato TADSTI-');
  
  try {
    const result = await prisma.device.deleteMany({
      where: {
        deviceId: {
          startsWith: 'TADSTI-'
        }
      }
    });
    
    console.log(`✅ ¡Limpieza completada! Se eliminaron ${result.count} dispositivos antiguos.`);
    
  } catch (error) {
    console.error('❌ Error en limpieza:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
