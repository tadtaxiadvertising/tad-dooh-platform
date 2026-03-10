// migrate-playlist-items.js
// Drops the old playlist_items table and creates the new one matching the Prisma schema
// The old table had: id, playlist_id, media_id, position, duration_seconds, weight, created_at
// The new table is: campaign_id + device_id (composite PK) for manual distribution

const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  try {
    // 1. Check if old table has any data worth keeping
    const count = await prisma.$queryRaw`SELECT COUNT(*) as total FROM playlist_items;`;
    console.log('Old playlist_items row count:', count[0].total);

    // 2. Drop old table (the schema has completely changed)
    console.log('Dropping old playlist_items table...');
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS playlist_items CASCADE;`);
    console.log('✅ Old table dropped');

    // 3. Create new table matching Prisma schema
    console.log('Creating new playlist_items table (campaign_id + device_id)...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE playlist_items (
        campaign_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        PRIMARY KEY (campaign_id, device_id),
        CONSTRAINT fk_playlist_items_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
        CONSTRAINT fk_playlist_items_device FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
      );
    `);
    console.log('✅ New playlist_items table created successfully!');

    // 4. Verify
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'playlist_items' 
      ORDER BY ordinal_position;
    `;
    console.log('\nNew table structure:');
    columns.forEach(c => console.log(`  - ${c.column_name} (${c.data_type})`));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
