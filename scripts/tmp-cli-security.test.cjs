"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { createRequire } = require("node:module");
const root = path.resolve(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const lock = fs.readFileSync(path.join(root, "pnpm-lock.yaml"), "utf8").replace(/\r\n?/g, "\n");

function editorTmp() {
  const apiRequire = createRequire(path.join(root, "apps/api/package.json"));
  const cliRequire = createRequire(apiRequire.resolve("@nestjs/cli/package.json"));
  const schematicsRequire = createRequire(cliRequire.resolve("@angular-devkit/schematics-cli/package.json"));
  const inquirerRequire = createRequire(schematicsRequire.resolve("inquirer"));
  const editorRequire = createRequire(inquirerRequire.resolve("external-editor"));
  return { tmp: editorRequire("tmp"), version: editorRequire("tmp/package.json").version };
}

test("the CLI editor creates and cleans local temporary files while rejecting traversal", () => {
  const { tmp, version } = editorTmp();
  assert.equal(version, "0.2.7");
  const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "tad-editor-security-"));
  try {
    const nested = path.join(fixtureDir, "inner");
    fs.mkdirSync(nested);
    const file = tmp.fileSync({ tmpdir: nested, prefix: "fixture-", postfix: ".txt" });
    fs.writeFileSync(file.fd, "local fixture");
    assert.equal(path.dirname(file.name), nested);
    assert.equal(fs.readFileSync(file.name, "utf8"), "local fixture");
    file.removeCallback();
    assert.equal(fs.existsSync(file.name), false);
    assert.throws(() => tmp.fileSync({ tmpdir: nested, prefix: "../escape-" }));
    assert.deepEqual(fs.readdirSync(fixtureDir), ["inner"]);
  } finally {
    assert.equal(path.dirname(fixtureDir), path.resolve(os.tmpdir()));
    assert.ok(path.basename(fixtureDir).startsWith("tad-editor-security-"));
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test("non-string temporary path options cannot bypass traversal validation", () => {
  const { tmp } = editorTmp();
  const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "tad-editor-security-"));
  try {
    const nested = path.join(fixtureDir, "inner");
    fs.mkdirSync(nested);
    for (const option of ["prefix", "postfix", "template"]) {
      for (const payload of [
        ["../escape-XXXXXX"],
        Buffer.from("../escape-XXXXXX"),
        { includes: () => false, toString: () => "../escape-XXXXXX" },
      ]) {
        assert.throws(() => tmp.fileSync({ tmpdir: nested, [option]: payload }), option);
      }
    }
    assert.deepEqual(fs.readdirSync(fixtureDir), ["inner"]);
    assert.deepEqual(fs.readdirSync(nested), []);
  } finally {
    assert.equal(path.dirname(fixtureDir), path.resolve(os.tmpdir()));
    assert.ok(path.basename(fixtureDir).startsWith("tad-editor-security-"));
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test("temporary editor dependency is fixed without upgrading its parent major", () => {
  assert.equal(pkg.pnpm?.overrides?.["external-editor>tmp"], "0.2.7");
  assert.match(lock, /\n  tmp@0\.2\.7:\n/);
  assert.doesNotMatch(lock, /\n  tmp@0\.0\.33:\n/);
  const source = lock.split("\n  external-editor@3.1.0:\n")[1] || "";
  assert.ok(source, "Expected existing external-editor 3.1.0 package resolution");
  assert.match(lock, /external-editor@3\.1\.0:[\s\S]*?tmp: 0\.2\.7/);
});

test("the root override still preserves Multer and redirect security controls", () => {
  assert.equal(pkg.pnpm?.overrides?.multer, "2.5.0");
  assert.equal(pkg.pnpm?.overrides?.["follow-redirects"], "1.16.2");
});

test("the write-enabled helper is absent from the reviewed candidate", () => {
  assert.equal(fs.existsSync(path.join(root, ".github/workflows/tmp-security-lock-generator.yml")), false);
});
