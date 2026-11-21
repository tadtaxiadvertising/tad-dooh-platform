"use strict";

// Synthetic seed entrypoints are local development tools, never production
// recovery actions. Refuse all non-local destinations before creating PrismaClient.
function assertLocalSeedAllowed(env) {
  const reject = (reason) => {
    throw new Error(`[seed] REFUSED (${reason}). No database connection attempted.`);
  };

  if (env.NODE_ENV !== "development" && env.NODE_ENV !== "test") {
    reject("NON_DEVELOPMENT_ENVIRONMENT");
  }
  if (env.TAD_APPROVE_LOCAL_SEED !== "YES") {
    reject("EXPLICIT_LOCAL_APPROVAL_REQUIRED");
  }
  if (!env.DATABASE_URL) {
    reject("DATABASE_URL_REQUIRED");
  }

  let parsed;
  try {
    parsed = new URL(env.DATABASE_URL);
  } catch {
    reject("UNVERIFIABLE_DATABASE_TARGET");
  }
  if (
    !["postgresql:", "postgres:"].includes(parsed.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)
  ) {
    reject("NON_LOCAL_DATABASE_TARGET");
  }
}

module.exports = { assertLocalSeedAllowed };
