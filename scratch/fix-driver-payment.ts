import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, 'apps', 'api', '.env') });
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Fixing Driver Payment Status for all test drivers...');

  const drivers = await prisma.driver.findMany({
    where: {
      OR: [
        { email: 'driver@tad.do' },
        { phone: '18090000000' }
      ]
    }
  });

  if (drivers.length === 0) {
    console.log('⚠️ No drivers found to update.');
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
