import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('💰 Iniciando síncronización financiera (Benchmark 10x10)...');

  const drivers = await prisma.driver.findMany({
    include: { devices: true }
  });

  if (drivers.length === 0) {
    console.error('❌ No se encontraron conductores. Ejecuta seed_benchmark primero.');
    return;
  }

  for (const driver of drivers) {
    // 1. Create Subscription Record (Annual)
    const existingSub = await prisma.subscription.findFirst({
      where: { driverId: driver.id }
    });

    if (!existingSub) {
      const startDate = new Date();
      const validUntil = new Date();
      validUntil.setFullYear(startDate.getFullYear() + 1);

      await prisma.subscription.create({
        data: {
          driverId: driver.id,
          plan: 'ANNUAL',
          amount: 6000.0,
          status: 'ACTIVE',
          startDate: startDate,
          dueDate: validUntil,
          validUntil: validUntil,
          paidAt: startDate,
          paymentMethod: 'CASH_SIMULATED',
          notes: 'Pago inicial Benchmark 10x10'
        }
      });
      console.log(`✅ Suscripción anual (RD$6k) registrada para: ${driver.fullName}`);

      // 2. Create Financial Transaction (Libro Mayor)
      await prisma.financialTransaction.create({
        data: {
          type: 'INCOMING',
          category: 'SUSCRIPCION',
          amount: 6000.0,
          netAmount: 5084.75, // 6000 / 1.18 (ITBIS)
          taxAmount: 915.25,
          status: 'COMPLETED',
          entityId: driver.id,
          reference: `BENCH-10X10-INV-${driver.id.slice(0, 4)}`,
          note: `Suscripción inicial de socio ${driver.taxiNumber}`
        }
      });
      console.log(`📊 Transacción contable generada.`);
    }
  }

  const totalRevenue = await prisma.financialTransaction.aggregate({
    where: { category: 'SUSCRIPCION', status: 'COMPLETED' },
    _sum: { amount: true }
  });

  console.log(`🏦 Balance Global del Benchmark: RD$ ${totalRevenue._sum.amount?.toLocaleString() || 0}`);
  console.log('🔥 Integridad financiera restablecida!');
}

main().finally(() => prisma.$disconnect());
