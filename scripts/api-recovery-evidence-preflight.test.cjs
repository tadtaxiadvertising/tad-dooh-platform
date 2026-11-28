"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { inspectRecoveryEvidence, SUCCESS } = require("./api-recovery-evidence-preflight.cjs");

const root = path.parse(process.cwd()).root;
const privatePath = name => path.join(root, "tad-private-" + name);
const ENV = Object.freeze({
  TAD_EXPECTED_SUPABASE_PROJECT_REF: "abcdefghijklmnopqrst",
  TAD_EXPECTED_STORAGE_OBJECT_COUNT: "11",
  TAD_RECOVERY_SQL_EXPORT_DIR: privatePath("sql-a"),
  TAD_RECOVERY_STORAGE_EXPORT_DIR: privatePath("storage-b"),
  TAD_RECOVERY_SOURCE_AGGREGATES_FILE: privatePath("source-c.json"),
  TAD_RECOVERY_CLONE_AGGREGATES_FILE: privatePath("clone-d.json"),
});
const mock = (override = {}) => ({
  checkExport: async () => "EXPORT_INTEGRITY_PASS_RESTORE_UNVERIFIED",
  checkStorageExport: async () => "STORAGE_BYTES_HASHED_COVERAGE_AND_RESTORE_UNVERIFIED",
  compareSnapshots: async () => ({ code: "AGGREGATES_MATCH_RESTORE_UNVERIFIED" }),
  ...override,
});

test("all passing components still return RESTORE_UNVERIFIED, never release approval", async () => {
  assert.deepEqual(await inspectRecoveryEvidence(ENV, mock()), { code: SUCCESS });
  assert.match(SUCCESS, /RESTORE_UNVERIFIED/);
});
test("does not invoke verifiers with unapproved target", async () => {
  let calls = 0;
  const fail = async () => { calls++; throw Error("must not run"); };
  assert.deepEqual(await inspectRecoveryEvidence(
    { ...ENV, TAD_EXPECTED_SUPABASE_PROJECT_REF: "wrong" },
    mock({ checkExport: fail }),
  ), { code: "EXPECTED_REF_REQUIRED" });
  assert.equal(calls, 0);
});
test("refuses missing, negative, fractional, excessive or noncanonical object counts", async () => {
  for (const count of ["", "-1", "01", "1.5", "1e5", "9007199254740992"]) {
    assert.deepEqual(
      await inspectRecoveryEvidence({ ...ENV, TAD_EXPECTED_STORAGE_OBJECT_COUNT: count }, mock()),
      { code: "SOURCE_OBJECT_COUNT_REQUIRED" },
    );
  }
});
test("requires private absolute distinct input paths", async () => {
  assert.deepEqual(
    await inspectRecoveryEvidence({ ...ENV, TAD_RECOVERY_SQL_EXPORT_DIR: "relative" }, mock()),
    { code: "PRIVATE_ABSOLUTE_PATHS_REQUIRED" },
  );
  assert.deepEqual(await inspectRecoveryEvidence({
    ...ENV, TAD_RECOVERY_SOURCE_AGGREGATES_FILE: ENV.TAD_RECOVERY_CLONE_AGGREGATES_FILE,
  }, mock()), { code: "EVIDENCE_PATHS_MUST_BE_DISTINCT" });
});
test("rejects any failing SQL/Storage/aggregate component", async () => {
  const cases = [
    [{ checkExport: async () => "EXPORT_MISMATCH" }, "SQL_EXPORT_CHECK_REFUSED"],
    [{ checkStorageExport: async () => "STORAGE_HASH_MISMATCH" }, "STORAGE_BYTES_CHECK_REFUSED"],
    [{ compareSnapshots: async () => ({ code: "AGGREGATES_DIFFER" }) }, "AGGREGATE_RESTORE_CHECK_REFUSED"],
  ];
  for (const [override, code] of cases) {
    assert.deepEqual(await inspectRecoveryEvidence(ENV, mock(override)), { code });
  }
});
test("does not leak sensitive exception details to returned verdict", async () => {
  const secret = "private-fake-secret-token";
  assert.deepEqual(
    await inspectRecoveryEvidence(ENV, mock({ checkExport: async () => { throw Error(secret); } })),
    { code: "PRIVATE_EVIDENCE_CHECK_FAILED" },
  );
});
test("CLI never exits zero; missing inputs cause sanitized refusal", () => {
  const script = path.join(__dirname, "api-recovery-evidence-preflight.cjs");
  const r = spawnSync(process.execPath, [script], {
    encoding: "utf8", env: { PATH: process.env.PATH }, timeout: 5000,
  });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /EXPECTED_REF_REQUIRED/);
  assert.doesNotMatch(r.stderr, /private-fake-secret-token/);
});
