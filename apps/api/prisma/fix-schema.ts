import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    // Fix NOT NULL constraint on advertiser_id (should be nullable per schema)
    await prisma.$executeRawUnsafe(
      `ALTER TABLE portal_requests ALTER COLUMN advertiser_id DROP NOT NULL;`
    );
    console.log('✓ Fixed: advertiser_id is now nullable');
  } catch (e: any) {
    console.log('advertiser_id already nullable or column issue:', e.message);
  }

  try {
    // Ensure driver_id also exists and is nullable
    await prisma.$executeRawUnsafe(
      `ALTER TABLE portal_requests ADD COLUMN IF NOT EXISTS driver_id TEXT;`
    );
    console.log('✓ Fixed: driver_id column ensured');
  } catch (e: any) {
    console.log('driver_id issue:', e.message);
  }

  try {
    // Add FK constraint for driver_id if missing
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'portal_requests_driver_id_fkey'
        ) THEN
          ALTER TABLE portal_requests
            ADD CONSTRAINT portal_requests_driver_id_fkey
            FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    console.log('✓ Fixed: driver_id FK constraint ensured');
  } catch (e: any) {
    console.log('FK constraint issue:', e.message);
  }

  // Verify final state
  const cols = await prisma.$queryRaw<any[]>`
    SELECT column_name, is_nullable, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'portal_requests' 
    ORDER BY ordinal_position;
  `;
  console.log('\nFinal portal_requests columns:');
  for (const col of cols) {
    console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
  }

  await prisma.$disconnect();
}

main();
