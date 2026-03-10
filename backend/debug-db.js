const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const campaigns = await prisma.campaign.findMany({ take: 5 });
    console.log('Campaigns:', campaigns.map(c => ({ id: c.id, name: c.name })));
    
    const count = await prisma.deviceCampaign.count();
    console.log('DeviceCampaign count:', count);
    
    if (count > 0) {
        const samples = await prisma.deviceCampaign.findMany({ take: 5, include: { device: true } });
        console.log('Sample Assignments:', samples.map(s => ({ cid: s.campaign_id, did: s.device_id, plate: s.device?.taxiNumber })));
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
