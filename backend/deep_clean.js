
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const keepers = [
    'STI0001', 'STI0002', 'STI0003', 'STI0004', 'STI0005',
    'STI0006', 'STI0007', 'STI0008', 'STI0009', 'STI0010'
  ];

  console.log(`🧹 Limpiando historial de los 10 dispositivos pilot...`);

  // 1. Borrar todas las locaciones (GPS) de todos los drivers (o solo de los vinculados a estos 10)
  // Como solo quedan 10 dispositivos, el resto de locaciones ya no tienen FK si no se borraron en cascada.
  
  // Vamos a borrar TODO el historial de eventos para empezar de cero el test
  await prisma.playbackEvent.deleteMany({});
  console.log('✅ Historial de reproducciones (playbackEvent) borrado.');

  await prisma.driverLocation.deleteMany({});
  console.log('✅ Historial de ubicaciones (driverLocation) borrado.');

  await prisma.deviceHeartbeat.deleteMany({});
  console.log('✅ Historial de latidos (deviceHeartbeat) borrado.');

  await prisma.deviceCommand.deleteMany({});
  console.log('✅ Historial de comandos (deviceCommand) borrado.');

  // Resetear estados actuales en los dispositivos
  await prisma.device.updateMany({
    where: { deviceId: { in: keepers } },
    data: {
      lastSeen: null,
      lastLat: null,
      lastLng: null,
      batteryLevel: null,
      playerStatus: 'offline',
      lastPlayback: null,
      status: 'OFFLINE'
    }
  });
  console.log('✅ Estados de dispositivos pilot reseteados.');

  console.log(`✨ Limpieza profunda completada.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
