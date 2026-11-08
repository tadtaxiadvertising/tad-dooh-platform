import { errorMessage } from "../src/utils/error.util";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  try {
    // Fix NOT NULL constraint on advertiser_id (should be nullable per schema)
    await prisma.$executeRawUnsafe(
      `ALTER TABLE portal_requests ALTER COLUMN advertiser_id DROP NOT NULL;`,
    );
    console.log("✓ Fixed: advertiser_id is now nullable");
  } catch (e: unknown) {
    console.log(
      "advertiser_id already nullable or column issue:",
      errorMessage(e),
    );
  }

  try {
    // Ensure driver_id also exists and is nullable
    await prisma.$executeRawUnsafe(
      `ALTER TABLE portal_requests ADD COLUMN IF NOT EXISTS driver_id TEXT;`,
    );
    console.log("✓ Fixed: driver_id column ensured");
  } catch (e: unknown) {
    console.log("driver_id issue:", errorMessage(e));
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
    console.log("✓ Fixed: driver_id FK constraint ensured");
  } catch (e: unknown) {
    console.log("FK constraint issue:", errorMessage(e));
  }

  try {
    // 🔥 CRITICAL: Fix missing identidad_vehicular on drivers table
    await prisma.$executeRawUnsafe(
      `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS identidad_vehicular JSONB;`,
    );
    console.log("✓ Fixed: identidad_vehicular column ensured on drivers");
  } catch (e: unknown) {
    console.log("identidad_vehicular issue:", errorMessage(e));
  }

  try {
    // 🔥 CRITICAL: Fix missing hardware_config on drivers table
    await prisma.$executeRawUnsafe(
      `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS hardware_config JSONB;`,
    );
    console.log("✓ Fixed: hardware_config column ensured on drivers");
  } catch (e: unknown) {
    console.log("hardware_config issue:", errorMessage(e));
  }

  try {
    // Ensuring insurance/contract acceptance flags exist
    await prisma.$executeRawUnsafe(
      `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS insurance_accepted BOOLEAN DEFAULT false;`,
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS insurance_accepted_at TIMESTAMP;`,
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS contract_accepted BOOLEAN DEFAULT false;`,
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS contract_accepted_at TIMESTAMP;`,
    );
    console.log(
      "✓ Fixed: Insurance/Contract acceptance flags ensured on drivers",
    );
  } catch (e: unknown) {
    console.log("Acceptance flags issue:", errorMessage(e));
  }

  // Verify final state
  const cols = await prisma.$queryRaw<
    { column_name: string; is_nullable: string; data_type: string }[]
  >`
    SELECT column_name, is_nullable, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'portal_requests' 
    ORDER BY ordinal_position;
  `;
  console.log("\nFinal portal_requests columns:");
  for (const col of cols) {
    console.log(
      `  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`,
    );
  }

  const driverCols = await prisma.$queryRaw<
    { column_name: string; is_nullable: string; data_type: string }[]
  >`
    SELECT column_name, is_nullable, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'drivers' 
    ORDER BY ordinal_position;
  `;
  console.log("\nFinal drivers columns:");
  for (const col of driverCols) {
    console.log(
      `  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`,
    );
  }

  await prisma.$disconnect();
}

main();
