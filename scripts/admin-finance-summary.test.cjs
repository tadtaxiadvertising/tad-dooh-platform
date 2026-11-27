"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(root, "apps/admin/pages/admin/finance/index.tsx"),
  "utf8",
);
const helperSource = fs.readFileSync(
  path.join(root, "apps/admin/lib/finance-summary.ts"),
  "utf8",
);
const exportsObject = {};
const helperCode = ts.transpileModule(helperSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
new Function("exports", helperCode)(exportsObject);
const { parseFinancialSummary, formatFinancialMetric } = exportsObject;
const valid = {
  mrr: 0,
  activeSubscribers: 0,
  campaignRevenue: 0,
  burnRate: 0,
  netProjection: 0,
};

test("zero and negative net projections are real numbers, not missing data", () => {
  assert.deepEqual(parseFinancialSummary(valid), valid);
  assert.deepEqual(
    parseFinancialSummary({ ...valid, netProjection: -500 }),
    { ...valid, netProjection: -500 },
  );
  assert.equal(formatFinancialMetric(0), "RD$ 0");
  assert.equal(formatFinancialMetric(0, false), "0");
});

test("missing, invalid and nonfinite summaries are rejected", () => {
  for (const payload of [
    null, undefined, [], {}, { ...valid, mrr: "0" },
    { ...valid, netProjection: Infinity }, { ...valid, burnRate: NaN },
    { ...valid, activeSubscribers: -1 }, { ...valid, activeSubscribers: 0.5 },
  ]) {
    assert.equal(parseFinancialSummary(payload), null);
  }
  for (const value of [undefined, null, NaN, Infinity, "0"]) {
    assert.equal(formatFinancialMetric(value), "No disponible");
  }
});

// Execute the actual page's loadData callback with synthetic I/O and state
// setters, not a browser or authenticated portal.
function fixture(getFinancialSummary) {
  const tree = ts.createSourceFile("finance.tsx", source, ts.ScriptTarget.Latest,
    true, ts.ScriptKind.TSX);
  let initializer;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(tree) === "loadData") {
      initializer = node.initializer;
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  assert.ok(initializer && ts.isCallExpression(initializer));
  const callback = initializer.arguments[0].getText(tree);
  let summary = null;
  let status = "loading";
  const summaryRequest = { current: 0 };
  const noop = () => {};
  const deps = {
    summaryRequest, getFinancialSummary, parseFinancialSummary,
    setSummary: (value) => { summary = value; },
    setSummaryStatus: (value) => { status = value; },
    setLoading: noop, setError: noop, activeTab: "payroll",
    getAutoPayroll: async () => [], getCampaignBilling: async () => [],
    getFinancialLedger: async () => [], setPayroll: noop,
    setCampaignData: noop, setLedger: noop,
    console: { warn: noop, error: noop },
  };
  const load = new Function(...Object.keys(deps), "return (" + callback + ");")(
    ...Object.values(deps),
  );
  return { load, state: () => ({ summary, status }) };
}

test("successful zero, subsequent failure, and retry preserve the real state", async () => {
  let attempt = 0;
  const f = fixture(async () => {
    if (++attempt === 2) throw new Error("synthetic summary failure");
    return valid;
  });
  await f.load();
  assert.deepEqual(f.state(), { summary: valid, status: "ready" });
  const failed = f.load();
  assert.deepEqual(f.state(), { summary: null, status: "loading" });
  await failed;
  assert.deepEqual(f.state(), { summary: null, status: "error" });
  await f.load();
  assert.deepEqual(f.state(), { summary: valid, status: "ready" });
});

test("older successful response cannot overwrite a newer failure", async () => {
  let resolveOld;
  let attempt = 0;
  const f = fixture(() => ++attempt === 1
    ? new Promise((resolve) => { resolveOld = resolve; })
    : Promise.reject(new Error("newer failure")));
  const old = f.load();
  await f.load();
  resolveOld(valid);
  await old;
  assert.deepEqual(f.state(), { summary: null, status: "error" });
});

test("malformed payload leaves summary unavailable", async () => {
  const f = fixture(async () => ({ ...valid, mrr: "0" }));
  await f.load();
  assert.deepEqual(f.state(), { summary: null, status: "error" });
});

test("cards use the boundary and do not assert an unsupported health ratio", () => {
  for (const field of ["mrr", "campaignRevenue", "burnRate", "netProjection"]) {
    assert.ok(source.includes("value={metric(summary?." + field + ")}"));
  }
  assert.ok(source.includes("metric(summary?.activeSubscribers, false)"));
  assert.ok(source.includes("Resumen financiero no disponible"));
  assert.doesNotMatch(source, /SALUDABLE|netProjection > 0 \? 85 : 15/);
});
