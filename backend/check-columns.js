
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'campaigns'
    `);
    console.log('Columns in campaigns table:', result);
  } catch (e) {
    console.error('Error fetching columns:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
