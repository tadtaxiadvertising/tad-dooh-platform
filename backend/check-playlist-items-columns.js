// check-playlist-items-columns.js
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'playlist_items'
      ORDER BY ordinal_position;
    `;
    console.log('playlist_items columns:');
    columns.forEach(c => console.log(`  - ${c.column_name} (${c.data_type}) nullable=${c.is_nullable} default=${c.column_default}`));
    
    // Also check primary key
    const pk = await prisma.$queryRaw`
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'playlist_items' 
        AND tc.constraint_type = 'PRIMARY KEY';
    `;
    console.log('\nPrimary key columns:', pk.map(p => p.column_name));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
