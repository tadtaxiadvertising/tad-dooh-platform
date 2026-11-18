"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

// Never display file contents, connection strings, or secret bytes when the
// guard trips. Report only paths to investigators with repository access.
function isForbiddenTrackedPath(file) {
  const normalized = file.replace(/\\/g, "/").replace(/^\.\//, "");
  const base = path.posix.basename(normalized);
  if (
    normalized === "apps/api/prisma-cloud-test.js" ||
    normalized === "apps/api/test_db.py"
  ) return true;
  if (/^\.env(?:\.|$)/i.test(base) && !/\.example$/i.test(base)) return true;
  if (/^(?:id_rsa|id_ed25519)$/i.test(base)) return true;
  if (/\.(?:p8|p12|pfx|pem)$/i.test(base)) return true;
  return false;
}

function isExecutableNonTestSource(file) {
  if (!/\.(?:js|cjs|mjs|py|ts|tsx)$/i.test(file)) return false;
  if (/(?:^|\/)(?:test|tests|__tests__|fixtures|examples)(?:\/|$)/i.test(file)) return false;
  if (/\.(?:test|spec)\.[cm]?[jt]sx?$/i.test(file)) return false;
  // This gate scans executable source only, not documents, markdown or the
  // deliberately synthetic connection strings in test fixtures.
  return true;
}

function containsEmbeddedPostgresPassword(content) {
  return /postgres(?:ql)?:\/\/[^:\s\/'"`]+:[^@\s\/'"`]+@[^\s\/'"`]+/i.test(content);
}

function trackedPaths() {
  const output = execFileSync("git", ["ls-files", "-z"], {
    cwd: root, encoding: "utf8", maxBuffer: 8 * 1024 * 1024,
  });
  return output.split("\0").filter(Boolean);
}

test("sensitive tracked paths are blocked but safe examples are allowed", () => {
  for (const name of [
    "apps/api/prisma-cloud-test.js", "apps/api/test_db.py",
    "apps/api/.env", "apps/driver/.env.local", "config/.env.production",
    "private/id_ed25519", "keys/prod.pem", "certificate.p12",
  ]) assert.equal(isForbiddenTrackedPath(name), true, name);
  for (const name of [
    "apps/api/.env.example", ".env.example", "src/service.ts",
    "scripts/audit.test.cjs", ".npmrc",
  ]) assert.equal(isForbiddenTrackedPath(name), false, name);
});

test("tracked repository no longer contains credential-bearing legacy files or private key material", () => {
  const blocked = trackedPaths().filter(isForbiddenTrackedPath);
  assert.deepEqual(blocked, [], `Forbidden tracked file paths: ${blocked.join(", ")}`);
});

test("runtime source does not embed a literal PostgreSQL URL password", () => {
  const suspicious = [];
  for (const file of trackedPaths().filter(isExecutableNonTestSource)) {
    const value = readFileSync(path.join(root, file), "utf8");
    if (containsEmbeddedPostgresPassword(value)) suspicious.push(file);
  }
  assert.deepEqual(
    suspicious, [],
    `Possible hardcoded database URLs in source paths: ${suspicious.join(", ")}. Never print secret contents.`,
  );
});

test("password detector catches synthetic URLs without echoing secret values", () => {
  const synthetic = ["postgresql://user:fixturevalue@db.example.test:5432/db", "postgres://user:fixturevalue@127.0.0.1:5432/db"];
  for (const sample of synthetic) assert.equal(containsEmbeddedPostgresPassword(sample), true);
  assert.equal(containsEmbeddedPostgresPassword("process.env.DATABASE_URL"), false);
  assert.equal(containsEmbeddedPostgresPassword("postgresql://user@localhost/db"), false);
});

module.exports = {
  isForbiddenTrackedPath,
  isExecutableNonTestSource,
  containsEmbeddedPostgresPassword,
};
