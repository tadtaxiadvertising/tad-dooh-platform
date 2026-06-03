
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const keepers = [
    'STI0001', 'STI0002', 'STI0003', 'STI0004', 'STI0005',
    'STI0006', 'STI0007', 'STI0008', 'STI0009', 'STI0010'
  ];

  console.log(`🧹 Iniciando limpieza de datos de pantallas...`);
  console.log(`✅ Manteniendo dispositivos pilot: ${keepers.join(', ')}`);

  // Primero eliminar dependencias si las hay (Prisma cascada se encarga si está configurado, 
  // pero podemos hacerlo explícito para estar seguros de no tener FK errors)
  
  // En este esquema, Device suele tener vinculados:
  // - deviceHeartbeat
  // - deviceCommand
  // - playbackEvent
  // - driverLocation (si está vinculado)
  
  const toDelete = await prisma.device.findMany({
    where: {
      deviceId: { notIn: keepers }
    },
    select: { id: true, deviceId: true }
  });

  console.log(`⚠️ Se eliminarán ${toDelete.length} dispositivos extra.`);

  // Usamos una transacción para seguridad
  try {
    const deletedCount = await prisma.device.deleteMany({
      where: {
        deviceId: { notIn: keepers }
      }
    });
    console.log(`✨ Éxito: ${deletedCount.count} dispositivos eliminados.`);
  } catch (error) {
    console.error(`❌ Error durante la limpieza:`, error.message);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
