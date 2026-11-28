#!/usr/bin/env node
"use strict";

// Only local development can run prisma migrate dev. Never execute against a
// cloud database while incident #217 has an unresolved/restoration-untested
// production schema. This guards the npm script, not direct Prisma CLI use.
function inspectLocalMigration(env) {
  if (!["development", "test"].includes(env.NODE_ENV)) {
    return "NON_DEVELOPMENT_ENVIRONMENT";
  }
  if (env.TAD_APPROVE_LOCAL_MIGRATION !== "YES") {
    return "EXPLICIT_LOCAL_APPROVAL_REQUIRED";
  }
  // A pinned Supabase project signals operator/production routing; even a
  // loopback-looking URL can be an SSH tunnel to a production DB.
  if (env.TAD_EXPECTED_SUPABASE_PROJECT_REF) {
    return "PINNED_SUPABASE_PROJECT_PRESENT";
  }
  if (!env.DATABASE_URL) return "DATABASE_URL_REQUIRED";
  let parsed;
  try {
    parsed = new URL(env.DATABASE_URL);
  } catch {
    return "UNVERIFIABLE_DATABASE_TARGET";
  }
  if (
    !["postgresql:", "postgres:"].includes(parsed.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)
  ) {
    return "NON_LOCAL_DATABASE_TARGET";
  }
  return null;
}

module.exports = { inspectLocalMigration };

if (require.main === module) {
  const reason = inspectLocalMigration(process.env);
  if (reason) {
    // No user credentials, URL, hostname or environment values in logs.
    console.error("[migration] REFUSED (" + reason + "). No database connection attempted.");
    process.exitCode = 1;
  } else {
    console.log("[migration] Approved for local development DB only. Not a production recovery.");
  }
}
