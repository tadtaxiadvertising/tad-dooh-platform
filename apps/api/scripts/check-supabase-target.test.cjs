"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  inspectSupabaseTarget,
  projectRefFromSupabaseUrl,
  projectRefFromDatabaseUrl,
} = require("./check-supabase-target.cjs");

const ref = "abcdefghijklmnopqrst";
const expected = `https://${ref}.supabase.co`;
const direct = `postgresql://postgres:placeholder@db.${ref}.supabase.co:5432/postgres`;
const pooler = `postgresql://postgres.${ref}:placeholder@aws-0-us-west-2.pooler.supabase.com:5432/postgres`;

test("accepts matching Supabase and database project references", () => {
  assert.deepEqual(inspectSupabaseTarget({
    SUPABASE_URL: expected,
    DATABASE_URL: pooler,
    DIRECT_URL: direct,
  }), { ok: true, code: "TARGET_MATCH" });
  assert.equal(projectRefFromSupabaseUrl(expected), ref);
  assert.equal(projectRefFromDatabaseUrl(pooler), ref);
});

test("blocks a migration pointed at another project", () => {
  const badDirect = `postgresql://postgres:placeholder@db.differentproject.supabase.co:5432/postgres`;
  assert.deepEqual(inspectSupabaseTarget({
    SUPABASE_URL: expected,
    DATABASE_URL: pooler,
    DIRECT_URL: badDirect,
  }), { ok: false, code: "PROJECT_MISMATCH" });
});

test("blocks a runtime pooler from a different project", () => {
  assert.equal(inspectSupabaseTarget({
    SUPABASE_URL: expected,
    DATABASE_URL: "postgresql://postgres.wrongproject:placeholder@aws-0-us-west-2.pooler.supabase.com:5432/postgres",
    DIRECT_URL: direct,
  }).code, "PROJECT_MISMATCH");
});

test("allows the exact legacy runtime username that PrismaService normalizes", () => {
  assert.deepEqual(inspectSupabaseTarget({
    SUPABASE_URL: expected,
    DATABASE_URL: "postgresql://postgres:placeholder@aws-0-us-west-2.pooler.supabase.com:5432/postgres",
    DIRECT_URL: direct,
  }), { ok: true, code: "TARGET_MATCH" });
});

test("does not silently trust an unqualified migration username", () => {
  assert.equal(inspectSupabaseTarget({
    SUPABASE_URL: expected,
    DATABASE_URL: pooler,
    DIRECT_URL: "postgresql://postgres:placeholder@aws-0-us-west-2.pooler.supabase.com:5432/postgres",
  }).code, "UNVERIFIABLE_TARGET");
});

test("unparsable or non-Supabase URLs fail closed without echoing secrets", () => {
  assert.equal(inspectSupabaseTarget({
    SUPABASE_URL: expected,
    DATABASE_URL: "not-a-url",
    DIRECT_URL: direct,
  }).code, "UNVERIFIABLE_TARGET");
  assert.equal(inspectSupabaseTarget({
    SUPABASE_URL: "https://custom.domain",
    DATABASE_URL: pooler,
    DIRECT_URL: direct,
  }).code, "UNVERIFIABLE_TARGET");
});
