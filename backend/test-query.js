
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Fetching campaigns with include...');
    const campaigns = await prisma.campaign.findMany({
      include: { mediaAssets: true },
      orderBy: { createdAt: 'desc' },
    });
    console.log('Success:', campaigns.length, 'campaigns found.');
  } catch (e) {
    console.error('FAILED:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
