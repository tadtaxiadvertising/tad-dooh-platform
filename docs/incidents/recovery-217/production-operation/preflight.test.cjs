"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  pinnedConnection,
  pinnedSettings,
  readSnapshot,
} = require("./preflight.cjs");
const ref = "abcdefghijklmnopqrst";
const env = {
  SUPABASE_URL: `https://${ref}.supabase.co`,
  DATABASE_URL: `postgresql://postgres:fixture@db.${ref}.supabase.co:5432/postgres`,
  DIRECT_URL: `postgresql://postgres:fixture@db.${ref}.supabase.co:5432/postgres?sslmode=disable&sslaccept=accept_invalid_certs`,
};

test("pin mismatch rejects before a client is constructed", () => {
  assert.throws(() => pinnedConnection(env, "bcdefghijklmnopqrstu"), {
    code: "TARGET_MISMATCH",
  });
  assert.throws(() => pinnedConnection(env, ""), {
    code: "EXPECTED_REF_REQUIRED",
  });
});

test("connection requires encrypted transport and strict certificate validation", () => {
  const url = new URL(pinnedConnection(env, ref));
  assert.equal(url.searchParams.get("sslmode"), "require");
  assert.equal(url.searchParams.get("sslaccept"), "strict");
  assert.equal(url.hostname, `db.${ref}.supabase.co`);
});

function client(readOnly, ssl, observed) {
  return {
    $transaction: async (fn) =>
      fn({
        $executeRawUnsafe: async (sql) => observed.push(sql),
        $queryRawUnsafe: async (sql) => {
          observed.push(sql);
          if (sql === "SHOW transaction_read_only") {
            return [{ transaction_read_only: readOnly }];
          }
          if (sql.includes("pg_stat_ssl")) return [{ ssl }];
          throw new Error("catalog_query_must_not_run");
        },
      }),
  };
}

test("missing read-only transaction stops before catalog access", async () => {
  const queries = [];
  await assert.rejects(readSnapshot(client("off", true, queries)), {
    code: "READ_ONLY_REQUIRED",
  });
  assert.equal(
    queries.some((q) => q.includes("pg_class")),
    false,
  );
});

test("plaintext backend stops before catalog access", async () => {
  const queries = [];
  await assert.rejects(readSnapshot(client("on", false, queries)), {
    code: "BACKEND_TLS_REQUIRED",
  });
  assert.equal(
    queries.some((q) => q.includes("pg_class")),
    false,
  );
});

test("Prisma socket/host override cannot bypass the pinned hostname", () => {
  assert.throws(
    () =>
      pinnedConnection(
        { ...env, DIRECT_URL: env.DIRECT_URL + "&host=/tmp" },
        ref,
      ),
    { code: "TRANSPORT_HOST_OVERRIDE_REFUSED" },
  );
});

test("an explicit CA file must have an absolute path", () => {
  assert.throws(
    () =>
      pinnedConnection({ ...env, TAD_DATABASE_CA_CERT: "relative.crt" }, ref),
    { code: "ABSOLUTE_CA_PATH_REQUIRED" },
  );
});

test("transaction pool cannot carry the session identity markers", () => {
  assert.throws(
    () =>
      pinnedConnection(
        { ...env, DIRECT_URL: env.DIRECT_URL.replace(":5432/", ":6543/") },
        ref,
      ),
    { code: "SESSION_CONNECTION_REQUIRED" },
  );
});

test("pooler backend TLS is reported separately from strict client TLS", async () => {
  const pooler = {
    ...env,
    DIRECT_URL: `postgresql://postgres.${ref}:fixture@aws-0-us-west-2.pooler.supabase.com:5432/postgres`,
  };
  const connection = pinnedSettings(pooler, ref);
  assert.equal(connection.connectionKind, "session-pooler");
  const prisma = {
    $transaction: async (fn) =>
      fn({
        $executeRawUnsafe: async () => {},
        $queryRawUnsafe: async (sql) =>
          sql === "SHOW transaction_read_only"
            ? [{ transaction_read_only: "on" }]
            : sql.includes("pg_stat_ssl")
              ? [{ ssl: false }]
              : [{ digest: "a".repeat(64) }],
      }),
  };
  const result = await readSnapshot(prisma, connection);
  assert.equal(result.backendTlsObserved, false);
  assert.equal(result.readOnlyTransactionVerified, true);
});
