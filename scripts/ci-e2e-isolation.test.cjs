"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
function unsafeE2ELines(workflow) {
  return workflow
    .split(/\r?\n/)
    .filter((line) => !/^\s*#/.test(line))
    .filter((line) =>
      [
        /\bplaywright\s+test\b/i,
        /\b(?:pnpm|npm|yarn)\s+(?:[^\r\n;&|]*\s)?(?:test:)?e2e\b/i,
        /\b(?:pnpm|npm|yarn|node|npx)\s+[^\r\n]*tests\/e2e\b/i,
      ].some((pattern) => pattern.test(line)),
    );
}

test("root E2E guard rejects alternate unsafe commands without executing them", () => {
  const unsafeCommands = [
    "pnpm exec playwright test --reporter=dot",
    "pnpm playwright test --project=api-contract",
    "npx --no-install playwright test",
    "npm exec -- playwright test --list",
    "yarn dlx playwright test",
    "playwright test tests/e2e/v12/admin.spec.ts",
    "pnpm run e2e",
    "npm run test:e2e -- --project=admin",
    "yarn test:e2e:production",
    "pnpm --filter api test:e2e",
    "pnpm exec node tests/e2e/production-audit.cjs",
    "node tests/e2e/audit-prod.spec.ts",
    "node --test tests/e2e/unsafe.test.cjs",
    "npx tsx tests/e2e/audit-prod.spec.ts",
    "pnpm\texec\tplaywright\ttest",
  ];
  for (const command of unsafeCommands) {
    assert.equal(unsafeE2ELines(command).length, 1, command);
  }
});

test("root E2E guard preserves safe contracts and ignores full-line comments", () => {
  const safeCommands = [
    "pnpm --filter api test --runInBand",
    "node --test scripts/ci-e2e-isolation.test.cjs",
    "pnpm exec node --test scripts/ci-e2e-isolation.test.cjs",
    "node --test scripts/landing.test.cjs",
    "npx tsx scripts/landing.test.cjs",
    "pnpm exec tsc --noEmit",
    "# pnpm exec playwright test",
    "  # npm run test:e2e",
    "\t# yarn exec node tests/e2e/audit.cjs",
    "",
  ];
  for (const command of safeCommands) {
    assert.deepEqual(unsafeE2ELines(command), [], command);
  }
});

test("root E2E guard checks each executable line with LF or CRLF", () => {
  for (const newline of ["\n", "\r\n"]) {
    const command = "  pnpm\texec\tplaywright\ttest --reporter=line";
    const workflow = [
      "# pnpm exec playwright test",
      "run: |",
      "  node --test scripts/landing.test.cjs",
      command,
      "\t# npm run test:e2e",
      "  pnpm --filter api test --runInBand",
    ].join(newline);
    assert.deepEqual(unsafeE2ELines(workflow), [command]);
  }
});

test("unprivileged CI must never invoke authenticated or mutating root Playwright E2E", () => {
  const workflow = fs.readFileSync(path.join(root, ".github/workflows/ci.yml"), "utf8");
  // Match all common root E2E invocations, not just the previously failing
  // exact command. Ignore comments so documentation is not mistaken for execution.
  assert.deepEqual(unsafeE2ELines(workflow), []);
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
