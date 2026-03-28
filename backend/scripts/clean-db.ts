import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚮 Starting full database reset (non-system data)...');

  try {
    // 1. Delete transactional / secondary data first (to avoid FK issues)
    console.log('Cleaning logs and events...');
    await prisma.analyticsEvent.deleteMany({});
    await prisma.campaignMetric.deleteMany({});
    await prisma.deviceCommand.deleteMany({});
    await prisma.deviceHeartbeat.deleteMany({});
    await prisma.playbackEvent.deleteMany({});
    await prisma.driverLocation.deleteMany({});
    await prisma.playlistItem.deleteMany({});
    await prisma.deviceCampaign.deleteMany({});
    await prisma.subscription.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.financialTransaction.deleteMany({});
    await prisma.payrollPayment.deleteMany({});

    // 2. Delete media entries
    console.log('Cleaning media vault...');
    await prisma.video.deleteMany({});
    await prisma.mediaAsset.deleteMany({});
    await prisma.media.deleteMany({});

    // 3. Delete playlists (linked to campaigns)
    await prisma.playlist.deleteMany({});

    // 4. Delete core business entities
    console.log('Cleaning business entities...');
    await prisma.campaign.deleteMany({});
    await prisma.advertiser.deleteMany({});
    await prisma.device.deleteMany({});
    await prisma.driver.deleteMany({});
    await prisma.fleet.deleteMany({});

    console.log('✅ Database is now CLEAN (Admins preserved).');
  } catch (error) {
    console.error('❌ Error cleaning database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
