import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const drivers = await prisma.driver.findMany({
    take: 5,
    select: { id: true, fullName: true, subscriptionPaid: true, status: true }
  });
  console.log(JSON.stringify(drivers, null, 2));
  await prisma.$disconnect();
}

main();
