const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Desvinculando todos los conductores para reinicio limpio...');
  await prisma.driver.updateMany({
    data: { deviceId: null }
  });

  console.log('🚀 Iniciando sincronización masiva y enlace de datos...');

  const devices = await prisma.device.findMany({
    where: { deviceId: { startsWith: 'STI' } }
  });

  console.log(`🔍 Re-enlazando ${devices.length} dispositivos STI.`);

  for (const device of devices) {
    const num = device.deviceId.replace('STI', '');
    const driverPhone = `849-000-${num}`;
    const driverName = `Socio STI-${num}`;

    // 1. Eliminar cualquier driver que tenga el mismo driverName pero distinto teléfono para evitar conflictos
    // (Opcional, pero ayuda a limpiar)

    // 2. Upsert Driver y enlazarlo
    const driver = await prisma.driver.upsert({
      where: { phone: driverPhone },
      update: {
        deviceId: device.deviceId,
        status: 'ACTIVE',
        subscriptionPaid: true,
      },
      create: {
        fullName: driverName,
        phone: driverPhone,
        taxiNumber: `STI-${num}`,
        taxiPlate: `A${800000 + parseInt(num)}`,
        status: 'ACTIVE',
        subscriptionPaid: true,
        deviceId: device.deviceId,
      }
    });

    // 3. Subscription
    await prisma.subscription.upsert({
      where: { deviceId: device.deviceId },
      update: {
        status: 'ACTIVE',
        validUntil: new Date('2026-12-31'),
        driverId: driver.id,
      },
      create: {
        deviceId: device.deviceId,
        driverId: driver.id,
        plan: 'MONTHLY',
        amount: 3000,
        status: 'ACTIVE',
        dueDate: new Date('2026-12-31'),
        validUntil: new Date('2026-12-31'),
      }
    });

    // 4. Device update
    await prisma.device.update({
      where: { id: device.id },
      data: {
        taxiNumber: `STI-${num}`,
        lastSeen: new Date(),
        status: 'ACTIVE',
        playerStatus: 'playing'
      }
    });
  }

  console.log('✅ ¡Sincronización Total Exitosa! Toda la flota de Santiago está operativa.');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
