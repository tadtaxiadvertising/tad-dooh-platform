import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.device.count();
  console.log(`CURRENT DEVICE COUNT: ${count}`);
}

main().finally(() => prisma.$disconnect());
