#!/usr/bin/env node
"use strict";

// Operator-only PRECHECK for an explicitly authorized Supabase project ref.
// It never connects to PostgreSQL, migrates anything or prints connection URLs.
// The expected ref must come from independent infrastructure-owner verification,
// not from a repository template or an older production-check script.
const {
  projectRefFromSupabaseUrl,
  projectRefFromDatabaseUrl,
} = require("../apps/api/scripts/check-supabase-target.cjs");

const REF_PATTERN = /^[a-z0-9]{20}$/;

function inspectPinnedSupabaseTarget(env) {
  const expected = (env.TAD_EXPECTED_SUPABASE_PROJECT_REF || "")
    .trim()
    .toLowerCase();
  if (!REF_PATTERN.test(expected)) {
    return { ok: false, code: "EXPECTED_REF_REQUIRED" };
  }

  const references = [
    projectRefFromSupabaseUrl(env.SUPABASE_URL),
    projectRefFromDatabaseUrl(env.DATABASE_URL),
    projectRefFromDatabaseUrl(env.DIRECT_URL),
  ];
  // Unlike the runtime compatibility guard, do not infer a pooler project
  // ref from a bare "postgres" username: that target cannot be verified.
  if (references.some((ref) => !ref)) {
    return { ok: false, code: "UNVERIFIABLE_TARGET" };
  }
  if (references.some((ref) => ref !== expected)) {
    return { ok: false, code: "TARGET_MISMATCH" };
  }
  return { ok: true, code: "TARGET_MATCH" };
}

module.exports = { inspectPinnedSupabaseTarget };

if (require.main === module) {
  const result = inspectPinnedSupabaseTarget(process.env);
  if (!result.ok) {
    console.error(
      `[TAD] Target identity precheck REFUSED (${result.code}). ` +
        "Do not run backups, migrations or deploys. No DB connection attempted.",
    );
    process.exitCode = 1;
  } else {
    console.log(
      "TAD_TARGET_PRECHECK_MATCH: three configured project references match " +
        "the independently supplied expected ref. No DB connection attempted.",
    );
  }
}
