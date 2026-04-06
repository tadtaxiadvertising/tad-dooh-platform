import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const campaigns = await prisma.campaign.count();
  console.log('CAMPAIGNS_COUNT:', campaigns);
}
main().finally(() => prisma.$disconnect());
