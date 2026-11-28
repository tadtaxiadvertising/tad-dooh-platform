"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { assertLocalSeedAllowed } = require("../apps/api/scripts/assert-local-seed.cjs");

const root = path.resolve(__dirname, "..");
const url = "postgres://postgres:synthetic-password@localhost:5432/tad_local";
const permitted = {
  NODE_ENV: "development",
  TAD_APPROVE_LOCAL_SEED: "YES",
  DATABASE_URL: url,
};

test("explicitly approved local development seed is permitted", () => {
  assert.doesNotThrow(() => assertLocalSeedAllowed(permitted));
  assert.doesNotThrow(() => assertLocalSeedAllowed({ ...permitted, NODE_ENV: "test" }));
  assert.doesNotThrow(() => assertLocalSeedAllowed({ ...permitted, DATABASE_URL: "postgresql://user:pass@127.0.0.1:5433/local" }));
  assert.doesNotThrow(() => assertLocalSeedAllowed({ ...permitted, DATABASE_URL: "postgresql://user:pass@[::1]:5433/local" }));
});

test("production and unspecified NODE_ENV are refused even when opt-in is set", () => {
  for (const value of ["production", "staging", "", undefined]) {
    assert.throws(() => assertLocalSeedAllowed({ ...permitted, NODE_ENV: value }), /NON_DEVELOPMENT_ENVIRONMENT/);
  }
});

test("explicit operator opt-in is mandatory", () => {
  assert.throws(() => assertLocalSeedAllowed({ ...permitted, TAD_APPROVE_LOCAL_SEED: "no" }), /EXPLICIT_LOCAL_APPROVAL_REQUIRED/);
  assert.throws(() => assertLocalSeedAllowed({ ...permitted, TAD_APPROVE_LOCAL_SEED: undefined }), /EXPLICIT_LOCAL_APPROVAL_REQUIRED/);
});

test("remote Supabase pools and database hosts are blocked", () => {
  for (const host of [
    "db.aaaaaaaaaaaaaaaaaaaa.supabase.co",
    "aws-0-us-west-2.pooler.supabase.com",
    "postgres",
    "db",
    "192.168.1.10",
  ]) {
    const target = `postgres://postgres:synthetic-password@${host}:5432/postgres`;
    assert.throws(() => assertLocalSeedAllowed({ ...permitted, DATABASE_URL: target }), /NON_LOCAL_DATABASE_TARGET/);
  }
});

test("missing or malformed URLs are refused without echoing passwords", () => {
  for (const value of [undefined, "", "not-a-url", "https://localhost/demo"]) {
    try {
      assertLocalSeedAllowed({ ...permitted, DATABASE_URL: value });
      assert.fail("Expected refusal");
    } catch (error) {
      assert.match(error.message, /\[seed\] REFUSED/);
      assert.doesNotMatch(error.message, /synthetic-password|postgres:\/\//);
    }
  }
});

test("seed entrypoints enforce gate before constructing PrismaClient", () => {
  for (const name of ["prisma/seed.ts", "prisma/simulate-data.ts", "scripts/seed-fleet.ts"]) {
    const file = fs.readFileSync(path.join(root, "apps/api", name), "utf8");
    assert.match(file, /assertLocalSeedAllowed\(process\.env\)/, name);
    assert.ok(file.indexOf("assertLocalSeedAllowed(process.env)") < file.indexOf("new PrismaClient()"), name);
  }
});
