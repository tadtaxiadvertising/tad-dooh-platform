// create-playlist-items-table.js
// Creates the playlist_items table if it doesn't exist
// Uses the existing Prisma/pg connection through the pooler

const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  try {
    // Check if table exists
    const result = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'playlist_items'
      ) AS exists;
    `;
    
    const tableExists = result[0]?.exists;
    console.log('playlist_items table exists:', tableExists);

    if (!tableExists) {
      console.log('Creating playlist_items table...');
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS playlist_items (
          campaign_id TEXT NOT NULL,
          device_id TEXT NOT NULL,
          PRIMARY KEY (campaign_id, device_id),
          CONSTRAINT fk_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
          CONSTRAINT fk_device FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
        );
      `);
      console.log('✅ playlist_items table created successfully!');
    } else {
      console.log('✅ Table already exists, no action needed.');
    }

    // Also check for any other missing tables/columns
    const tables = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    console.log('\nExisting tables:');
    tables.forEach(t => console.log('  -', t.table_name));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
