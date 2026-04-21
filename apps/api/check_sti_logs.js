
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStiLogs() {
  console.log('🔍 REVISANDO LOG DE CONCILIACIÓN - SANTIAGO PILOT (STI)');
  console.log('------------------------------------------------------');

  // 1. Check current reconciliation reports for STI devices
  const reports = await prisma.reconciliationReport.findMany({
    where: {
      deviceId: {
        startsWith: 'STI'
      }
    },
    orderBy: {
      period: 'desc'
    },
    take: 10
  });

  if (reports.length === 0) {
    console.log('⚠️ No se encontraron reportes de conciliación para dispositivos STI.');
  } else {
    console.table(reports.map(r => ({
      ID: r.deviceId,
      Periodo: r.period,
      Plays: r.totalPlaybacks,
      Sub: r.subscriptionStatus,
      Discrepancia: r.hasDiscrepancy ? `❌ ${r.discrepancyType}` : '✅ OK',
      Ingreso: r.revenueReceived
    })));
  }

  // 2. Check recent playback activity for STI
  console.log('\n📡 ACTIVIDAD RECIENTE (Últimas 24h) - STI DEVICES');
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const activeSti = await prisma.playbackEvent.groupBy({
    by: ['deviceId'],
    where: {
      deviceId: { startsWith: 'STI' },
      timestamp: { gte: yesterday }
    },
    _count: {
      id: true
    }
  });

  if (activeSti.length === 0) {
    console.log('🔴 ALERTA: No hay actividad de reproducción en Santiago en las últimas 24h.');
  } else {
    console.table(activeSti.map(s => ({
      Device: s.deviceId,
      Impactos_24H: s._count.id
    })));
  }

  await prisma.$disconnect();
}

checkStiLogs().catch(e => {
  console.error(e);
  process.exit(1);
});
