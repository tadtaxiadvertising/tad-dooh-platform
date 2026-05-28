const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', 'apps', 'api', '.env') });
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Fixing Driver Payment Status for all test drivers (JS Version)...');

  // We search for drivers by common test identifiers
  const drivers = await prisma.driver.findMany({
    where: {
      OR: [
        { phone: '18090000000' },
        { fullName: { contains: 'Test' } }
      ]
    }
  });

  if (drivers.length === 0) {
    console.log('⚠️ No drivers found to update.');
    // List some drivers to see what's there
    const someDrivers = await prisma.driver.findMany({ take: 5 });
    console.log('Current drivers in DB:', someDrivers.map(d => ({ id: d.id, phone: d.phone, status: d.status, paid: d.subscriptionPaid })));
    return;
  }

  for (const driver of drivers) {
    await prisma.driver.update({
      where: { id: driver.id },
      data: {
        status: 'OPERATIVO',
        subscriptionPaid: true,
        subscriptionEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
      }
    });
    console.log(`✅ Updated driver: ${driver.fullName || driver.phone}`);
  }

  console.log('🎉 Done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
