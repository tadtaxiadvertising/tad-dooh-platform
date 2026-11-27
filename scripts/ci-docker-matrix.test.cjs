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
