require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  console.log('Adding columns to payroll_payments...');
  
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "payroll_payments" 
      ADD COLUMN IF NOT EXISTS "active_ads" INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "gps_points" INTEGER DEFAULT 0;
    `);
    console.log('Columns added successfully.');
  } catch (err) {
    console.error('Error adding columns:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
