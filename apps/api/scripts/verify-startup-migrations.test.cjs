// Run with Node's test runner and @electric-sql/pglite@0.5.13 available on NODE_PATH.
// All SQL executes in isolated in-memory PostgreSQL instances; no connection URL is read.
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { test } = require("node:test");
const { PGlite } = require("@electric-sql/pglite");
const { Prisma } = require("@prisma/client");

const notifications = "20261012_campaign_notification_dedup";
const gps = "20261012_telemetry_gps_burst_fix";
const pendingMigrations = [
  notifications,
  "20261012_rate_limit_windows",
  gps,
  "20261030_add_driver_auth_user_id",
];
const migration = (name) =>
  readFileSync(resolve(__dirname, "../prisma/migrations", name, "migration.sql"), "utf8");

async function database(t) {
  const db = new PGlite();
  t.after(() => db.close());
  return db;
}

async function legacyTables(db) {
  await db.exec(`
    CREATE TABLE public.drivers (id TEXT PRIMARY KEY, phone TEXT NOT NULL UNIQUE);
    CREATE TABLE public.telemetry (
      id TEXT PRIMARY KEY,
      driver_id TEXT NOT NULL REFERENCES public.drivers(id),
      timestamp TIMESTAMP NOT NULL,
      CONSTRAINT telemetry_driver_id_timestamp_key UNIQUE (driver_id, timestamp)
    );
    CREATE INDEX idx_telemetry_driver_time ON public.telemetry (driver_id, timestamp DESC);
    INSERT INTO public.drivers VALUES ('fixture-driver', 'fixture-phone');
  `);
}

test("notification migration is replayable and keeps queued work and unique deduplication", async (t) => {
  const db = await database(t);
  await db.exec(migration(notifications));
  await db.exec(`
    INSERT INTO public.notification_queue(type, category, entity_id, title, message)
    VALUES ('expiry', 'campaign', 'fixture-campaign', 'title', 'message');
  `);
  await db.exec(migration(notifications));
  await db.exec(`
    INSERT INTO public.notification_queue(type, category, entity_id, title, message)
    VALUES ('expiry', 'campaign', 'fixture-campaign', 'title', 'message')
    ON CONFLICT (type, category, entity_id) DO NOTHING;
  `);
  const result = await db.query("SELECT count(*)::int AS count FROM public.notification_queue");
  assert.equal(result.rows[0].count, 1);
});

test("campaign expiration trigger updates updated_at after replay", async (t) => {
  const db = await database(t);
  await db.exec(migration(notifications));
  await db.exec(migration(notifications));
  await db.exec(`
    INSERT INTO public.campaign_expirations
      (campaign_id, advertiser_id, remaining_days, scheduled_for, updated_at)
    VALUES ('fixture-campaign', 'fixture-advertiser', 2, NOW(), '2000-01-01');
    UPDATE public.campaign_expirations SET remaining_days = 1;
  `);
  const result = await db.query(`
    SELECT updated_at > '2000-01-01'::timestamp AS updated
    FROM public.campaign_expirations WHERE campaign_id = 'fixture-campaign';
  `);
  assert.equal(result.rows[0].updated, true);
});

test("all pending startup migrations replay without deleting telemetry or weakening legacy indexes", async (t) => {
  const db = await database(t);
  await legacyTables(db);
  await db.exec(`
    INSERT INTO public.telemetry VALUES
      ('point-1', 'fixture-driver', '2026-10-30 03:00:00.100'),
      ('point-2', 'fixture-driver', '2026-10-30 03:00:01.100');
  `);
  for (const name of pendingMigrations) await db.exec(migration(name));
  for (const name of pendingMigrations) await db.exec(migration(name));

  const telemetry = await db.query("SELECT count(*)::int AS count FROM public.telemetry");
  assert.equal(telemetry.rows[0].count, 2);
  const indexes = await db.query(`
    SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'telemetry';
  `);
  const names = indexes.rows.map((row) => row.indexname);
  assert.ok(names.includes("telemetry_driver_id_timestamp_key"));
  assert.ok(names.includes("idx_telemetry_driver_time"));
  assert.ok(names.includes("telemetry_driver_timestamp_sec_unique"));

  const auth = await db.query("SELECT auth_user_id FROM public.drivers WHERE id = 'fixture-driver'");
  assert.equal(auth.rows[0].auth_user_id, null);
  await db.exec(`
    INSERT INTO public.drivers(id, phone, auth_user_id) VALUES ('driver-2', 'phone-2', 'auth-fixture');
  `);
  await assert.rejects(
    db.exec("UPDATE public.drivers SET auth_user_id = 'auth-fixture' WHERE id = 'fixture-driver'"),
    (error) => error.code === "23505",
  );
});

test("GPS expression index matches the existing ON CONFLICT contract", async (t) => {
  const db = await database(t);
  await legacyTables(db);
  await db.exec(migration(gps));
  await db.exec(`
    INSERT INTO public.telemetry VALUES ('point-1', 'fixture-driver', '2026-10-30 03:00:00.100');
    INSERT INTO public.telemetry VALUES ('same-second', 'fixture-driver', '2026-10-30 03:00:00.900')
    ON CONFLICT (driver_id, date_trunc('second', timestamp)) DO NOTHING;
    INSERT INTO public.telemetry VALUES ('next-second', 'fixture-driver', '2026-10-30 03:00:01.100')
    ON CONFLICT (driver_id, date_trunc('second', timestamp)) DO NOTHING;
  `);
  const result = await db.query("SELECT id FROM public.telemetry ORDER BY id");
  assert.deepEqual(result.rows.map((row) => row.id), ["next-second", "point-1"]);
});

test("existing same-second GPS duplicates stop index creation without deleting points or indexes", async (t) => {
  const db = await database(t);
  await legacyTables(db);
  await db.exec(`
    INSERT INTO public.telemetry VALUES
      ('point-1', 'fixture-driver', '2026-10-30 03:00:00.100'),
      ('point-2', 'fixture-driver', '2026-10-30 03:00:00.900');
  `);
  await assert.rejects(db.exec(migration(gps)), (error) => error.code === "23505");
  const result = await db.query("SELECT count(*)::int AS count FROM public.telemetry");
  assert.equal(result.rows[0].count, 2);
  const index = await db.query("SELECT to_regclass('public.idx_telemetry_driver_time') IS NOT NULL AS present");
  assert.equal(index.rows[0].present, true);
});

test("internal notification and rate-limit tables reject client-role writes", async (t) => {
  const db = await database(t);
  await db.exec(migration(notifications));
  await db.exec(migration("20261012_rate_limit_windows"));
  await db.exec(`
    CREATE ROLE authenticated;
    GRANT USAGE ON SCHEMA public TO authenticated;
    GRANT SELECT, INSERT ON public.notification_queue, public.campaign_expirations,
      public.rate_limit_windows TO authenticated;
  `);
  const tables = await db.query(`
    SELECT relname, relrowsecurity FROM pg_class
    WHERE oid IN ('public.notification_queue'::regclass, 'public.campaign_expirations'::regclass,
      'public.rate_limit_windows'::regclass);
  `);
  assert.equal(tables.rows.length, 3);
  for (const table of tables.rows) assert.equal(table.relrowsecurity, true, table.relname);
  await db.exec("SET ROLE authenticated");
  await assert.rejects(
    db.exec(`INSERT INTO public.notification_queue(type, category, entity_id, title, message)
      VALUES ('expiry', 'campaign', 'fixture-campaign', 'title', 'message')`),
    (error) => error.code === "42501",
  );
  await db.exec("RESET ROLE");
});

test("generated Prisma notification models map every scalar field to migrated SQL columns", async (t) => {
  const db = await database(t);
  await db.exec(migration(notifications));
  for (const modelName of ["NotificationQueue", "CampaignExpiration"]) {
    const model = Prisma.dmmf.datamodel.models.find((entry) => entry.name === modelName);
    assert.ok(model, modelName);
    const columns = await db.query(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1",
      [model.dbName],
    );
    const names = new Set(columns.rows.map((column) => column.column_name));
    for (const field of model.fields.filter((entry) => entry.kind === "scalar")) {
      assert.ok(names.has(field.dbName || field.name), `${modelName}.${field.name} has no SQL column`);
    }
  }
});
