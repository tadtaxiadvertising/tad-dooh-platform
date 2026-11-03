"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const normalizeNewlines = source => source.replace(/\r\n?/g, "\n");
const read = file => normalizeNewlines(fs.readFileSync(path.join(root, file), "utf8"));
const lock = read("pnpm-lock.yaml");

test("text fixtures preserve the same contracts with LF and CRLF checkouts", () => {
  assert.equal(lock.includes("\r"), false, "The loaded fixture must use normalized newlines.");
  const crlf = lock.replace(/\n/g, "\r\n");
  assert.ok(crlf.includes("\r\n"), "Exercise a real CRLF fixture on every platform.");
  assert.equal(normalizeNewlines(lock), lock);
  assert.equal(normalizeNewlines(crlf), lock);
  assert.match(normalizeNewlines(crlf), /\n  sharp@0\.35\.5:\n/);
});

function importer(name) {
  const prefix = "\n  " + name + ":\n";
  const entries = lock.split(prefix);
  assert.equal(entries.length, 2, "Missing or duplicate importer " + name);
  return entries[1].split("\n\n")[0];
}

test("all three web apps pin a patched Next.js maintenance release", () => {
  for (const name of ["admin", "advertiser", "driver"]) {
    const pkg = JSON.parse(read("apps/" + name + "/package.json"));
    assert.equal(pkg.dependencies.next, "15.5.28", name);
    if (name !== "advertiser") {
      assert.equal(pkg.devDependencies["eslint-config-next"], "15.5.28", name);
    }
    const entry = importer("apps/" + name);
    assert.match(entry, /next:\s*\n\s+specifier: 15\.5\.28\s*\n\s+version: 15\.5\.28/);
  }
});

test("shared UI does not pull an obsolete Next peer back into the lockfile", () => {
  const pkg = JSON.parse(read("packages/ui/package.json"));
  assert.equal(pkg.peerDependencies.next, ">=15.5.28 <16");
  const entry = importer("packages/ui");
  assert.match(entry, /next:\s*\n\s+specifier: ['"]?>=15\.5\.28 <16/);
  assert.match(entry, /version: 15\.5\.28/);
  assert.doesNotMatch(lock, /\bnext@15\.5\.24\b/);
});

test("image optimization package resolution includes vendor-fixed Sharp", () => {
  assert.match(lock, /\n  sharp@0\.35\.5:\n/);
  assert.match(lock, /\n\s+sharp: 0\.35\.5/);
});

test("temporary write-enabled CI workflow is absent from the PR", () => {
  assert.equal(fs.existsSync(path.join(root, ".github/workflows/prepare-next-patch-lockfile.yml")), false);
});
