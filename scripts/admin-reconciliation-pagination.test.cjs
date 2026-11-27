"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exportsObject = {};
const helper = ts.transpileModule(read("apps/admin/lib/reconciliation-page.ts"), {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
  },
}).outputText;
new Function("exports", helper)(exportsObject);
const { parseReconciliationPage } = exportsObject;
const period = "2026-11";
const row = {
  id: "synthetic-1", period, deviceId: null, driver: null,
  totalPlaybacks: 0, revenueContracted: 0, revenueReceived: 0,
  payrollDue: 0, payrollPaid: 0, hasDiscrepancy: true,
  discrepancyType: "TEST", discrepancyAmount: 0,
};
const envelope = { period, data: [row], total: 101, page: 2, pageSize: 100, totalPages: 2 };

test("retains a valid final page and its metadata", () => {
  assert.deepEqual(parseReconciliationPage(envelope, period, 2, 100), envelope);
});
test("distinguishes an empty report from a missing or invalid report", () => {
  const empty = { ...envelope, data: [], total: 0, page: 1, totalPages: 0 };
  assert.deepEqual(parseReconciliationPage(empty, period, 1, 100), empty);
  for (const value of [null, {}, [], { ...empty, total: 1 }]) {
    assert.equal(parseReconciliationPage(value, period, 1, 100), null);
  }
});
test("rejects incorrect page, period, count, and row shape", () => {
  for (const value of [
    { ...envelope, page: 1 }, { ...envelope, period: "2026-10" },
    { ...envelope, pageSize: 50 }, { ...envelope, totalPages: 3 },
    { ...envelope, data: [{ ...row, period: "2026-10" }] },
    { ...envelope, data: [{ ...row, totalPlaybacks: null }] },
    { ...envelope, data: [{ ...row, revenueReceived: Infinity }] },
    { ...envelope, data: [{ ...row, hasDiscrepancy: "false" }] },
  ]) assert.equal(parseReconciliationPage(value, period, 2, 100), null);
});
test("rejects repeated identities within a page", () => {
  assert.equal(parseReconciliationPage({
    ...envelope, total: 102, data: [row, row],
  }, period, 2, 100), null);
});

function callback(source, name, dependencies) {
  const tree = ts.createSourceFile("component.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let initializer;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(tree) === name) {
      initializer = node.initializer;
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  assert.ok(initializer && ts.isCallExpression(initializer));
  return new Function(...Object.keys(dependencies), "return (" + initializer.arguments[0].getText(tree) + ");")(
    ...Object.values(dependencies),
  );
}

const pageSource = read("apps/admin/pages/admin/bi/reconciliation.tsx");
const feedSource = read("apps/admin/pages/admin/bi/index.tsx");
const noop = () => {};
function detailFixture(getReconciliationReport, getBiKpis = async () => ({})) {
  let data = null;
  let loading = true;
  const deps = {
    period, page: 2, requestRef: { current: 0 }, parseReconciliationPage,
    getReconciliationReport, getBiKpis, setKpis: noop,
    setLoading: (value) => { loading = value; },
    setReportPage: (value) => { data = value; },
    console: { error: noop }, toast: { error: noop },
  };
  return { load: callback(pageSource, "fetchData", deps), state: () => ({ data, loading }) };
}
test("detail requests page two and retains rows even if global KPI retrieval fails", async () => {
  const f = detailFixture(async (...args) => {
    assert.deepEqual(args, [period, 2, 100]);
    return envelope;
  }, async () => { throw new Error("synthetic KPI error"); });
  await f.load();
  assert.deepEqual(f.state(), { data: envelope, loading: false });
});
test("detail clears stale rows on failure and ignores an older completion", async () => {
  let resolveOld;
  let count = 0;
  const f = detailFixture(() => ++count === 1
    ? new Promise((resolve) => { resolveOld = resolve; })
    : Promise.reject(new Error("synthetic request error")));
  const old = f.load();
  await f.load();
  resolveOld(envelope);
  await old;
  assert.deepEqual(f.state(), { data: null, loading: false });
});
test("dashboard feed consumes the first page and distinguishes request failure", async () => {
  let data = null;
  let attempt = 0;
  const load = callback(feedSource, "fetchAll", {
    reconciliationRequest: { current: 0 }, parseReconciliationPage,
    setLoading: noop, setKpis: noop, setLastRefreshed: noop,
    setReconciliation: (value) => { data = value; },
    getBiKpis: async () => ({}),
    getReconciliationReport: async (requestedPeriod, page, size) => {
      assert.equal(page, 1); assert.equal(size, 100);
      if (++attempt === 2) throw new Error("synthetic failure");
      return { period: requestedPeriod, data: [{ ...row, period: requestedPeriod }], total: 1, page, pageSize: size, totalPages: 1 };
    },
    console: { error: noop }, toast: { error: noop },
  });
  await load();
  assert.equal(data.data[0].id, row.id);
  await load();
  assert.equal(data, null);
});
test("pagination is wired to the API and SQL ordering is stable for ties", () => {
  const service = read("packages/services/api.ts");
  const backend = read("apps/api/src/modules/bi/bi.service.ts");
  assert.match(service, /getReconciliationReport = \(period: string, page = 1, pageSize = 100\)/);
  assert.ok(service.includes("{ params: { page, pageSize } }"));
  assert.ok(backend.includes('orderBy: [{ hasDiscrepancy: "desc" }, { id: "asc" }]'));
  assert.ok(pageSource.includes("Paginación de conciliación"));
  assert.ok(pageSource.includes("La búsqueda se limita a la página actual."));
  assert.ok(feedSource.includes("Sin discrepancias en esta página"));
  assert.ok(feedSource.includes("No se pudo verificar la conciliación."));
});
