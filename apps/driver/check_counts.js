const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const pCount = await prisma.playbackEvent.count();
  const aCount = await prisma.analyticsEvent.count();
  const dCount = await prisma.device.count();
  console.log('Playback:', pCount);
  console.log('Analytics:', aCount);
  console.log('Devices:', dCount);
  await prisma.$disconnect();
}

main();
