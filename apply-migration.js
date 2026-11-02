const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function applyMigration() {
  try {
    await client.connect();

    // First run the dedupe
    console.log('Running dedupe...');
    await client.query(`
      WITH ranked AS (
        SELECT
          id,
          ROW_NUMBER() OVER (
            PARTITION BY device_id, "timestamp"
            ORDER BY id ASC
          ) AS rn
        FROM driver_locations
      )
      DELETE FROM driver_locations
      WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
    `);
    console.log('Dedupe done');

    // Now check if unique constraint exists
    const checkRes = await client.query(`
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'driver_locations_device_timestamp_unique'
    `);
    console.log('Unique constraint exists:', checkRes.rowCount > 0);

    if (checkRes.rowCount === 0) {
      console.log('Creating unique constraint...');
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'driver_locations_device_timestamp_unique'
          ) THEN
            ALTER TABLE driver_locations
              ADD CONSTRAINT driver_locations_device_timestamp_unique
              UNIQUE (device_id, "timestamp");
          END IF;
        END $$;
      `);
      console.log('Unique constraint created');
    } else {
      console.log('Unique constraint already exists');
    }

    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

applyMigration();
