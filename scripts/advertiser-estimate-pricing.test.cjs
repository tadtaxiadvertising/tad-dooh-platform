"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..");

/**
 * Unit-test the real TypeScript implementation without Next.js, a database,
 * GitHub Actions, a web server or a production API. The only imports allowed
 * are the two checked-in impact modules and the advertiser facade.
 */
function evaluateTS(relativePath, dependencies = {}) {
  const file = path.join(ROOT, relativePath);
  const source = fs.readFileSync(file, "utf8");
  const javascript = ts.transpileModule(source, {
    fileName: file,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    reportDiagnostics: true,
  });
  const errors = (javascript.diagnostics || []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert.equal(errors.length, 0, ts.formatDiagnostics(errors, {
    getCanonicalFileName: f => f,
    getCurrentDirectory: () => ROOT,
    getNewLine: () => "\n",
  }));
  const moduleObject = { exports: {} };
  const scopedRequire = name => {
    assert.ok(Object.hasOwn(dependencies, name), "Unexpected dependency: " + name);
    return dependencies[name];
  };
  // Evaluate ONLY trusted, checked-in TS sources with an allowlisted import map.
  // No runtime network or filesystem access is available to the module itself.
  const factory = new Function("require", "module", "exports", javascript.outputText);
  factory(scopedRequire, moduleObject, moduleObject.exports);
  return moduleObject.exports;
}

function loadEstimate() {
  const sources = evaluateTS("packages/impact-calculator/sources.ts");
  const impact = evaluateTS("packages/impact-calculator/index.ts", { "./sources": sources });
  const facade = evaluateTS("apps/advertiser/components/advertiser/simulatorPricing.ts", {
    "@tad/impact-calculator": impact,
  });
  return { sources, impact, facade };
}

const example = { screens: 3, months: 2, frequencySeconds: 30, includeProduction: false };

test("advertiser onboarding's displayed unit prices match the SAME shared estimate", () => {
  const { sources, facade } = loadEstimate();
  const unitRate = sources.getSource("screen-monthly-rate-rd").value;
  const productionRate = sources.getSource("creative-production-fee").value;
  assert.equal(typeof unitRate, "number");
  assert.equal(typeof productionRate, "number");
  assert.equal(facade.SCREEN_MONTHLY_RATE, unitRate);
  assert.equal(facade.PRODUCTION_FEE, productionRate);
  const noProduction = facade.estimateCampaign(example);
  assert.equal(noProduction.screensCost, unitRate * example.screens * example.months);
  assert.equal(noProduction.productionFee, 0);
  assert.equal(noProduction.total, noProduction.screensCost);
  const withProduction = facade.estimateCampaign({ ...example, includeProduction: true });
  assert.equal(withProduction.productionFee, productionRate);
  assert.equal(withProduction.total, noProduction.total + productionRate);
});

test("deprecated historical source does NOT produce a false stale warning", () => {
  const { sources, impact } = loadEstimate();
  assert.equal(sources.getSource("reach-per-screen-legacy").stale, true);
  const result = impact.calculateImpact(example);
  assert.ok(result.calibrationStatus.staleSourcesCount >= 1,
    "Global catalog intentionally keeps the deprecated historical source");
  assert.ok(result.warnings.every(warning => !warning.includes("vencida")),
    "An unused legacy source must not be disclosed as part of a current estimate");
  assert.equal(result.totalCost,
    sources.getSource("screen-monthly-rate-rd").value * example.screens * example.months);
});

test("an ACTIVE source reports stale if explicitly flagged or after expiration", () => {
  const { sources, impact } = loadEstimate();
  const rate = sources.getSource("screen-monthly-rate-rd");
  const original = { stale: rate.stale, expiresAt: rate.expiresAt };
  try {
    rate.expiresAt = "2000-01-01";
    const byDate = impact.calculateImpact(example);
    assert.ok(byDate.warnings.some(w => w.includes("Fuente vencida: screen-monthly-rate-rd")));
    rate.expiresAt = "2099-01-01";
    rate.stale = true;
    const byFlag = impact.calculateImpact(example);
    assert.ok(byFlag.warnings.some(w => w.includes("Fuente vencida: screen-monthly-rate-rd")));
  } finally {
    rate.stale = original.stale;
    rate.expiresAt = original.expiresAt;
  }
});

test("invalid shared pricing source fails closed instead of silently showing another tariff", () => {
  const sources = evaluateTS("packages/impact-calculator/sources.ts");
  const impact = evaluateTS("packages/impact-calculator/index.ts", { "./sources": sources });
  const price = sources.getSource("screen-monthly-rate-rd");
  price.value = [100, 200, 300];
  assert.throws(() => evaluateTS(
    "apps/advertiser/components/advertiser/simulatorPricing.ts",
    { "@tad/impact-calculator": impact },
  ), /Invalid illustrative pricing source: screen-monthly-rate-rd/);
});
