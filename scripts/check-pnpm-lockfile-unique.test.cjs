"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { findDuplicateLockfileMappings, findBrokenSnapshotMappings } = require("./check-pnpm-lockfile-unique.cjs");

test("rejects repeated nested pnpm importer specifiers", () => {
  const lock = [
    "lockfileVersion: '9.0'",
    "importers:",
    "  apps/player:",
    "    devDependencies:",
    "      vite-plugin-static-copy:",
    "        specifier: ^2.2.0",
    "        version: 2.3.2",
    "        specifier: ^6.4.5",
  ].join("\n");
  const errors = findDuplicateLockfileMappings(lock);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /duplicate specifier/);
});

test("rejects repeated package and snapshot mappings", () => {
  const lock = [
    "packages:",
    "  vite@6.4.6:",
    "    resolution: {integrity: abc}",
    "  vite@6.4.6:",
    "    resolution: {integrity: abc}",
    "snapshots:",
    "  vite@6.4.6: {}",
    "  vite@6.4.6: {}",
  ].join("\n");
  const errors = findDuplicateLockfileMappings(lock);
  assert.equal(errors.length, 2);
  assert.ok(errors.some((error) => error.includes("under packages")));
  assert.ok(errors.some((error) => error.includes("under snapshots")));
});

test("permits the same mapping key under different parent packages", () => {
  const lock = [
    "importers:",
    "  apps/player:",
    "    dependencies:",
    "      vite:",
    "        specifier: ^6.4.6",
    "        version: 6.4.6",
    "  apps/driver:",
    "    dependencies:",
    "      vite:",
    "        specifier: ^6.4.6",
    "        version: 6.4.6",
  ].join("\n");
  assert.deepEqual(findDuplicateLockfileMappings(lock), []);
});

test("current tracked lockfile has no duplicated mapping keys", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "..", "pnpm-lock.yaml"), "utf8");
  assert.deepEqual(findDuplicateLockfileMappings(source), []);
  assert.match(source, /^lockfileVersion: '9\.0'$/m);
  assert.match(source, /^  apps\/player:$/m);
  assert.match(source, /^  apps\/api:$/m);
});

test("rejects null snapshot mappings left by merges even without duplicate YAML keys", () => {
  const lock = [
    "snapshots:",
    "  vite-plugin-static-copy@2.3.2(vite@6.4.6):",
    "  vite@6.4.6:",
    "    dependencies:",
    "      esbuild: 0.25.12",
  ].join("\n");
  assert.deepEqual(findDuplicateLockfileMappings(lock), []);
  const errors = findBrokenSnapshotMappings(lock);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /empty snapshot mapping/);
});

test("rejects dependencies without a snapshot dependencies group", () => {
  const lock = [
    "snapshots:",
    "  vite@6.4.6:",
    "      vite: 6.4.5",
  ].join("\n");
  const errors = findBrokenSnapshotMappings(lock);
  assert.ok(errors.some((error) => /dependency without snapshot group/.test(error)));
});

test("accepts legitimately empty snapshots and grouped dependencies", () => {
  const lock = [
    "snapshots:",
    "  empty@1.0.0: {}",
    "  plugin@2.0.0:",
    "    dependencies:",
    "      vite: 6.4.6",
    "    optional: true",
    "    transitivePeerDependencies:",
    "      - esbuild",
  ].join("\n");
  assert.deepEqual(findBrokenSnapshotMappings(lock), []);
});

test("tracked lockfile contains neither null nor malformed snapshot mappings", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "..", "pnpm-lock.yaml"), "utf8");
  assert.deepEqual(findBrokenSnapshotMappings(source), []);
});
