"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const runner = path.join(root, "scripts", "apply-migrations.js");
const source = fs.readFileSync(runner, "utf8");

test("retired migration runner cannot connect to PostgreSQL or execute SQL", () => {
  assert.doesNotMatch(source, /require\s*\(\s*["']pg["']\s*\)/);
  assert.doesNotMatch(source, /new\s+Client\s*\(/);
  assert.doesNotMatch(source, /\.query\s*\(/);
  assert.doesNotMatch(source, /rejectUnauthorized\s*:\s*false/);
  assert.doesNotMatch(source, /process\.env\.DB_PASSWORD/);
});

test("direct execution fails closed without reading database credentials", () => {
  const env = { NODE_ENV: "test", PATH: "" };
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
  assert.match(result.stderr, /verified backup/);
  assert.match(result.stderr, /isolated staging restore/);
});
