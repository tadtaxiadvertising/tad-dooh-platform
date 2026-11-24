"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { inspectPinnedSupabaseTarget } = require("./verify-supabase-runtime-target.cjs");
const { inspectSupabaseTarget } = require("../apps/api/scripts/check-supabase-target.cjs");

const ROOT = path.resolve(__dirname, "..");
const SCRIPT = path.join(__dirname, "verify-supabase-runtime-target.cjs");
const refA = "aaaaaaaaaaaaaaaaaaaa";
const refB = "bbbbbbbbbbbbbbbbbbbb";
const SECRET = "synthetic-secret-do-not-log";

function fixture(ref = refA) {
  return {
    TAD_EXPECTED_SUPABASE_PROJECT_REF: ref,
    SUPABASE_URL: `https://${ref}.supabase.co`,
    DATABASE_URL: `postgres://postgres.${ref}:${SECRET}@aws-0-us-west-2.pooler.supabase.com:5432/postgres`,
    DIRECT_URL: `postgres://postgres:${SECRET}@db.${ref}.supabase.co:5432/postgres`,
  };
}

test("accepts only independently pinned matching URLs", () => {
  assert.deepEqual(inspectPinnedSupabaseTarget(fixture()), {
    ok: true,
    code: "TARGET_MATCH",
  });
});

test("rejects three mutually consistent URLs when they target the wrong project", () => {
  const env = {
    ...fixture(refB),
    TAD_EXPECTED_SUPABASE_PROJECT_REF: refA,
  };
  // The compatibility check only tests URL-to-URL agreement and is not a
  // release-target authorization check. This is the regression scenario.
  assert.deepEqual(inspectSupabaseTarget(env), {
    ok: true,
    code: "TARGET_MATCH",
  });
  assert.deepEqual(inspectPinnedSupabaseTarget(env), {
    ok: false,
    code: "TARGET_MISMATCH",
  });
});

test("rejects missing expected project ref", () => {
  const env = fixture();
  delete env.TAD_EXPECTED_SUPABASE_PROJECT_REF;
  assert.equal(inspectPinnedSupabaseTarget(env).code, "EXPECTED_REF_REQUIRED");
});

test("rejects a mismatched direct DB target", () => {
  const env = fixture();
  env.DIRECT_URL = fixture(refB).DIRECT_URL;
  assert.equal(inspectPinnedSupabaseTarget(env).code, "TARGET_MISMATCH");
});

test("rejects a mismatched Supabase Auth target", () => {
  const env = fixture();
  env.SUPABASE_URL = fixture(refB).SUPABASE_URL;
  assert.equal(inspectPinnedSupabaseTarget(env).code, "TARGET_MISMATCH");
});

test("rejects an unverifiable legacy unscoped pooler username", () => {
  const env = fixture();
  env.DATABASE_URL = `postgres://postgres:${SECRET}@aws-0-us-west-2.pooler.supabase.com:5432/postgres`;
  assert.equal(inspectPinnedSupabaseTarget(env).code, "UNVERIFIABLE_TARGET");
});

test("rejects malformed or missing connection settings", () => {
  const env = fixture();
  delete env.DIRECT_URL;
  assert.equal(inspectPinnedSupabaseTarget(env).code, "UNVERIFIABLE_TARGET");
  assert.equal(inspectPinnedSupabaseTarget({}).ok, false);
});

test("CLI outputs only a verdict, never passwords or connection strings", () => {
  const run = (env) => spawnSync(process.execPath, [SCRIPT], {
    cwd: ROOT,
    env: {
      PATH: process.env.PATH || "",
      SYSTEMROOT: process.env.SYSTEMROOT || process.env.SystemRoot || "",
      ...env,
    },
    encoding: "utf8",
    timeout: 4000,
    windowsHide: true,
  });

  const passed = run(fixture());
  assert.equal(passed.error, undefined);
  assert.equal(passed.status, 0);
  assert.match(passed.stdout, /TAD_TARGET_PRECHECK_MATCH/);
  const rejected = run({ ...fixture(), DIRECT_URL: fixture(refB).DIRECT_URL });
  assert.equal(rejected.status, 1);
  assert.match(rejected.stderr, /REFUSED \(TARGET_MISMATCH\)/);
  for (const output of [passed.stdout, passed.stderr, rejected.stdout, rejected.stderr]) {
    assert.doesNotMatch(output, /synthetic-secret-do-not-log|postgres:\/\//);
  }
});

test("the September 2026 production verifier is explicitly retired", () => {
  const legacy = fs.readFileSync(path.join(ROOT, "verify-production.ps1"), "utf8");
  assert.match(legacy, /Write-Error/);
  assert.match(legacy, /^exit 1$/m);
  assert.doesNotMatch(legacy, /Get-Content|\.env|tadprod\.ibusiness\.com\.do/);
});
