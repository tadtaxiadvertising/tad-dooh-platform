const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 INICIANDO MASTER SYNC - TAD PLATFORM v5 🔄');

  const now = new Date();
  const exp = new Date('2026-12-31');

  // 1. Unificar Flota STI (100 unidades)
  for (let i = 1; i <= 100; i++) {
    const sid = `STI${i.toString().padStart(4, '0')}`; // STI0001
    const taxi = `STI-${i.toString().padStart(3, '0')}`;
    const phone = `849-000-${i.toString().padStart(4, '0')}`;
    
    // UPSERT DEVICE
    const device = await prisma.device.upsert({
      where: { deviceId: sid },
      update: {
        taxiNumber: taxi,
        status: 'ACTIVE',
        lastSeen: now,
        isOnline: true,
        playerStatus: 'playing',
        batteryLevel: 90 + Math.floor(Math.random() * 10),
        city: 'Santiago'
      },
      create: {
        deviceId: sid,
        taxiNumber: taxi,
        status: 'ACTIVE',
        lastSeen: now,
        isOnline: true,
        playerStatus: 'playing',
        batteryLevel: 98,
        city: 'Santiago'
      }
    });

    // UPSERT DRIVER
    const driver = await prisma.driver.upsert({
      where: { phone: phone },
      update: {
        deviceId: sid,
        status: 'ACTIVE',
        subscriptionPaid: true,
        fullName: `Socio STI-${sid.slice(-4)}`
      },
      create: {
        fullName: `Socio STI-${sid.slice(-4)}`,
        phone: phone,
        taxiNumber: taxi,
        taxiPlate: `A80${sid.slice(-4)}`,
        status: 'ACTIVE',
        subscriptionPaid: true,
        deviceId: sid
      }
    });

    // UPSERT SUBSCRIPTION
    await prisma.subscription.upsert({
      where: { deviceId: sid },
      update: {
        status: 'ACTIVE',
        validUntil: exp,
        driverId: driver.id
      },
      create: {
        deviceId: sid,
        driverId: driver.id,
        plan: 'MONTHLY',
        amount: 3000,
        status: 'ACTIVE',
        validUntil: exp,
        dueDate: exp
      }
    });

    // POBLAR REVENUE (Eventos de las últimas 24h)
    const playCount = 400 + Math.floor(Math.random() * 200);
    const playbacks = [];
    for (let p = 0; p < 20; p++) { // 20 batches of ~25? no, 20 total for demo
       playbacks.push({
         deviceId: sid,
         eventType: 'play_confirm',
         videoId: 'v-promo-sti',
         timestamp: new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000)
       });
    }
    await prisma.playbackEvent.createMany({ data: playbacks });

    if (i % 25 === 0) console.log(`✓ Procesados ${i} dispositivos y conductores.`);
  }

  console.log('✅ MASTER SYNC COMPLETADO: 100 Pantallas, Conductores y Suscripciones enlazados.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
