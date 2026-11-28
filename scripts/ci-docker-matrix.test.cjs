"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("required CI Docker matrix covers all five canonical portal images", () => {
  const workflow = fs.readFileSync(path.join(__dirname, "../.github/workflows/ci.yml"), "utf8");
  const section = workflow.split(/^  build:\s*$/m)[1]?.split(/^  summary:\s*$/m)[0];
  assert.ok(section, "required Docker build job must exist");
  const entries = [...section.matchAll(/^\s+- image: ([a-z-]+)\s*\n\s+dockerfile: (Dockerfile\.[a-z-]+)\s*$/gm)]
    .map(([, image, dockerfile]) => ({ image, dockerfile }));
  assert.deepEqual(entries, ["api", "admin", "advertiser", "driver", "player"]
    .map((image) => ({ image, dockerfile: `Dockerfile.${image}` })));
  for (const { dockerfile } of entries) {
    assert.ok(fs.existsSync(path.join(__dirname, "..", dockerfile)), `${dockerfile} missing`);
  }
  assert.match(section, /needs: \[format, typecheck, test, prisma, security\]/);
  assert.match(workflow, /needs: \[format, typecheck, test, prisma, security, build, landing\]/);
});

test("PR-triggered quality and Docker workflows explicitly restrict GITHUB_TOKEN", () => {
  const root = path.resolve(__dirname, "..");
  for (const name of ["ci.yml", "docker-image.yml"]) {
    const content = fs.readFileSync(path.join(root, ".github/workflows", name), "utf8");
    assert.match(content, /^permissions:\n  contents: read\s*$/m, name);
    assert.doesNotMatch(content, /^\s+(?:contents|packages|issues|actions|checks|statuses): write\s*$/m, name);
    assert.match(content, /^  pull_request:\s*$/m, name);
  }
});


test("the app-pinned Summary always depends on fixture-only landing gates", () => {
  const ci = fs.readFileSync(path.join(__dirname, "../.github/workflows/ci.yml"), "utf8");
  const focused = fs.readFileSync(path.join(__dirname, "../.github/workflows/landing-v5-checks.yml"), "utf8");
  const caller = ci.split(/^  landing:\s*$/m)[1]?.split(/^  \w+:\s*$/m)[0];
  assert.ok(caller, "Required landing workflow call must exist");
  assert.match(caller, /uses: \.\/\.github\/workflows\/landing-v5-checks\.yml/);
  assert.doesNotMatch(caller, /^\s+if:|continue-on-error:|secrets:/m);
  const events = focused.split(/^on:\s*$/m)[1]?.split(/^permissions:\s*$/m)[0];
  assert.match(events, /^  workflow_call:\s*$/m);
  assert.match(events, /^  workflow_dispatch:\s*$/m);
  assert.doesNotMatch(events, /^  (push|pull_request|pull_request_target):/m);
  assert.match(focused, /^permissions:\n  contents: read\s*$/m);
  assert.match(focused, /node scripts\/landing-v3-measure\.cjs/);
  assert.match(focused, /fixture\.supabase\.invalid/);
  assert.match(ci, /LANDING_RESULT: \$\{\{ needs\.landing\.result \}\}/);
});

test("actual Summary shell rejects failed, skipped or cancelled landing gates", () => {
  const os = require("node:os");
  const { spawnSync } = require("node:child_process");
  const ci = fs.readFileSync(path.join(__dirname, "../.github/workflows/ci.yml"), "utf8");
  const summary = ci.split(/^  summary:\s*$/m)[1];
  assert.ok(summary);
  const shell = summary.split("        run: |\n")[1];
  assert.ok(shell);
  const script = shell.split("\n").map(line => line.replace(/^ {10}/, "")).join("\n");
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tad-ci-summary-"));
  try {
    for (const landing of ["success", "failure", "cancelled", "skipped", ""]) {
      const file = path.join(directory, "summary-" + (landing || "empty"));
      const result = spawnSync("bash", ["-c", script], {
        encoding: "utf8",
        env: {
          PATH: process.env.PATH,
          GITHUB_STEP_SUMMARY: file,
          FORMAT_RESULT: "success",
          TYPECHECK_RESULT: "success",
          TEST_RESULT: "success",
          PRISMA_RESULT: "success",
          SECURITY_RESULT: "success",
          BUILD_RESULT: "success",
          LANDING_RESULT: landing,
        },
      });
      assert.ifError(result.error);
      assert.equal(result.status, landing === "success" ? 0 : 1, landing + ": " + result.stderr);
      assert.ok(fs.readFileSync(file, "utf8").includes("- **landing**: " + landing));
    }
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
