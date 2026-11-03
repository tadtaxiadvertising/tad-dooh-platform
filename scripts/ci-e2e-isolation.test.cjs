"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
test("unprivileged CI must never invoke authenticated or mutating root Playwright E2E", () => {
  const workflow = fs.readFileSync(path.join(root, ".github/workflows/ci.yml"), "utf8");
  // Match all common root E2E invocations, not just the previously failing
  // exact command. Ignore comments so documentation is not mistaken for execution.
  const executableLines = workflow
    .split("\\n")
    .filter((line) => !/^\\s*#/.test(line))
    .join("\\n");
  assert.doesNotMatch(executableLines, /(?:pnpm\\s+(?:exec\\s+)?|npx\\s+|npm\\s+exec\\s+)?playwright\\s+test\\b/i);
  assert.doesNotMatch(executableLines, /(?:pnpm|npm|yarn)\\s+(?:run\\s+)?(?:test:)?e2e\\b/i);
  assert.doesNotMatch(executableLines, /(?:pnpm|npm|yarn)\\s+[^\\n]*tests\\/e2e\\b/i);
  assert.match(workflow, /node --test scripts\/ci-e2e-isolation\.test\.cjs/);
  assert.match(workflow, /node --test scripts\/landing\.test\.cjs/);
  assert.match(workflow, /pnpm --filter api test --runInBand/);
  const prodAudit = fs.readFileSync(path.join(root, "tests/e2e/audit-prod.spec.ts"), "utf8");
  assert.match(prodAudit, /https:\/\/proyecto-ia-tad-dashboard/);
  const mutating = fs.readFileSync(path.join(root, "tests/e2e/v12/admin.spec.ts"), "utf8");
  assert.match(mutating, /Confirmar Registro/);
});
test("fixture-only public browser QA remains enabled", () => {
  const flow = fs.readFileSync(path.join(root, ".github/workflows/landing-v5-checks.yml"), "utf8");
  assert.match(flow, /Public landing browser smoke \(local only\)/);
  assert.match(flow, /fixture\.supabase\.invalid/);
  assert.match(flow, /node scripts\/landing-v3-smoke\.cjs/);
  assert.match(flow, /node scripts\/driver-landing-smoke\.cjs/);
});
