
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const tables = await prisma.$queryRawUnsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables in database:', tables);
  } catch (e) {
    console.error('Error fetching tables:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
