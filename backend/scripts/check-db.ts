import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const devices = await prisma.device.findMany();
  console.log(`TOTAL DEVICES IN DB: ${devices.length}`);
  devices.forEach(d => {
    console.log(`- ${d.deviceId} (Taxi: ${d.taxiNumber || 'N/A'}, City: ${d.city || 'N/A'}, LastSeen: ${d.lastSeen})`);
  });

  const campaigns = await prisma.campaign.count();
  console.log(`TOTAL CAMPAIGNS: ${campaigns}`);
  
  const analytics = await prisma.analyticsEvent.count();
  console.log(`TOTAL ANALYTICS: ${analytics}`);

  await prisma.$disconnect();
}

check();
