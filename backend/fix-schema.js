
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Adding columns...');
    await prisma.$executeRawUnsafe(`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_impressions INTEGER DEFAULT 0;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS budget DOUBLE PRECISION DEFAULT 0;`);
    console.log('Columns added successfully.');
  } catch (e) {
    console.error('Error adding columns:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
