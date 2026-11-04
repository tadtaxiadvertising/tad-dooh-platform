"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const lock = fs.readFileSync(path.join(root, "pnpm-lock.yaml"), "utf8");

test("temporary editor dependency is fixed without upgrading its parent major", () => {
  assert.equal(pkg.pnpm?.overrides?.["external-editor>tmp"], "0.2.6");
  assert.match(lock, /\n  tmp@0\.2\.6:\n/);
  assert.doesNotMatch(lock, /\n  tmp@0\.0\.33:\n/);
  const source = lock.split("\n  external-editor@3.1.0:\n")[1] || "";
  assert.ok(source, "Expected existing external-editor 3.1.0 package resolution");
  assert.match(lock, /external-editor@3\.1\.0:[\s\S]*?tmp: 0\.2\.6/);
});

test("the root override still preserves Multer and redirect security controls", () => {
  assert.equal(pkg.pnpm?.overrides?.multer, "2.5.0");
  assert.equal(pkg.pnpm?.overrides?.["follow-redirects"], "1.16.2");
});

test("the write-enabled helper is absent from the reviewed candidate", () => {
  assert.equal(fs.existsSync(path.join(root, ".github/workflows/tmp-security-lock-generator.yml")), false);
});
