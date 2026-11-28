"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const skill = fs.readFileSync(
  path.join(root, ".agents/skills/tad-postgis-rls-resolver/SKILL.md"),
  "utf8",
);
const sop = fs.readFileSync(
  path.join(root, "04_flujo_operativo_tad.md"), "utf8",
);

test("PostGIS skill uses read-only triage and does not claim live schema fixed", () => {
  assert.match(skill, /name: tad-postgis-rls-resolver/);
  assert.match(skill, /solo lectura/i);
  assert.match(skill, /PostGIS ausente/);
  assert.match(skill, /no est[aá] demostrado.*can[oó]nico/i);
  assert.match(skill, /#217/);
  assert.match(skill, /REPARACI[OÓ]N NO AUTORIZADA/);
});

test("PostGIS skill never suggests executable DDL/DML or retired mutation commands", () => {
  // On Windows, git autocrlf can convert Markdown from LF to CRLF.
  // The safety scan must inspect the same SQL fences on either platform.
  const extractSqlBlocks = (source) =>
    [...source.matchAll(/```(?:sql|bash|sh)\r?\n([\s\S]*?)```/g)].map(m => m[1]);
  const lf = skill.replace(/\r\n/g, "\n");
  const crlf = lf.replace(/\n/g, "\r\n");
  const blocks = extractSqlBlocks(skill);
  assert.ok(blocks.length >= 2, "Expected catalog-only SQL examples");
  assert.equal(extractSqlBlocks(lf).length, blocks.length, "LF must detect the same SQL fences");
  assert.equal(extractSqlBlocks(crlf).length, blocks.length, "CRLF must detect the same SQL fences");
  for (const block of blocks) {
    assert.doesNotMatch(block, /\b(?:ALTER|GRANT|REVOKE|CREATE|DROP|TRUNCATE|INSERT|UPDATE|DELETE|DO)\b/i);
    assert.doesNotMatch(block, /(?:node|ts-node)\s+.*(?:fix-rls|dba_remediation)/i);
    assert.match(block, /^\s*SELECT\b/i);
  }
  assert.doesNotMatch(skill, /node\s+apps\/api\/(?:fix-rls|scripts\/dba_remediation)/i);
});

test("catalog checks handle absent spatial_ref_sys safely", () => {
  assert.match(skill, /to_regclass\('public\.spatial_ref_sys'\)/);
  assert.doesNotMatch(skill, /'public\.spatial_ref_sys'::regclass/i);
  assert.match(skill, /has_table_privilege/);
  assert.match(skill, /pg_policy/);
});

test("operational SOP no longer claims PostGIS/RLS fixed or recommends retired runner", () => {
  assert.match(sop, /\[ \] \*\*PostGIS & RLS Isolation/);
  assert.match(sop, /PostGIS ausente/);
  assert.match(sop, /diagn[oó]stico de solo lectura/i);
  assert.match(sop, /dba_remediation\.cjs` est[aá] retirado/);
  assert.doesNotMatch(sop, /node\s+apps\/api\/fix-rls/);
  assert.doesNotMatch(sop, /GRANT ALL ON TABLE public\.spatial_ref_sys/i);
});

test("RLS fix and DBA remediation executables remain retired", () => {
  for (const name of ["apps/api/fix-rls.js", "apps/api/scripts/dba_remediation.cjs"]) {
    const code = fs.readFileSync(path.join(root, name), "utf8");
    assert.match(code, /\[migration\] REFUSED/);
    assert.match(code, /process\.exitCode\s*=\s*1/);
    assert.doesNotMatch(code, /\.query\s*\(|\$executeRawUnsafe/);
  }
});
