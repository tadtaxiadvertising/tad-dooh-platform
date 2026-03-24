import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Inicia el registro del Benchmark 10x10 (10 conductores, 20 pantallas)...');

  // Purge first to start clean (as requested by user)
  console.log('🧹 Purgando base de datos para inicio limpio...');
  await prisma.analyticsEvent.deleteMany();
  await prisma.deviceHeartbeat.deleteMany();
  await prisma.playbackEvent.deleteMany();
  await prisma.deviceCommand.deleteMany();
  await prisma.campaignMetric.deleteMany();
  await prisma.playlistItem.deleteMany();
  await prisma.deviceCampaign.deleteMany();
  await prisma.device.deleteMany();
  await prisma.payrollPayment.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.driverLocation.deleteMany();
  await prisma.driver.deleteMany();

  const drivers = [];
  const devices = [];

  for (let i = 1; i <= 10; i++) {
    const driverId = `DRV-${i.toString().padStart(3, '0')}`;
    const taxiNum = `TX-${i.toString().padStart(3, '0')}`;
    const taxiPlate = `PLATE-${i.toString().padStart(3, '0')}`;
    
    // Create Driver
    const driver = await prisma.driver.create({
      data: {
        fullName: `Socio Conductor TAD #${i.toString().padStart(3, '0')}`,
        phone: `809555${i.toString().padStart(4, '0')}`,
        taxiNumber: taxiNum,
        taxiPlate: taxiPlate,
        subscriptionPaid: true,
        subscriptionEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // 1 year from now
        status: 'ACTIVE',
      }
    });
    
    drivers.push(driver);
    console.log(`✅ Conductor registrado: ${driver.fullName} (${driver.phone})`);

    // Create 2 devices per driver
    const letters = ['A', 'B'];
    for (const letter of letters) {
      const deviceId = `TAD-DEV-${i.toString().padStart(3, '0')}${letter}`;
      const device = await prisma.device.create({
        data: {
          deviceId: deviceId,
          status: 'ACTIVE',
          lastSeen: new Date(),
          isOnline: true,
          batteryLevel: 100,
          storageFree: '32.0 GB',
          appVersion: '2.5.0-benchmark',
          city: 'Santo Domingo',
          driverId: driver.id,
        }
      });
      devices.push(device);
      console.log(`   📱 Pantalla enlazada: ${deviceId} (${letter === 'A' ? 'Izquierda' : 'Derecha'})`);
    }
  }

  console.log('🎉 Benchmark 10x10 completado con éxito!');
  console.log(`Total Conductores: ${drivers.length}`);
  console.log(`Total Pantallas: ${devices.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Error fatal en el registro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
