
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const campaigns = await prisma.campaign.findMany({ take: 1 });
    console.log('Campaigns found:', campaigns);
  } catch (e) {
    console.error('Error fetching campaigns:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
