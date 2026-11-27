"use strict";

// Explicit, disposable PostgreSQL contract test. No DATABASE_URL, host ports,
// Supabase credentials, application boot, or historical migration replay.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID, createHash } = require("node:crypto");
const { execFile, spawn } = require("node:child_process");
const { promisify } = require("node:util");
const { setTimeout: delay } = require("node:timers/promises");
const exec = promisify(execFile);
const DB = "tad_onboarding_fixture";
const name = "tad-onboarding-fixture-" + randomUUID();
const namespace = "public-advertiser-onboarding:single-use:v1";
const key = createHash("sha256").update(JSON.stringify([namespace, randomUUID()])).digest("hex");
const sentinel = createHash("sha256").update(namespace).digest("hex");
const root = path.resolve(__dirname, "..");
const ddl = fs.readFileSync(path.join(root,
  "apps/api/prisma/migrations/20261107_secure_idempotency_keys/migration.sql"), "utf8");

async function docker(args, timeout = 15000) {
  return exec("docker", args, { timeout, maxBuffer: 1024 * 1024 });
}

function psqlArgs(app = "fixture_observer") {
  return ["exec", "-i", "-e", "PGAPPNAME=" + app, name, "psql",
    "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose",
    "-U", "postgres", "-d", DB];
}

async function sql(statement, app) {
  const result = await docker([...psqlArgs(app), "-c", statement]);
  return result.stdout.trim();
}

async function waitFor(check, description, timeout = 20000) {
  const deadline = Date.now() + timeout;
  do {
    if (await check()) return;
    await delay(100);
  } while (Date.now() < deadline);
  throw new Error("Timed out: " + description);
}

function reservation(id) {
  return "INSERT INTO public.idempotency_keys " +
    "(id,key,\"driverId\",path,method,request_hash,\"isLocked\",expires_at) VALUES (" +
    "'" + id + "','" + key + "','" + namespace + "','/onboarding/advertiser','POST','" +
    sentinel + "',true,now() - interval '1 day')";
}

async function expectDuplicate(id) {
  await assert.rejects(sql(reservation(id)), error =>
    typeof error.stderr === "string" && error.stderr.includes("23505"));
}

async function verify() {
  let holder;
  let challenger;
  let holderExit;
  let started = false;
  try {
    // Image major matches PostgreSQL 16; container has no network or host mounts.
    await docker(["run", "--rm", "--detach", "--network", "none", "--name", name,
      "-e", "POSTGRES_HOST_AUTH_METHOD=trust", "-e", "POSTGRES_DB=" + DB,
      "postgres:16"], 180000);
    started = true;
    await waitFor(async () => {
      try {
        // The initialization server uses listen_addresses=''; wait for the
        // final server, otherwise its socket can disappear during setup.
        return (await sql("SELECT current_database() || ':' || current_setting('listen_addresses')")) === DB + ":*";
      } catch { return false; }
    }, "fixture database startup", 60000);

    assert.equal(await sql("SELECT count(*) FROM pg_class WHERE relname='idempotency_keys'"), "0");
    await sql("CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;");
    await sql(ddl);
    await sql("CREATE TABLE fixture_advertisers (id text PRIMARY KEY); " +
      "CREATE TABLE fixture_campaigns (id text PRIMARY KEY, advertiser_id text NOT NULL REFERENCES fixture_advertisers(id));");
    assert.equal(await sql("SELECT relrowsecurity FROM pg_class WHERE oid='public.idempotency_keys'::regclass"), "t");
    assert.equal(await sql("SELECT has_table_privilege('anon','public.idempotency_keys','SELECT,INSERT,UPDATE,DELETE') OR has_table_privilege('authenticated','public.idempotency_keys','SELECT,INSERT,UPDATE,DELETE')"), "f");

    // Hold the first INSERT uncommitted while a second backend tries the same
    // unique key. Observe PostgreSQL's real lock wait before allowing COMMIT.
    holder = spawn("docker", psqlArgs("fixture_holder"), { stdio: ["pipe", "pipe", "pipe"] });
    let output = "";
    let errors = "";
    holder.stdout.on("data", chunk => { output += chunk.toString(); });
    holder.stderr.on("data", chunk => { errors += chunk.toString(); });
    holder.stdin.on("error", () => {});
    holderExit = new Promise(resolve => {
      holder.once("error", error => resolve({ error }));
      holder.once("close", code => resolve({ code }));
    });
    holder.stdin.write("BEGIN;\n" + reservation("holder") + ";\nSELECT 'RESERVATION_HELD';\n");
    await waitFor(() => output.includes("RESERVATION_HELD"), "first uncommitted reservation");
    challenger = sql(reservation("challenger"), "fixture_challenger")
      .then(() => ({ success: true }), error => ({ error }));
    await waitFor(async () => (await sql(
      "SELECT count(*) FROM pg_stat_activity WHERE application_name='fixture_challenger' AND wait_event_type='Lock'"
    )) === "1", "second PostgreSQL session waiting on unique index");
    holder.stdin.end("COMMIT;\n");
    const closed = await holderExit;
    assert.equal(closed.code, 0, errors);
    const second = await challenger;
    assert.ok(second.error?.stderr?.includes("23505"), "expected unique violation");
    assert.equal(await sql("SELECT count(*) FROM idempotency_keys"), "1");
    console.log("PASS real concurrent unique-key reservation: one winner, one 23505");

    // Fail after fixture business writes and marker update. The session exits
    // on error; PostgreSQL must roll back all three but retain the reservation.
    const work = "INSERT INTO fixture_advertisers VALUES ('adv'); " +
      "INSERT INTO fixture_campaigns VALUES ('camp','adv'); " +
      "UPDATE idempotency_keys SET \"isLocked\"=false,response='COMMITTED' WHERE key='" + key + "'; ";
    await assert.rejects(sql("BEGIN; " + work +
      "DO $$ BEGIN RAISE EXCEPTION 'fixture rollback'; END $$; COMMIT;"),
      error => error.stderr?.includes("fixture rollback"));
    assert.equal(await sql("SELECT (SELECT count(*) FROM fixture_advertisers), " +
      "(SELECT count(*) FROM fixture_campaigns), \"isLocked\", response IS NULL FROM idempotency_keys"), "0|0|t|t");
    await expectDuplicate("expired_locked");
    console.log("PASS rollback retains expired reservation and rejects replay");

    await sql("BEGIN; " + work + "COMMIT;");
    assert.equal(await sql("SELECT (SELECT count(*) FROM fixture_advertisers), " +
      "(SELECT count(*) FROM fixture_campaigns), \"isLocked\", response FROM idempotency_keys"), "1|1|f|COMMITTED");
    await expectDuplicate("expired_completed");
    console.log("PASS business fixture rows and receipt marker commit atomically; expired replay rejected");
    console.log("TAD_ADVERTISER_POSTGRES_CONTRACT_PASS");
  } finally {
    if (holder && holder.exitCode === null) {
      holder.stdin.destroy();
      holder.kill();
    }
    // The unique name belongs exclusively to this invocation.
    // Even a failed docker run may have created it before returning.
    try { await docker(["rm", "-f", name]); } catch (error) {
      if (started && !error.stderr?.includes("No such container")) throw error;
    }
    if (challenger) await challenger;
  }
}

if (process.argv.length !== 3 || process.argv[2] !== "--isolated-docker") {
  console.error("Refused: invoke with --isolated-docker to create a fresh network-isolated fixture.");
  process.exitCode = 2;
} else {
  verify().catch(error => {
    console.error("TAD_ADVERTISER_POSTGRES_CONTRACT_FAIL:", error.message);
    process.exitCode = 1;
  });
}
