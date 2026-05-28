import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- DATABASE STATUS ---');
  const counts = {
    Snapshots: await prisma.biDashboardSnapshot.count(),
    Reports: await prisma.reconciliationReport.count(),
    Devices: await prisma.device.count(),
    Drivers: await prisma.driver.count(),
    Advertisers: await prisma.advertiser.count(),
    Campaigns: await prisma.campaign.count(),
    PlaybackEvents: await prisma.playbackEvent.count(),
    Locations: await prisma.driverLocation.count(),
    Transactions: await prisma.financialTransaction.count()
  };
  console.table(counts);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
