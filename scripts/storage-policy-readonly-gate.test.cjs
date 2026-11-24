"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const sql = fs.readFileSync(
  path.join(__dirname, "storage-policy-readonly-gate.sql"),
  "utf8",
);
const statement = sql.replace(/^\s*--.*$/gm, "").trim();

test("the gate is one read-only SELECT statement, never a mutation", () => {
  assert.match(statement, /^WITH\s+policy\s+AS\s*\(/i);
  assert.equal((statement.match(/;/g) || []).length, 1);
  assert.match(statement, /FROM\s+state\s*;$/);
  assert.doesNotMatch(
    statement,
    /\b(?:INSERT\s+INTO|UPDATE\s+\w|DELETE\s+FROM|DROP\s+(?:TABLE|POLICY)|ALTER\s+\w|CREATE\s+(?:TABLE|POLICY|ROLE|FUNCTION)|TRUNCATE|REVOKE|GRANT|EXECUTE\s|CALL\s|DO\s+\$)\b/i,
  );
});

test("must inspect exactly storage.objects RLS and existing policies", () => {
  assert.match(statement, /FROM\s+pg_policies/);
  assert.match(statement, /schemaname\s*=\s*'storage'/);
  assert.match(statement, /tablename\s*=\s*'objects'/);
  assert.match(statement, /c\.relrowsecurity/);
  assert.match(statement, /rls_enabled\s+IS\s+TRUE/);
});

test("one public-read policy is limited to an existing public bucket", () => {
  assert.match(statement, /policy_count\s*=\s*1/);
  assert.match(statement, /authorized_public_read_policies\s*=\s*1/);
  assert.match(statement, /JOIN\s+storage\.buckets\s+b/);
  assert.match(statement, /ON\s+b\.public/);
  assert.match(statement, /p\.qual\s*=\s*format/);
  assert.match(statement, /p\.roles\s*=\s*ARRAY\['public'\]::name\[\]/);
  assert.match(statement, /p\.permissive\s*=\s*'PERMISSIVE'/);
  assert.match(statement, /p\.with_check\s+IS\s+NULL/);
});

test("any non-SELECT policy must block the gate", () => {
  assert.match(statement, /cmd\s*<>\s*'SELECT'/);
  assert.match(statement, /non_read_policies\s*=\s*0/);
  assert.match(statement, /'BLOCK_P0_STORAGE_POLICY_DRIFT'/);
});

test("the success verdict is explicitly insufficient for release", () => {
  assert.match(statement, /RLS_METADATA_CONTAINED_HTTP_UNVERIFIED/);
  assert.match(sql, /not an HTTP or media-byte integrity attestation/i);
  assert.doesNotMatch(
    statement,
    /(?:https?:\/\/|eyJ[A-Za-z0-9_-]{30,}|service_role\s*key)/i,
  );
});
