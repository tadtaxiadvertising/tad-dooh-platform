"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const file = path.join(root, "scripts", "verify-production-checklist.sh");
const source = fs.readFileSync(file, "utf8");

function git(dir, ...args) {
  return execFileSync("git", ["-C", dir, ...args], { encoding: "utf8" }).trim();
}

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tad-release-gate-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  git(dir, "init", "--quiet", "-b", "main");
  git(dir, "config", "user.name", "TAD Fixture");
  git(dir, "config", "user.email", "fixture@example.invalid");
  fs.writeFileSync(path.join(dir, "fixture.txt"), "synthetic fixture\n");
  git(dir, "add", "fixture.txt");
  git(dir, "commit", "--quiet", "-m", "fixture baseline");
  return dir;
}

function runMainRefGate(dir) {
  const start = source.indexOf("MAIN_SHA=$(git rev-parse --verify refs/remotes/origin/main");
  const end = source.indexOf("\nif [ -f apps/api/dist/main.js ]; then", start);
  assert.ok(start > 0 && end > start, "expected a separately testable main-ref gate");

  const commands = [
    "set -euo pipefail",
    "CHECK_PASS=0",
    "CHECK_FAIL=0",
    "OK() { :; }",
    "FAIL() { :; }",
    source.slice(start, end),
    'printf "%s:%s" "$CHECK_PASS" "$CHECK_FAIL"',
  ];
  return execFileSync("bash", ["-c", commands.join("\n")], {
    cwd: dir,
    encoding: "utf8",
  }).trim();
}

test("readiness script remains valid Bash and never masks typecheck or build exit codes", () => {
  execFileSync("bash", ["-n", file]);
  assert.match(source, /TSC_OUT=\$\(timeout[^\n]+\) \|\| TSC_RC=\$\?/);
  assert.match(source, /TSC_FINAL=\$\(timeout[^\n]+\) \|\| TSC_FINAL_RC=\$\?/);
  assert.match(source, /BUILD_OUT=\$\(timeout[^\n]+\) \|\| BUILD_RC=\$\?/);
  assert.match(source, /LINT_OUT=\$\(timeout[^\n]+\) \|\| LINT_RC=\$\?/);
  assert.match(source, /if \[ "\$LINT_TOTAL_FAILS" -gt 0 \]; then/);
  assert.match(source, /\[ "\$\{BUILD_RC:-1\}" -ne 0 \]/);
  assert.match(source, /if \[ "\$CHECK_FAIL" -gt 0 \]; then\s+exit 1/);
  assert.doesNotMatch(source, /TSC_(?:OUT|FINAL)=([^\n]*\|\| true)/);
  assert.doesNotMatch(source, /if git diff --quiet origin\/main[^\n]*\|\| true/);
});

test("missing origin/main fails closed instead of reporting synchronized", (t) => {
  const dir = fixture(t);
  assert.equal(runMainRefGate(dir), "0:1");
});

test("matching commit SHAs pass, but an empty commit ahead fails even with identical trees", (t) => {
  const dir = fixture(t);
  const baseline = git(dir, "rev-parse", "HEAD");
  git(dir, "update-ref", "refs/remotes/origin/main", baseline);
  assert.equal(runMainRefGate(dir), "1:0");

  git(dir, "commit", "--quiet", "--allow-empty", "-m", "unpublished empty commit");
  assert.equal(runMainRefGate(dir), "0:1");
  git(dir, "update-ref", "refs/remotes/origin/main", git(dir, "rev-parse", "HEAD"));
  assert.equal(runMainRefGate(dir), "1:0");
});

test("ESLint failures and missing binaries cannot be silently treated as success", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tad-eslint-gate-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const apps = ["admin", "advertiser", "driver", "player"];
  for (const app of apps) {
    const bin = path.join(dir, "apps", app, "node_modules", ".bin", "eslint");
    fs.mkdirSync(path.dirname(bin), { recursive: true });
    fs.writeFileSync(bin, "#!/bin/sh\nexit 0\n");
    fs.chmodSync(bin, 0o755);
  }
  const start = source.indexOf("LINT_TOTAL_FAILS=0\nfor DIR in apps/admin");
  const end = source.indexOf("\n# ---------- 7. TESTS", start);
  assert.ok(start > 0 && end > start);

  function lintFailures() {
    const run = [
      "set -euo pipefail",
      "OK() { :; }",
      "FAIL() { :; }",
      source.slice(start, end),
      'printf "%s" "$LINT_TOTAL_FAILS"',
    ];
    return execFileSync("bash", ["-c", run.join("\n")], {
      cwd: dir,
      encoding: "utf8",
      env: { ...process.env, ROOT: dir },
    }).trim();
  }

  assert.equal(lintFailures(), "0");
  const bad = path.join(dir, "apps", "driver", "node_modules", ".bin", "eslint");
  fs.writeFileSync(bad, "#!/bin/sh\nexit 9\n");
  assert.equal(lintFailures(), "1");
  fs.rmSync(bad);
  assert.equal(lintFailures(), "1");
});
