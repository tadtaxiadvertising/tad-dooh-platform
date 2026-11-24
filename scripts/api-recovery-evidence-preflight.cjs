#!/usr/bin/env node
"use strict";

// TAD #217: offline validation only. This NEVER proves isolated restoration,
// authorizes schema changes, opens a database connection, or reads credentials.
const path = require("node:path");
const SUCCESS = "RECOVERY_COMPONENTS_MATCH_RESTORE_UNVERIFIED";
const REF = /^[a-z0-9]{20}$/;
const COUNT = /^(0|[1-9][0-9]*)$/;
const LOCATIONS = [
  "TAD_RECOVERY_SQL_EXPORT_DIR",
  "TAD_RECOVERY_STORAGE_EXPORT_DIR",
  "TAD_RECOVERY_SOURCE_AGGREGATES_FILE",
  "TAD_RECOVERY_CLONE_AGGREGATES_FILE",
];

async function inspectRecoveryEvidence(env, dependencies) {
  if (!REF.test(env.TAD_EXPECTED_SUPABASE_PROJECT_REF || "")) {
    return { code: "EXPECTED_REF_REQUIRED" };
  }
  const count = env.TAD_EXPECTED_STORAGE_OBJECT_COUNT || "";
  if (!COUNT.test(count) || !Number.isSafeInteger(Number(count))) {
    return { code: "SOURCE_OBJECT_COUNT_REQUIRED" };
  }
  if (LOCATIONS.some(name => typeof env[name] !== "string" ||
      !path.isAbsolute(env[name]) || env[name].trim() !== env[name])) {
    return { code: "PRIVATE_ABSOLUTE_PATHS_REQUIRED" };
  }
  const paths = LOCATIONS.map(name => path.resolve(env[name]));
  if (new Set(paths).size !== paths.length) {
    return { code: "EVIDENCE_PATHS_MUST_BE_DISTINCT" };
  }
  try {
    const { checkExport, checkStorageExport, compareSnapshots } = dependencies;
    const sql = await checkExport(paths[0], env.TAD_EXPECTED_SUPABASE_PROJECT_REF);
    if (sql !== "EXPORT_INTEGRITY_PASS_RESTORE_UNVERIFIED") {
      return { code: "SQL_EXPORT_CHECK_REFUSED" };
    }
    const storage = await checkStorageExport(paths[1], env.TAD_EXPECTED_SUPABASE_PROJECT_REF, count);
    if (storage !== "STORAGE_BYTES_HASHED_COVERAGE_AND_RESTORE_UNVERIFIED") {
      return { code: "STORAGE_BYTES_CHECK_REFUSED" };
    }
    const aggregate = await compareSnapshots(paths[2], paths[3]);
    if (aggregate?.code !== "AGGREGATES_MATCH_RESTORE_UNVERIFIED") {
      return { code: "AGGREGATE_RESTORE_CHECK_REFUSED" };
    }
    return { code: SUCCESS };
  } catch {
    // File paths, object names, contents, and secret-bearing errors are private.
    return { code: "PRIVATE_EVIDENCE_CHECK_FAILED" };
  }
}

module.exports = { inspectRecoveryEvidence, SUCCESS };

if (require.main === module) {
  // Load local verifier modules only *after* the target and paths are valid;
  // malformed invocation must not trigger filesystem reads or verbose errors.
  const checkExport = (...args) =>
    require("./verify-supabase-backup-export.cjs").checkExport(...args);
  const checkStorageExport = (...args) =>
    require("./verify-supabase-storage-byte-export.cjs").checkStorageExport(...args);
  const compareSnapshots = (...args) =>
    require("./compare-supabase-restore-snapshots.cjs").compareSnapshots(...args);
  inspectRecoveryEvidence(process.env, { checkExport, checkStorageExport, compareSnapshots })
    .then(result => {
      if (result.code === SUCCESS) {
        console.log(SUCCESS + ": local components inspected; Auth restore, remote Storage bytes, encrypted off-site copy, isolated recovery, approvals and production release remain UNVERIFIED.");
        // Deliberately nonzero, so this preflight cannot accidentally permit
        // a release pipeline or a production database migration.
        process.exitCode = 2;
      } else {
        console.error("TAD_RECOVERY_EVIDENCE_REFUSED (" + result.code + "). No database or network access attempted.");
        process.exitCode = 1;
      }
    })
    .catch(() => {
      console.error("TAD_RECOVERY_EVIDENCE_REFUSED (UNEXPECTED_ERROR).");
      process.exitCode = 1;
    });
}
