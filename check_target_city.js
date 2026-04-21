const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const campaignId = '88a3de30-8760-44a0-93e4-1fe4e4229e50';
  const c = await prisma.campaign.findUnique({
    where: { id: campaignId }
  });
  console.log(`Campaign TargetCity: ${c.targetCity}`);
  console.log(`Campaign targetAll: ${c.targetAll}`);
}

main().finally(() => prisma.$disconnect());
