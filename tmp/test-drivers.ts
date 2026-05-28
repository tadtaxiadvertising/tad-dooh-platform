
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const drivers = await prisma.driver.findMany({
      include: {
        device: true,
        subscriptions: true
      }
    });
    console.log(`Found ${drivers.length} drivers:`);
    console.log(JSON.stringify(drivers, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
  } catch (err) {
    console.error('Error fetching drivers:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
