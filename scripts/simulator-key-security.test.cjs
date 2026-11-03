"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const ROOT = path.resolve(__dirname, "..");
const SRC = "apps/tad-simulator/src/generators.js";

function runGenerator(raw) {
  const env = { ...process.env };
  delete env.TAD_TABLET_KEY;
  if (raw !== undefined) env.TAD_TABLET_KEY = raw;
  const expected = raw?.trim() || null;
  const script = "import('./apps/tad-simulator/src/generators.js').then(({CONFIG}) => { if(CONFIG.TABLET_KEY !== " +
    JSON.stringify(expected) + ") process.exitCode = 2; })";
  return spawnSync(process.execPath, ["--input-type=module", "-e", script],
    { cwd: ROOT, env, encoding: "utf8", timeout: 5000 });
}

test("tablet key has no source-controlled default", () => {
  const source = fs.readFileSync(path.join(ROOT, SRC), "utf8");
  assert.match(source, /TABLET_KEY:\s*process\.env\.TAD_TABLET_KEY\?\.trim\(\)\s*\|\|\s*null/);
  assert.doesNotMatch(source, /TABLET_KEY:\s*process\.env\.TAD_TABLET_KEY\s*\|\|\s*["']/);
  for (const raw of [undefined, "", "   "]) {
    const result = runGenerator(raw);
    assert.equal(result.status, 0);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "");
  }
});

test("simulator key is sourced only from explicit environment", () => {
  const result = runGenerator(" fixture-only-marker ");
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "");
});

test("missing key prevents simulator startup before network activity", () => {
  const env = { ...process.env };
  delete env.TAD_TABLET_KEY;
  env.TAD_SIMULATOR_API_URL = "http://127.0.0.1:1/api/v1";
  const result = spawnSync(process.execPath, ["apps/tad-simulator/src/index.js"],
    { cwd: ROOT, env, encoding: "utf8", timeout: 5000 });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /TAD_TABLET_KEY is required/);
  assert.doesNotMatch(result.stdout, /GPS:|Playback:|Heartbeat:/);
});
