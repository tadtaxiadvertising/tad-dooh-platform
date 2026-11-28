"use strict";

// Operator library only. This module cannot apply DDL or commit a transition.
const fs = require("node:fs");
const path = require("node:path");
const {
  inspectPinnedSupabaseTarget,
} = require("../../../../scripts/verify-supabase-runtime-target.cjs");

function pinnedConnection(env, expectedRef) {
  const pin = inspectPinnedSupabaseTarget({
    ...env,
    TAD_EXPECTED_SUPABASE_PROJECT_REF: expectedRef,
  });
  if (!pin.ok) throw Object.assign(new Error(pin.code), { code: pin.code });
  const url = new URL(env.DIRECT_URL);
  if (url.searchParams.has("host")) {
    throw Object.assign(new Error("TRANSPORT_HOST_OVERRIDE_REFUSED"), {
      code: "TRANSPORT_HOST_OVERRIDE_REFUSED",
    });
  }
  if (url.port === "6543" || url.searchParams.get("pgbouncer") === "true") {
    throw Object.assign(new Error("SESSION_CONNECTION_REQUIRED"), {
      code: "SESSION_CONNECTION_REQUIRED",
    });
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw Object.assign(new Error("DATABASE_PROTOCOL_INVALID"), {
      code: "DATABASE_PROTOCOL_INVALID",
    });
  }
  // Migration/preflight connection, not the runtime pool. Require certificate
  // validation explicitly; never print or persist the resulting secret URL.
  url.searchParams.set("sslmode", "require");
  url.searchParams.set("sslaccept", "strict");
  url.searchParams.set("connection_limit", "1");
  if (env.TAD_DATABASE_CA_CERT) {
    if (!path.isAbsolute(env.TAD_DATABASE_CA_CERT)) {
      throw Object.assign(new Error("ABSOLUTE_CA_PATH_REQUIRED"), {
        code: "ABSOLUTE_CA_PATH_REQUIRED",
      });
    }
    url.searchParams.set("sslcert", env.TAD_DATABASE_CA_CERT);
  }
  return url.toString();
}

function pinnedSettings(env, expectedRef) {
  const url = pinnedConnection(env, expectedRef);
  return {
    url,
    connectionKind: new URL(url).hostname.endsWith(".pooler.supabase.com")
      ? "session-pooler"
      : "direct",
  };
}

async function readSnapshot(prisma, connection = { connectionKind: "direct" }) {
  if (!["direct", "session-pooler"].includes(connection.connectionKind)) {
    throw Object.assign(new Error("CONNECTION_KIND_INVALID"), {
      code: "CONNECTION_KIND_INVALID",
    });
  }
  const sql = fs.readFileSync(path.join(__dirname, "catalog.sql"), "utf8");
  const expression = sql
    .replace(/^--[^\n]*\n/, "")
    .replace(/ AS catalog;\s*$/, "")
    .slice(7);
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      await tx.$executeRawUnsafe("SET LOCAL statement_timeout='10s'");
      const ro = await tx.$queryRawUnsafe("SHOW transaction_read_only");
      if (ro[0]?.transaction_read_only !== "on") {
        throw Object.assign(new Error("READ_ONLY_REQUIRED"), {
          code: "READ_ONLY_REQUIRED",
        });
      }
      await tx.$executeRawUnsafe("SET LOCAL search_path=pg_catalog");
      const tls = await tx.$queryRawUnsafe(
        "SELECT coalesce((SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()),false) AS ssl",
      );
      // pg_stat_ssl describes pooler -> backend, not operator -> pooler. The
      // caller must construct Prisma with pinnedSettings().url for strict TLS.
      if (connection.connectionKind === "direct" && tls[0]?.ssl !== true) {
        throw Object.assign(new Error("BACKEND_TLS_REQUIRED"), {
          code: "BACKEND_TLS_REQUIRED",
        });
      }
      const result = await tx.$queryRawUnsafe(
        "SELECT encode(sha256(convert_to((" +
          expression +
          ")::text,'UTF8')),'hex') AS digest",
      );
      return {
        catalogSha256: result[0].digest,
        readOnlyTransactionVerified: true,
        connectionKind: connection.connectionKind,
        backendTlsObserved: tls[0]?.ssl === true,
        applicationRowsReturned: false,
        writeOperations: 0,
      };
    },
    { isolationLevel: "RepeatableRead", timeout: 30000 },
  );
}

module.exports = { pinnedConnection, pinnedSettings, readSnapshot };
