"use strict";

// Real PaymentEvidenceService with two Prisma clients in a disposable database.
// Never connect to an ambient DATABASE_URL or an external database.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { setTimeout: delay } = require("node:timers/promises");
const exec = promisify(execFile);
const api = path.resolve(__dirname, "..");
const schema = path.join(api, "prisma/schema.prisma");
const db = "tad_payment_prisma_fixture";
const name = "tad-payment-prisma-" + randomUUID();

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
  const statements = full.split(";").map(part =>
    part.split("\n").filter(line => !line.trim().startsWith("--")).join("\n").trim()
  ).filter(Boolean);
  const tables = ["drivers", "advertisers", "leads", "payment_intents", "payment_evidence",
    "payment_verifications", "referral_attributions", "commissions", "human_review_tasks"];
  const selected = [];
  const enumDDL = statements.filter(s => s.startsWith('CREATE TYPE "SystemStatus" AS ENUM'));
  assert.equal(enumDDL.length, 1, "Missing generated SystemStatus");
  selected.push(enumDDL[0]);
  for (const table of tables) {
    const matches = statements.filter(s => s.startsWith('CREATE TABLE "' + table + '" ('));
    assert.equal(matches.length, 1, "Missing generated table " + table);
    selected.push(matches[0]);
  }
  for (const statement of statements) {
    const index = statement.match(/^CREATE (?:UNIQUE )?INDEX "[^"]+" ON "([^"]+)"/);
    if (index && tables.includes(index[1])) selected.push(statement);
    const fk = statement.match(/^ALTER TABLE "([^"]+)" ADD CONSTRAINT .* REFERENCES "([^"]+)"/);
    if (fk && tables.includes(fk[1]) && tables.includes(fk[2])) selected.push(statement);
  }
  for (const [table, column] of [["payment_evidence", "payment_intent_id"],
    ["payment_verifications", "payment_intent_id"], ["referral_attributions", "lead_id"],
    ["commissions", "reference"]]) {
    assert.ok(selected.some(s => s.startsWith("CREATE UNIQUE INDEX") &&
      s.includes(' ON "' + table + '"("' + column + '")')),
    "Missing generated unique constraint: " + table + "." + column);
  }
  return selected.join(";\n") + ";";
}

// Gate the initial read on both clients. All reads/writes and transactions
// still go through generated Prisma; only their starting order is controlled.
function pairedServices(Service, first, second) {
  let arrived = 0;
  let release;
  const barrier = new Promise(resolve => { release = resolve; });
  return [first, second].map(client => new Service({
    paymentEvidence: {
      async findUnique(args) {
        const row = await client.paymentEvidence.findUnique(args);
        if (++arrived === 2) release();
        await barrier;
        return row;
      },
    },
    $transaction: client.$transaction.bind(client),
  }, {}));
}

async function verify() {
  // Parent directory remains private to runner; Docker only mounts its socket child.
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tad-payment-"));
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
    await sql(selectFixtureDDL(diff.stdout));
    await sql("CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;");
    await sql(fs.readFileSync(path.join(api,
      "prisma/migrations/20261128_payment_intent_ownership_expand/migration.sql"), "utf8"));
    require("ts-node").register({ transpileOnly: true, project: path.join(api, "tsconfig.json") });
    const { PaymentEvidenceService } = require("../src/modules/payments/services/payment-evidence.service.ts");
    const service = new PaymentEvidenceService(first, {});
    const driver = await first.driver.create({ data: {
      fullName: "Synthetic Referrer", phone: "8095550101",
    } });
    async function lead(type = "ADVERTISER") {
      return first.lead.create({ data: {
        type, referrerId: driver.id, referrerCode: "FIXTURE",
      } });
    }
    async function payment(leadRow, type = "ADVERTISER_CAMPAIGN") {
      const intent = await first.paymentIntent.create({ data: {
        type, amount: 1000, reference: randomUUID(),
        idempotencyKey: randomUUID(), status: "PENDING", leadId: leadRow.id,
      } });
      const evidence = await service.submitEvidence({
        paymentIntentId: intent.id, fileUrl: "https://fixture.invalid/receipt",
        submittedBy: "fixture-submitter",
      });
      return { intent, evidence };
    }
    const decision = (payment, status, reviewer) => ({
      evidenceId: payment.evidence.id, expectedSubmittedAt: payment.evidence.submittedAt, status, reviewedBy: reviewer,
    });
    async function verifyPayment(payment, status) {
      const row = await first.paymentIntent.findUniqueOrThrow({
        where: { id: payment.intent.id }, include: {
          paymentEvidence: true, paymentVerification: true,
        },
      });
      const confirmed = status === "PAYMENT_CONFIRMED";
      assert.equal(row.status, confirmed ? "PAID" : "REJECTED");
      assert.equal(row.paymentEvidence.reviewStatus, status);
      assert.equal(Boolean(row.paymentVerification), confirmed);
      const tasks = await first.humanReviewTask.findMany({
        where: { entityId: payment.evidence.id, entityType: "PaymentEvidence" },
      });
      assert.equal(tasks.length, 1);
      assert.equal(tasks[0].status, confirmed ? "APPROVED" : "REJECTED");
    }
    async function verifyCommission(leadRow, expected, sourceType = "ADVERTISER_SALE") {
      const rows = await first.commission.findMany({
        where: { driverId: driver.id, metadata: { path: ["leadId"], equals: leadRow.id } },
      });
      assert.equal(rows.length, expected);
      const attribution = await first.referralAttribution.findUnique({ where: { leadId: leadRow.id } });
      if (expected) {
        assert.equal(rows[0].amount, 500);
        assert.equal(rows[0].status, "PENDING");
        assert.equal(rows[0].sourceType, sourceType);
        assert.equal(attribution.commissionCreated, true);
        assert.equal(attribution.commissionId, rows[0].reference);
      } else {
        assert.equal(attribution, null);
      }
    }

    // EXPAND migration uses the real SQL, not merely Prisma-generated DDL.
    const ownerLead = await lead("DRIVER");
    const ownerPayment = await payment(ownerLead, "DRIVER_SUBSCRIPTION");
    const advertiser = await first.advertiser.create({ data: {
      companyName: "Synthetic Owner", contactName: "Fixture",
      email: "owner@example.invalid",
    } });
    const ownerId = ownerPayment.intent.id;
    assert.equal(await first.paymentIntentOwner.count(), 0);
    const assignment = { paymentIntentId: ownerId, assignedBy: "fixture-operator" };
    await assert.rejects(first.paymentIntentOwner.create({ data: assignment }));
    await assert.rejects(first.paymentIntentOwner.create({ data: {
      ...assignment, driverId: driver.id, advertiserId: advertiser.id,
    } }));
    await assert.rejects(first.paymentIntentOwner.create({ data: {
      ...assignment, driverId: randomUUID(),
    } }));
    await assert.rejects(first.paymentIntentOwner.create({ data: {
      ...assignment, driverId: driver.id, assignedBy: " ",
    } }));
    await first.paymentIntentOwner.create({ data: { ...assignment, driverId: driver.id } });
    await assert.rejects(first.paymentIntentOwner.create({ data: {
      ...assignment, advertiserId: advertiser.id,
    } }));
    assert.equal(await first.paymentIntentOwner.count(), 1);
    const storedOwner = await second.paymentIntentOwner.findUniqueOrThrow({
      where: { paymentIntentId: ownerId },
    });
    assert.equal(storedOwner.driverId, driver.id);
    assert.equal(storedOwner.advertiserId, null);
    const advertiserLead = await lead();
    const advertiserPayment = await payment(advertiserLead);
    await first.paymentIntentOwner.create({ data: {
      paymentIntentId: advertiserPayment.intent.id, advertiserId: advertiser.id,
      assignedBy: "fixture-operator",
    } });
    assert.equal(await first.paymentIntentOwner.count(), 2);
    assert.equal(await sql("SELECT relrowsecurity FROM pg_class WHERE oid = 'payment_intent_owners'::regclass"), "t");
    assert.equal(await sql("SELECT has_table_privilege('anon', 'payment_intent_owners', 'SELECT')"), "f");
    assert.equal(await sql("SELECT has_table_privilege('authenticated', 'payment_intent_owners', 'INSERT')"), "f");
    console.log("PASS additive ownership registry: one explicit owner, foreign keys, actor and RLS");

    const sameLead = await lead();
    const same = await payment(sameLead);
    let [a, b] = pairedServices(PaymentEvidenceService, first, second);
    const identical = await Promise.all([
      a.reviewEvidence(decision(same, "PAYMENT_CONFIRMED", "fixture-a")),
      b.reviewEvidence(decision(same, "PAYMENT_CONFIRMED", "fixture-b")),
    ]);
    assert.ok(identical.every(row => row.reviewStatus === "PAYMENT_CONFIRMED"));
    assert.equal(identical[0].reviewedBy, identical[1].reviewedBy);
    await verifyPayment(same, "PAYMENT_CONFIRMED");
    await verifyCommission(sameLead, 1);
    console.log("PASS same decision concurrently replays one committed result");

    const opposingLead = await lead();
    const opposing = await payment(opposingLead);
    [a, b] = pairedServices(PaymentEvidenceService, first, second);
    const conflicting = await Promise.allSettled([
      a.reviewEvidence(decision(opposing, "PAYMENT_CONFIRMED", "fixture-a")),
      b.reviewEvidence(decision(opposing, "REJECTED", "fixture-b")),
    ]);
    const winner = conflicting.filter(row => row.status === "fulfilled");
    const loser = conflicting.filter(row => row.status === "rejected");
    assert.equal(winner.length, 1);
    assert.equal(loser.length, 1);
    assert.equal(loser[0].reason.getStatus(), 409);
    const finalStatus = winner[0].value.reviewStatus;
    await verifyPayment(opposing, finalStatus);
    await verifyCommission(opposingLead, finalStatus === "PAYMENT_CONFIRMED" ? 1 : 0);
    console.log("PASS opposing decisions leave one coherent terminal state");

    for (const preexisting of [false, true]) {
      const shared = await lead("DRIVER");
      if (preexisting) {
        await first.referralAttribution.create({ data: {
          leadId: shared.id, referrerId: driver.id, referrerCode: "FIXTURE",
        } });
      }
      const [one, two] = await Promise.all([
        payment(shared, "DRIVER_SUBSCRIPTION"), payment(shared, "DRIVER_SUBSCRIPTION"),
      ]);
      [a, b] = pairedServices(PaymentEvidenceService, first, second);
      await Promise.all([
        a.reviewEvidence(decision(one, "PAYMENT_CONFIRMED", "fixture-a")),
        b.reviewEvidence(decision(two, "PAYMENT_CONFIRMED", "fixture-b")),
      ]);
      await verifyPayment(one, "PAYMENT_CONFIRMED");
      await verifyPayment(two, "PAYMENT_CONFIRMED");
      await verifyCommission(shared, 1, "DRIVER_REFERRAL");
    }
    console.log("PASS distinct intents on one lead create one commission, with or without prior attribution");

    // Pause after the actual database read, before allowing its writer to proceed.
    function readGate() {
      let entered, release;
      const arrived = new Promise(resolve => { entered = resolve; });
      const resume = new Promise(resolve => { release = resolve; });
      return { arrived, release, async pause(row) { entered(); await resume; return row; } };
    }
    const resubmit = payment => ({
      paymentIntentId: payment.intent.id,
      fileUrl: "https://fixture.invalid/replacement",
      submittedBy: "fixture-submitter",
    });

    const staleLead = await lead();
    const stale = await payment(staleLead);
    const future = new Date(Date.now() + 60000);
    await first.paymentEvidence.update({
      where: { id: stale.evidence.id }, data: { submittedAt: future },
    });
    stale.evidence.submittedAt = future;
    const reviewGate = readGate();
    const pausedReviewer = new PaymentEvidenceService({
      paymentEvidence: {
        async findUnique(args) {
          return reviewGate.pause(await second.paymentEvidence.findUnique(args));
        },
      },
      $transaction: second.$transaction.bind(second),
    }, {});
    const oldReview = pausedReviewer.reviewEvidence(decision(stale, "PAYMENT_CONFIRMED", "fixture-a"));
    const rejectedOldReview = assert.rejects(oldReview, error => error.getStatus() === 409);
    await reviewGate.arrived;
    try {
      const replacement = await service.submitEvidence(resubmit(stale));
      assert.equal(replacement.submittedAt.getTime(), future.getTime() + 1);
      assert.equal(replacement.fileUrl, resubmit(stale).fileUrl);
      // A different reviewer can confirm the replacement before the old
      // transaction resumes; identical status alone is not an idempotent replay.
      // Simulate an old browser submitting after the replacement committed.
      await assert.rejects(
        service.reviewEvidence(decision(stale, "PAYMENT_CONFIRMED", "fixture-old-browser")),
        error => error.getStatus() === 409 &&
          error.getResponse().code === "PAYMENT_EVIDENCE_VERSION_CONFLICT",
      );
      const fresh = { ...stale, evidence: replacement };
      await service.reviewEvidence(decision(fresh, "PAYMENT_CONFIRMED", "fixture-b"));
      await assert.rejects(
        service.reviewEvidence(decision(stale, "PAYMENT_CONFIRMED", "fixture-old-browser")),
        error => error.getStatus() === 409,
      );
    } finally {
      reviewGate.release();
    }
    await rejectedOldReview;
    await verifyPayment(stale, "PAYMENT_CONFIRMED");
    await verifyCommission(staleLead, 1);
    console.log("PASS replacement advances version; stale review cannot replay a newer decision");

    const winningLead = await lead();
    const winning = await payment(winningLead);
    const submitGate = readGate();
    const pausedSubmitter = new PaymentEvidenceService({
      $transaction(callback) {
        return second.$transaction(tx => callback({
          paymentIntent: tx.paymentIntent,
          paymentEvidence: {
            async findFirst(args) {
              return submitGate.pause(await tx.paymentEvidence.findFirst(args));
            },
            updateMany: tx.paymentEvidence.updateMany.bind(tx.paymentEvidence),
            findUniqueOrThrow: tx.paymentEvidence.findUniqueOrThrow.bind(tx.paymentEvidence),
          },
        }));
      },
    }, {});
    const oldSubmit = pausedSubmitter.submitEvidence(resubmit(winning));
    const rejectedOldSubmit = assert.rejects(oldSubmit, error => error.getStatus() === 409);
    await submitGate.arrived;
    try {
      await service.reviewEvidence(decision(winning, "PAYMENT_CONFIRMED", "fixture-a"));
    } finally {
      submitGate.release();
    }
    await rejectedOldSubmit;
    await verifyPayment(winning, "PAYMENT_CONFIRMED");
    await verifyCommission(winningLead, 1);
    const finalEvidence = await first.paymentEvidence.findUniqueOrThrow({
      where: { id: winning.evidence.id },
    });
    assert.equal(finalEvidence.fileUrl, winning.evidence.fileUrl);
    console.log("PASS stale resubmission cannot reopen confirmed evidence");

    const rollbackLead = await lead();
    const rollbackPayment = await payment(rollbackLead);
    // A real SQL constraint fails AFTER the payment, verification, commission
    // and attribution writes, when the final lead conversion is attempted.
    assert.match(rollbackLead.id, /^[a-f0-9-]{36}$/);
    await sql("ALTER TABLE leads ADD CONSTRAINT fixture_reject_conversion CHECK (id <> '" +
      rollbackLead.id + "' OR status <> 'CONVERTED')");
    await assert.rejects(
      service.reviewEvidence(decision(rollbackPayment, "PAYMENT_CONFIRMED", "fixture-a")),
      error => error.code === "P2004" || /fixture_reject_conversion/.test(error.message),
    );
    const rolled = await first.paymentIntent.findUniqueOrThrow({
      where: { id: rollbackPayment.intent.id },
      include: { paymentEvidence: true, paymentVerification: true },
    });
    assert.equal(rolled.status, "UNDER_REVIEW");
    assert.equal(rolled.paymentEvidence.reviewStatus, "SUBMITTED");
    assert.equal(rolled.paymentVerification, null);
    assert.equal((await first.humanReviewTask.findFirstOrThrow({
      where: { entityId: rollbackPayment.evidence.id },
    })).status, "PENDING");
    await verifyCommission(rollbackLead, 0);
    assert.equal((await first.lead.findUniqueOrThrow({ where: { id: rollbackLead.id } })).status, "NEW");
    await sql("ALTER TABLE leads DROP CONSTRAINT fixture_reject_conversion");
    await service.reviewEvidence(decision(rollbackPayment, "PAYMENT_CONFIRMED", "fixture-b"));
    await verifyPayment(rollbackPayment, "PAYMENT_CONFIRMED");
    await verifyCommission(rollbackLead, 1);
    console.log("PASS database failure rolls back all effects and a retry succeeds");

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
  console.log("TAD_PAYMENT_PRISMA_INTEGRATION_PASS");
}

if (process.platform !== "linux" || process.argv.length !== 3 || process.argv[2] !== "--isolated-docker") {
  console.error("Refused: use --isolated-docker on Linux with a fresh fixture");
  process.exitCode = 2;
} else {
  verify().catch(error => {
    console.error("TAD_PAYMENT_PRISMA_INTEGRATION_FAIL:", error.message);
    process.exitCode = 1;
  });
}
