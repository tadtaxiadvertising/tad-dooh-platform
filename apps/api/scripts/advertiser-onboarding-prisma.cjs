"use strict";

// Run real OnboardingService + generated Prisma against our own disposable DB.
// The only fake dependency is Auth admin. Never use ambient DATABASE_URL.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { randomUUID, createHash } = require("node:crypto");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { setTimeout: delay } = require("node:timers/promises");
const exec = promisify(execFile);
const api = path.resolve(__dirname, "..");
const schema = path.join(api, "prisma/schema.prisma");
const db = "tad_onboarding_prisma_fixture";
const namespace = "public-advertiser-onboarding:single-use:v1";
const name = "tad-onboarding-prisma-" + randomUUID();

const storageKey = attempt => createHash("sha256")
  .update(JSON.stringify([namespace, attempt.toLowerCase()])).digest("hex");

function docker(args, timeout = 20000) {
  return exec("docker", ["--host", "unix:///var/run/docker.sock", ...args],
    { timeout, maxBuffer: 4 * 1024 * 1024 });
}

async function sql(statement) {
  const result = await docker(["exec", name, "psql", "-X", "-qAt",
    "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", db, "-c", statement]);
  return result.stdout.trim();
}

async function waitReady() {
  const deadline = Date.now() + 60000;
  do {
    try {
      if (await sql("SELECT current_database() || ':' || current_setting('listen_addresses')") === db + ":*") return;
    } catch { /* Initialization may still be running. */ }
    await delay(250);
  } while (Date.now() < deadline);
  throw new Error("Fixture PostgreSQL did not become ready");
}

function selectFixtureDDL(full) {
  // Generate physical table definitions from the real schema. Select just the
  // three tables touched by this test, not unrelated PostGIS or finance DDL.
  const statements = full.split(";").map(part =>
    part.split("\n").filter(line => !line.trim().startsWith("--")).join("\n").trim()
  ).filter(Boolean);
  const selected = [];
  for (const table of ["advertisers", "campaigns", "videos"]) {
    const matches = statements.filter(s => s.startsWith('CREATE TABLE "' + table + '" ('));
    assert.equal(matches.length, 1, "Missing generated table " + table);
    selected.push(matches[0]);
  }
  const emailIndex = statements.filter(s =>
    /^CREATE UNIQUE INDEX "[^"]+" ON "advertisers"\("email"\)$/.test(s));
  assert.equal(emailIndex.length, 1, "Missing advertiser email unique index");
  selected.push(emailIndex[0]);
  for (const [child, parent] of [["campaigns", "advertisers"], ["videos", "campaigns"]]) {
    const matches = statements.filter(s => s.startsWith('ALTER TABLE "' + child + '" ADD CONSTRAINT ') &&
      s.includes(' REFERENCES "' + parent + '"('));
    assert.equal(matches.length, 1, "Missing generated FK " + child + " -> " + parent);
    selected.push(matches[0]);
  }
  return selected.join(";\n") + ";";
}

async function verify() {
  // Parent directory remains private to runner; Docker only mounts its socket child.
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tad-ob-"));
  const socket = path.join(directory, "sock");
  fs.mkdirSync(socket);
  let clients = [];
  try {
    await docker(["run", "--rm", "--detach", "--network", "none", "--name", name,
      "--mount", "type=bind,source=" + socket + ",target=/var/run/postgresql",
      "-e", "POSTGRES_HOST_AUTH_METHOD=trust", "-e", "POSTGRES_DB=" + db,
      "postgres:16"], 180000);
    await waitReady();

    const url = new URL("postgresql://postgres@localhost/" + db);
    url.searchParams.set("host", socket);
    url.searchParams.set("connection_limit", "2");
    url.searchParams.set("sslmode", "disable");
    // Prisma 5 supports unix socket directories via the host query parameter.
    // Explicit datasource overrides prevent accidentally reading an external URL.
    process.env.DATABASE_URL = url.href;
    const { PrismaClient } = require("@prisma/client");
    clients = [new PrismaClient({ datasources: { db: { url: url.href } } }),
      new PrismaClient({ datasources: { db: { url: url.href } } })];
    const [first, second] = clients;
    const identity = await first.$queryRawUnsafe("SELECT current_database() AS db, inet_server_addr() IS NULL AS socket");
    assert.deepEqual(identity, [{ db, socket: true }], "Refusing non-fixture or TCP connection");

    const prismaCli = require.resolve("prisma/build/index.js");
    const diff = await exec(process.execPath, [prismaCli, "migrate", "diff",
      "--from-empty", "--to-schema-datamodel", schema, "--script"],
      { cwd: api, env: { ...process.env, DATABASE_URL: url.href }, timeout: 60000,
        maxBuffer: 4 * 1024 * 1024 });
    await sql("CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;");
    await sql(selectFixtureDDL(diff.stdout));
    await sql(fs.readFileSync(path.join(api,
      "prisma/migrations/20261107_secure_idempotency_keys/migration.sql"), "utf8"));

    // Load actual TS service without booting the Nest application. All real
    // Prisma operations use the two explicit clients; Auth has no network.
    require("ts-node").register({ transpileOnly: true, project: path.join(api, "tsconfig.json") });
    const { OnboardingService } = require("../src/modules/onboarding/onboarding.service.ts");
    const provisioned = [];
    const deleted = [];
    const auth = { getClient: () => ({ auth: { admin: {
      async createUser() {
        const id = randomUUID();
        provisioned.push(id);
        return { data: { user: { id } }, error: null };
      },
      async deleteUser(id) {
        deleted.push(id);
        return { error: null };
      },
    } } }) };
    const a = new OnboardingService(first, auth);
    const b = new OnboardingService(second, auth);
    const request = {
      name: "Synthetic Contact", companyName: "Synthetic Company",
      email: "fixture@example.invalid", phone: "8095550101",
      password: "fixture-not-a-real-password", budget: 1,
      expectedScreens: 3, campaignMonths: 2, includeProduction: true,
      targetCity: "Santiago",
    };

    const attempt = randomUUID();
    // Distinct email ensures the loser cannot be rejected merely by the
    // advertiser email index; it must lose the real reservation race.
    const results = await Promise.allSettled([
      a.onboardAdvertiser(request, attempt),
      b.onboardAdvertiser({ ...request, email: "fixture2@example.invalid" }, attempt.toUpperCase()),
    ]);
    const success = results.filter(r => r.status === "fulfilled");
    const rejection = results.filter(r => r.status === "rejected");
    assert.equal(success.length, 1);
    assert.equal(rejection.length, 1);
    assert.equal(rejection[0].reason.getStatus(), 409);
    assert.match(rejection[0].reason.message, /solicitud ya fue iniciada/);
    assert.equal(provisioned.length, 1);
    assert.equal(await first.advertiser.count(), 1);
    assert.equal(await first.campaign.count(), 1);
    const campaign = await first.campaign.findUniqueOrThrow({ where: { id: success[0].value.campaignId } });
    assert.equal(campaign.budget, 17500);
    assert.equal(campaign.active, false);
    assert.equal(campaign.status, "PENDING_PAYMENT");
    const marker = await first.idempotencyKey.findUniqueOrThrow({ where: { key: storageKey(attempt) } });
    assert.equal(marker.isLocked, false);
    assert.deepEqual(JSON.parse(marker.response), {
      state: "COMMITTED", authUserId: provisioned[0],
      advertiserId: success[0].value.advertiserId, campaignId: campaign.id,
    });
    assert.equal(deleted.length, 0);
    console.log("PASS real Prisma services share one durable reservation, authoritative price and receipt");

    // Inject a real DB error AFTER campaign INSERT, during the optional video
    // write, using a temporary fixture constraint. No mocked transaction.
    await sql("ALTER TABLE videos ADD CONSTRAINT fixture_reject_video CHECK (title <> 'reject-fixture')");
    const failedAttempt = randomUUID();
    await assert.rejects(a.onboardAdvertiser({
      ...request, email: "rollback@example.invalid",
      fileMetadata: { name: "reject-fixture", size: 10, type: "video/mp4" },
    }, failedAttempt), error => error.getStatus() === 500);
    assert.equal(await first.advertiser.count(), 1);
    assert.equal(await first.campaign.count(), 1);
    assert.equal(await first.video.count(), 0);
    const locked = await first.idempotencyKey.findUniqueOrThrow({ where: { key: storageKey(failedAttempt) } });
    assert.equal(locked.isLocked, true);
    assert.equal(locked.response, null);
    assert.deepEqual(deleted, [provisioned[1]]);
    await assert.rejects(b.onboardAdvertiser({
      ...request, email: "rollback@example.invalid",
    }, failedAttempt), error => error.getStatus() === 409);
    assert.equal(provisioned.length, 2);
    console.log("PASS real Prisma rollback preserves reservation and compensates only newly provisioned fixture identity");

    // Test the exact operator report against real receipts and a minimal
    // synthetic auth.users table. Do not connect to Supabase or inspect PII.
    await sql("CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_app_meta_data jsonb);");
    const reportSQL = fs.readFileSync(path.join(api,
      "../../docs/security/sql/advertiser-onboarding-reconciliation-readonly.sql"), "utf8");
    const report = async () => JSON.parse(await sql(reportSQL));
    let snapshot = await report();
    assert.deepEqual(snapshot, {
      sample_limit: 1000, sampled: 2, truncated: false,
      categories: { AUTH_LINK_MISSING: 1, RECENT_LOCK_OUTCOME_UNKNOWN: 1 },
    });
    await first.$executeRaw`INSERT INTO auth.users (id, email, raw_app_meta_data)
      SELECT ${provisioned[0]}::uuid, email, '{"role":"ADVERTISER"}'::jsonb
      FROM public.advertisers WHERE id = ${success[0].value.advertiserId}::uuid`;
    await first.$executeRaw`UPDATE public.idempotency_keys SET created_at = (now() AT TIME ZONE 'UTC') - interval '2 hours'
      WHERE key = ${storageKey(failedAttempt)}`;
    const reservationData = {
      driverId: namespace, path: "/onboarding/advertiser", method: "POST",
      requestHash: "fixture-sentinel", expiresAt: new Date(Date.now() + 86400000),
    };
    await first.idempotencyKey.createMany({ data: [
      { ...reservationData, key: storageKey(randomUUID()), isLocked: false, response: "{broken" },
      { ...reservationData, key: storageKey(randomUUID()), isLocked: false, response: JSON.stringify({
        state: "COMMITTED", authUserId: randomUUID(), advertiserId: randomUUID(), campaignId: randomUUID(),
      }) },
      { ...reservationData, key: storageKey(randomUUID()), isLocked: true, response: "unexpected" },
      { ...reservationData, key: storageKey(randomUUID()), path: "/unexpected", isLocked: true },
      { ...reservationData, key: storageKey(randomUUID()), driverId: "unrelated-actor", isLocked: true },
    ] });
    snapshot = await report();
    assert.deepEqual(snapshot, {
      sample_limit: 1000, sampled: 6, truncated: false, categories: {
        LINKS_CONSISTENT: 1, AGED_LOCK_OUTCOME_UNKNOWN: 1, INVALID_COMMITTED_RECEIPT: 1,
        BUSINESS_LINK_MISSING: 1, LOCKED_WITH_UNEXPECTED_RECEIPT: 1, INVALID_PROTOCOL: 1,
      },
    });
    await first.$executeRaw`UPDATE auth.users SET raw_app_meta_data = '{"role":"DRIVER"}'::jsonb`;
    snapshot = await report();
    assert.equal(snapshot.categories.AUTH_LINK_MISMATCH, 1);
    assert.equal(snapshot.categories.LINKS_CONSISTENT, undefined);
    // Bulk fixture rows prove the cap is not a claim of full coverage.
    await first.idempotencyKey.createMany({ data: Array.from({ length: 1001 }, () => ({
      ...reservationData, key: storageKey(randomUUID()), isLocked: true,
    })) });
    snapshot = await report();
    assert.equal(snapshot.sampled, 1000);
    assert.equal(snapshot.truncated, true);
    assert.equal(Object.values(snapshot.categories).reduce((sum, n) => sum + n, 0), 1000);
    assert.equal(await first.idempotencyKey.count(), 1008);
    console.log("PASS bounded read-only reconciliation report: missing links, malformed receipts, aged locks, scope and overflow");

  } finally {
    const disconnected = await Promise.allSettled(clients.map(client => client.$disconnect()));
    // PostgreSQL must shut down cleanly to unlink its own Unix socket and lock
    // file. SIGKILL (docker rm -f) can leave those entries in the bind mount,
    // whose permissions are managed by the postgres container user.
    try {
      await docker(["stop", "--time", "10", name], 20000);
    } catch (error) {
      if (!error.stderr?.includes("No such container")) {
        // Contain a failed shutdown, but do not report a passing test.
        await docker(["rm", "-f", name]);
        throw error;
      }
    }
    // An empty mounted directory can be removed through its writable parent
    // regardless of container UID. Do not recursively traverse a Unix socket.
    fs.rmdirSync(socket);
    fs.rmdirSync(directory);
    for (const result of disconnected) {
      if (result.status === "rejected") throw result.reason;
    }
  }
  // Success includes cleanup, not just the database assertions.
  console.log("TAD_ADVERTISER_PRISMA_INTEGRATION_PASS");
}

if (process.platform !== "linux" || process.argv.length !== 3 || process.argv[2] !== "--isolated-docker") {
  console.error("Refused: use --isolated-docker on Linux with a fresh fixture");
  process.exitCode = 2;
} else {
  verify().catch(error => {
    console.error("TAD_ADVERTISER_PRISMA_INTEGRATION_FAIL:", error.message);
    process.exitCode = 1;
  });
}
