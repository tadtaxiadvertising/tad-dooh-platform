"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const lock = fs.readFileSync(path.join(root, "pnpm-lock.yaml"), "utf8");
const expected = {
  "@nestjs/platform-express>body-parser": "1.20.9",
  "express@4>body-parser": "1.20.9",
  "express@5>body-parser": "2.4.0",
  "next@15.5.28>postcss": "8.5.31",
  "@nestjs/cli>glob": "10.5.0",
  "@angular-devkit/core>picomatch": "4.0.7",
  "@nestjs/config>lodash": "4.18.1",
  "@nestjs/swagger>lodash": "4.18.1",
  "@nestjs/swagger>js-yaml": "4.3.2"
};

test("overrides affect only identified vulnerable package versions, preserving major lines", () => {
  for (const [selector, version] of Object.entries(expected)) {
    assert.equal(pkg.pnpm?.overrides?.[selector], version);
    assert.ok(selector.includes(">"), "Overrides must target a proven parent edge: " + selector);
    const targetMajor = selector === "express@5>body-parser" ? 2
      : selector.endsWith(">body-parser") ? 1
      : selector.endsWith(">postcss") ? 8
      : selector.endsWith(">glob") ? 10
      : selector.endsWith(">picomatch") ? 4
      : selector.endsWith(">lodash") || selector.endsWith(">js-yaml") ? 4
      : NaN;
    assert.equal(Number(version.split(".")[0]), targetMajor);
  }
  assert.equal(pkg.pnpm?.overrides?.multer, "2.5.0");
  assert.equal(pkg.pnpm?.overrides?.["follow-redirects"], "1.16.2");
});

test("pnpm generated lock no longer contains the targeted unsafe resolutions", () => {
  const vulnerable = [
    "body-parser@1.20.4", "body-parser@1.20.8", "body-parser@2.3.0",
    "postcss@8.4.31", "glob@10.4.5", "picomatch@4.0.1",
    "lodash@4.17.21", "js-yaml@4.1.0"
  ];
  for (const installed of vulnerable) {
    assert.ok(!lock.includes("\n  " + installed + ":"),
      "Vulnerable lock package remains: " + installed);
    assert.ok(!lock.includes("\n  " + installed + "("),
      "Vulnerable lock snapshot remains: " + installed);
  }
  for (const patched of new Set(Object.entries(expected).map(([k,v]) => k.slice(k.indexOf(">")+1) + "@" + v))) {
    assert.ok(lock.includes("\n  " + patched + ":"),
      "Expected fixed package resolution: " + patched);
  }
});

test("security lock preparation workflow does not reach main", () => {
  const exists = fs.existsSync(path.join(root,
    ".github/workflows/security-compatible-lockfile-generator.yml"));
  // Only the locked-down one-time generator may run while the helper exists.
  if (exists) assert.equal(process.env.TAD_ALLOW_TEMP_WORKFLOW, "yes");
});
