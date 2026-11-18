"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");

function loadTS(fileName, dependencies = {}) {
  const filename = path.join(root, fileName);
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    fileName: filename,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
  });
  const moduleObject = { exports: {} };
  const requireOnly = name => {
    assert.ok(Object.hasOwn(dependencies, name), "Unexpected dependency " + name);
    return dependencies[name];
  };
  new Function("exports", "require", "module", compiled.outputText)(
    moduleObject.exports, requireOnly, moduleObject);
  return moduleObject.exports;
}

function loadPricing() {
  const sources = loadTS("packages/impact-calculator/sources.ts");
  return loadTS("packages/impact-calculator/index.ts", { "./sources": sources });
}

test("RD$2500 base; verified driver code discounts screens by 40% to RD$1500/month", () => {
  const { calculateAdvertiserOffer } = loadPricing();
  const base = calculateAdvertiserOffer({
    screens: 3, months: 2, includeProduction: false, verifiedDriverCode: false,
  });
  assert.equal(base.baseMonthlyScreenRate, 2500);
  assert.equal(base.effectiveMonthlyScreenRate, 2500);
  assert.equal(base.baseScreensSubtotal, 15000);
  assert.equal(base.discountAmount, 0);
  assert.equal(base.subtotal, 15000);
  const referred = calculateAdvertiserOffer({
    screens: 3, months: 2, includeProduction: false, verifiedDriverCode: true,
  });
  assert.equal(referred.baseMonthlyScreenRate, 2500);
  assert.equal(referred.effectiveMonthlyScreenRate, 1500);
  assert.equal(referred.discountPercent, 40);
  assert.equal(referred.discountAmount, 6000);
  assert.equal(referred.screensSubtotal, 9000);
  assert.equal(referred.subtotal, 9000);
  assert.equal(referred.taxesIncluded, false);
});

test("optional creative production is never discounted by the driver code", () => {
  const { calculateAdvertiserOffer } = loadPricing();
  const offered = calculateAdvertiserOffer({
    screens: 3, months: 2, includeProduction: true, verifiedDriverCode: true,
  });
  assert.equal(offered.discountAmount, 6000);
  assert.equal(offered.productionFee, 2500);
  assert.equal(offered.subtotal, 11500);
});

test("invalid or out-of-bound parameters fail closed", () => {
  const { calculateAdvertiserOffer } = loadPricing();
  const valid = {
    screens: 1, months: 1, includeProduction: false, verifiedDriverCode: false,
  };
  for (const patch of [
    { screens: 0 }, { screens: 101 }, { screens: 1.1 },
    { months: 0 }, { months: 13 }, { months: 1.5 },
    { includeProduction: "yes" }, { verifiedDriverCode: "true" },
    { verifiedDriverCode: undefined }, { screens: Infinity },
  ]) assert.throws(() => calculateAdvertiserOffer({ ...valid, ...patch }),
    /Invalid advertiser quote configuration/);
});

test("driver referral links lead to the actual advertiser onboarding route", () => {
  const source = fs.readFileSync(path.join(
    root, "apps/api/src/modules/referral/referral.service.ts"), "utf8");
  assert.ok(source.includes("https://tad.anunciante.ibusiness.com.do/advertiser/onboarding?ref="));
  assert.ok(!source.includes("https://tad.anunciante.ibusiness.com.do/register?ref="));
});

test("zero-valued screen tariff fails closed rather than allowing free recommendations", () => {
  const sources = loadTS("packages/impact-calculator/sources.ts");
  const impact = loadTS("packages/impact-calculator/index.ts", { "./sources": sources });
  const rate = sources.getSource("screen-monthly-rate-rd");
  assert.ok(rate);
  const original = rate.value;
  try {
    rate.value = 0;
    assert.throws(() => impact.calculateAdvertiserOffer({
      screens: 1, months: 1, includeProduction: false, verifiedDriverCode: false,
    }), /Missing or invalid advertiser price source/);
  } finally {
    rate.value = original;
  }
});
