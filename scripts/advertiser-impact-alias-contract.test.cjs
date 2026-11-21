"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const tsconfig = JSON.parse(fs.readFileSync(
  path.join(root, "apps/advertiser/tsconfig.json"), "utf8"
));
const paths = tsconfig.compilerOptions.paths;

test("advertiser imports canonical impact calculator rather than obsolete API copy", () => {
  assert.deepEqual(paths["@tad/impact-calculator"], [
    "../../packages/impact-calculator/index.ts",
  ]);
  assert.deepEqual(paths["@tad/impact-calculator/*"], [
    "../../packages/impact-calculator/*",
  ]);
});

test("shared impact calculator publicly exports advertiser quote and source helpers", () => {
  const canonical = fs.readFileSync(
    path.join(root, "packages/impact-calculator/index.ts"), "utf8"
  );
  assert.match(canonical, /export interface AdvertiserOffer\s*\{/);
  assert.match(canonical, /export function calculateAdvertiserOffer\s*\(/);
  assert.match(canonical, /export\s*\{[^}]*\bgetSource\b[^}]*\}/s);
});

test("advertiser package consumes workspace copy without duplicate calculator", () => {
  const pkg = JSON.parse(fs.readFileSync(
    path.join(root, "apps/advertiser/package.json"), "utf8"
  ));
  assert.equal(pkg.dependencies["@tad/impact-calculator"], "workspace:*");
});
