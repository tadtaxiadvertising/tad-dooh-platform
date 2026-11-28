#!/usr/bin/env node
"use strict";

// #217: Compare ONLY aggregate snapshots produced by the read-only restore
// baseline SQL. Equal counts do NOT prove backup coverage, Storage object bytes,
// Auth restoration, isolation, encryption, or an approved production migration.
// Never log snapshot paths, contents, credentials or row values.
const fs = require("node:fs");
const path = require("node:path");

const FIELDS = Object.freeze({
  public_tables: "count",
  public_columns: "count",
  migration_history_rows: "count",
  migration_finished_rows: "count",
  historical_error_log_rows: "count",
  auth_user_rows: "count",
  storage_bucket_rows: "count",
  storage_object_metadata_rows: "count",
  system_settings_rows: "count",
  physical_public_foreign_keys: "count",
  public_tables_rls_enabled: "count",
  postgis_present: "boolean",
  commission_ledger_present: "boolean",
});
const MAX_BYTES = 16 * 1024;
const SUCCESS = "AGGREGATES_MATCH_RESTORE_UNVERIFIED";

function normalizedSnapshot(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const provided = Object.keys(value);
  const required = Object.keys(FIELDS);
  if (provided.length !== required.length || required.some(field => !Object.hasOwn(value, field))) return null;
  const result = {};
  for (const [field, type] of Object.entries(FIELDS)) {
    const v = value[field];
    if (type === "boolean") {
      if (typeof v !== "boolean") return null;
      result[field] = v;
    } else {
      const n = typeof v === "string" && /^(?:0|[1-9]\d*)$/.test(v) ? Number(v) : v;
      if (!Number.isSafeInteger(n) || n < 0) return null;
      result[field] = n;
    }
  }
  return result;
}

async function readSnapshot(name) {
  const filename = path.resolve(name);
  const before = await fs.promises.lstat(filename);
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1 ||
      before.size === 0 || before.size > MAX_BYTES) return null;
  const flags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0);
  const handle = await fs.promises.open(filename, flags);
  try {
    const opened = await handle.stat();
    if (!opened.isFile() || opened.nlink !== 1 || opened.size !== before.size ||
        opened.ino !== before.ino || opened.dev !== before.dev) return null;
    const chunks = [];
    let bytes = 0;
    for await (const chunk of handle.createReadStream({autoClose: false})) {
      bytes += chunk.length;
      if (bytes > MAX_BYTES) return null;
      chunks.push(chunk);
    }
    const after = await handle.stat();
    const named = await fs.promises.lstat(filename);
    if (!named.isFile() || named.isSymbolicLink() || named.nlink !== 1 ||
        named.ino !== after.ino || named.dev !== after.dev ||
        after.ino !== opened.ino || after.dev !== opened.dev ||
        after.size !== opened.size || after.mtimeMs !== opened.mtimeMs ||
        after.ctimeMs !== opened.ctimeMs || named.size !== after.size ||
        named.mtimeMs !== after.mtimeMs || named.ctimeMs !== after.ctimeMs) return null;
    return {identity: String(opened.dev) + ":" + String(opened.ino), data: normalizedSnapshot(JSON.parse(Buffer.concat(chunks).toString("utf8")))};
  } finally {
    await handle.close();
  }
}

async function compareSnapshots(sourceFile, cloneFile) {
  if (typeof sourceFile !== "string" || !sourceFile || typeof cloneFile !== "string" || !cloneFile) {
    return {code:"TWO_SNAPSHOTS_REQUIRED"};
  }
  try {
    const [source, clone] = await Promise.all([readSnapshot(sourceFile), readSnapshot(cloneFile)]);
    if (!source || !clone || !source.data || !clone.data) return {code:"INVALID_AGGREGATE_SNAPSHOT"};
    if (source.identity === clone.identity) return {code:"SOURCE_AND_CLONE_SAME_FILE"};
    const differentFields = Object.keys(FIELDS).filter(field => source.data[field] !== clone.data[field]);
    if (differentFields.length) return {code:"AGGREGATES_DIFFER", fields:differentFields};
    return {code:SUCCESS};
  } catch {
    return {code:"SNAPSHOT_READ_FAILED"};
  }
}

module.exports = {FIELDS, SUCCESS, normalizedSnapshot, compareSnapshots};

if (require.main === module) {
  compareSnapshots(process.argv[2], process.argv[3]).then(result => {
    if (result.code === SUCCESS) {
      console.log(SUCCESS + ": aggregate-only comparison passed; complete Auth/Storage backup and isolated restore remain UNVERIFIED.");
    } else {
      console.error("TAD_RESTORE_AGGREGATES_REFUSED (" + result.code + ")" +
        (result.fields ? " fields=" + result.fields.join(",") : "") +
        ". No DB or network access attempted.");
      process.exitCode = 1;
    }
  }).catch(() => {
    console.error("TAD_RESTORE_AGGREGATES_REFUSED (UNEXPECTED_ERROR).");
    process.exitCode = 1;
  });
}
