import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 AGGRESSIVE Purge starting...');

  const tables = [
    'analytics_events',
    'campaign_metrics',
    'device_commands',
    'device_heartbeats',
    'playback_events',
    'driver_locations',
    'playlist_items',
    'device_campaigns',
    'subscriptions',
    'notifications',
    'financial_transactions',
    'payroll_payments',
    'videos',
    'media_assets',
    'media',
    'playlists',
    'campaigns',
    'advertisers',
    'devices',
    'drivers',
    'fleets'
  ];

  for (const table of tables) {
    try {
      console.log(`Truncating ${table}...`);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`);
    } catch (e) {
      console.warn(`Could not truncate ${table}: ${e.message}`);
    }
  }

  console.log('✅ TRUNCATE COMPLETE. System is pure.');
  await prisma.$disconnect();
}

main();
