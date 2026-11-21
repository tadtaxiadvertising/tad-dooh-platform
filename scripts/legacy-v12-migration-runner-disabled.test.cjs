"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const runner = path.join(root, "apps/api/scripts/apply-v12-migration.js");
const source = fs.readFileSync(runner, "utf8");

// These checks protect against silently bringing back a direct SQL bypass.
test("historical v12 migration runner has no database, dotenv or SQL execution code", () => {
  assert.doesNotMatch(source, /require\s*\(\s*["'](?:pg|dotenv)["']\s*\)/);
  assert.doesNotMatch(source, /new\s+Client\s*\(/);
  assert.doesNotMatch(source, /\.query\s*\(/);
  assert.doesNotMatch(source, /process\.env\.(?:DATABASE_URL|DIRECT_URL)/);
  assert.doesNotMatch(source, /rejectUnauthorized\s*:\s*false/);
});

test("direct execution refuses even with synthetic production variables", () => {
  const env = {
    NODE_ENV: "production",
    PATH: "",
    DATABASE_URL: "postgres://postgres:synthetic-secret@127.0.0.1:1/postgres",
    DIRECT_URL: "postgres://postgres:synthetic-secret@127.0.0.1:2/postgres",
  };
  if (process.platform === "win32") {
    env.SYSTEMROOT = process.env.SYSTEMROOT || process.env.SystemRoot || "";
  }
  const result = spawnSync(process.execPath, [runner], {
    cwd: root,
    env,
    encoding: "utf8",
    windowsHide: true,
    timeout: 4000,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.signal, null);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /\[migration\] REFUSED/);
  assert.doesNotMatch(result.stderr, /synthetic-secret|postgres:\/\//);
});
