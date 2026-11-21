"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const packageRoot = path.join(root, "packages/impact-calculator");
const runtimeEntry = path.join(packageRoot, "dist/index.js");
const declarations = path.join(packageRoot, "dist/index.d.ts");

test("advertiser offer exists in the shared source and built public contract", () => {
  const source = fs.readFileSync(path.join(packageRoot, "index.ts"), "utf8");
  assert.match(source, /export function calculateAdvertiserOffer\s*\(/);
  assert.ok(fs.existsSync(runtimeEntry), "Build @tad/impact-calculator before consumer tests.");
  assert.ok(fs.existsSync(declarations), "Build @tad/impact-calculator before consumer typechecks.");
  const dts = fs.readFileSync(declarations, "utf8");
  assert.match(
    dts,
    /export declare function calculateAdvertiserOffer\s*\(/,
    "Compiled declarations must export the API consumer contract.",
  );
  const exports = require(packageRoot);
  assert.equal(
    typeof exports.calculateAdvertiserOffer,
    "function",
    "Built JS must expose the advertiser quote function.",
  );
});

test("Jest and TypeScript CI build the shared package before consuming it", () => {
  const workflow = fs.readFileSync(path.join(root, ".github/workflows/ci.yml"), "utf8").replace(/\r\n/g, "\n");
  const check = (start, end, consumer) => {
    const block = workflow.split(start)[1]?.split(end)[0];
    assert.ok(block, `CI missing ${start.trim()} job`);
    const build = block.indexOf("pnpm --filter @tad/impact-calculator run build");
    const use = block.indexOf(consumer);
    assert.ok(build >= 0 && use > build, "Shared package must build before " + consumer);
  };
  check("  typecheck:\n", "  test:\n", 'pnpm exec tsc --noEmit --project "$pkg/tsconfig.json"');
  check("  test:\n", "  prisma:\n", "pnpm --filter api test --runInBand");
});
