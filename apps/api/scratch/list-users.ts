import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { email: true, role: true } });
  const advertisers = await prisma.advertiser.findMany({ select: { email: true } });
  const drivers = await prisma.driver.findMany({ select: { id: true, phone: true } });

  console.log('--- ADMIN USERS ---');
  console.table(users);
  
  console.log('--- ADVERTISERS ---');
  console.table(advertisers);
  
  console.log('--- DRIVERS ---');
  console.table(drivers);
}

main().finally(() => prisma.$disconnect());
