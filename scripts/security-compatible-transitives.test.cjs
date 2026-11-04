"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const lock = fs.readFileSync(path.join(root, "pnpm-lock.yaml"), "utf8");
const expected = {
  "body-parser@1.20.4": "1.20.9",
  "body-parser@1.20.8": "1.20.9",
  "body-parser@2.3.0": "2.4.0",
  "postcss@8.4.31": "8.5.31",
  "glob@10.4.5": "10.5.0",
  "picomatch@4.0.1": "4.0.7",
  "lodash@4.17.21": "4.18.1",
  "js-yaml@4.1.0": "4.3.2",
};

test("overrides affect only identified vulnerable package versions, preserving major lines", () => {
  for (const [selector, version] of Object.entries(expected)) {
    assert.equal(pkg.pnpm?.overrides?.[selector], version);
    const [name, oldVersion] = selector.split("@");
    assert.equal(oldVersion.split(".")[0], version.split(".")[0],
      selector + " must not cross major versions");
  }
  assert.equal(pkg.pnpm?.overrides?.multer, "2.5.0");
  assert.equal(pkg.pnpm?.overrides?.["follow-redirects"], "1.16.2");
});

test("pnpm generated lock no longer contains the targeted unsafe resolutions", () => {
  for (const selector of Object.keys(expected)) {
    assert.ok(!lock.includes("\n  " + selector + ":"),
      "Vulnerable packages node remains: " + selector);
    assert.ok(!lock.includes("\n  " + selector + "("),
      "Vulnerable snapshot remains: " + selector);
  }
  for (const patched of new Set(Object.entries(expected).map(([k,v]) => k.split("@")[0] + "@" + v))) {
    assert.ok(lock.includes("\n  " + patched + ":"),
      "Expected fixed package resolution: " + patched);
  }
});

test("security lock preparation workflow does not reach main", () => {
  assert.equal(fs.existsSync(path.join(root,
    ".github/workflows/security-compatible-lockfile-generator.yml")), false);
});
