
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const campaigns = await prisma.campaign.findMany({ where: { status: 'ACTIVE' } });
  const drivers = await prisma.driver.findMany();
  
  console.log('Active Campaigns:', campaigns.length);
  console.log('Drivers:', drivers.length);
  
  if (campaigns.length > 0 && drivers.length > 0) {
    console.log('READY TO START SIMULATION');
  } else {
    console.log('NEED TO INITIALIZE DATA BEFORE SIMULATION START');
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
