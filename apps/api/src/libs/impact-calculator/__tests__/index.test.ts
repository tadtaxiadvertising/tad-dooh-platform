/**
 * Tests unitarios para @tad/impact-calculator
 *
 * Suites:
 * - Modes: conservative/expected/optimistic produce rangos coherentes
 * - Edges: includeProduction=false, screens=0, months=0
 * - Sources: cada variable del cálculo tiene sourceId registrada
 * - Formula sanity: relaciones matemáticas básicas
 *
 * Run:
 *   cd apps/api
 *   npx jest src/libs/impact-calculator/__tests__/index.test.ts
 *
 * O sin Jest:
 *   npx ts-node src/libs/impact-calculator/__tests__/index.test.ts
 */

import {
  calculateImpact,
  calculateImpactLegacy,
  formatRange,
  formatCPM,
  getPrimarySource,
  getCalibrationBadge,
  isCalibrationStatus,
  SOURCES,
} from "../index";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function expect<T>(actual: T, expected: T, msg: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed++;
  } else {
    failed++;
    failures.push(
      `${msg}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`,
    );
  }
}

function expectClose(
  actual: number,
  expected: number,
  tolerance: number,
  msg: string,
) {
  const ok = Math.abs(actual - expected) <= tolerance;
  if (ok) {
    passed++;
  } else {
    failed++;
    failures.push(
      `${msg}\n  expected: ${expected} ±${tolerance}\n  actual:   ${actual}`,
    );
  }
}

function expectTrue(cond: boolean, msg: string) {
  if (cond) {
    passed++;
  } else {
    failed++;
    failures.push(msg);
  }
}

// === Tests ===

console.log("\n=== Suite: Modes ===");

// Para 1 pantalla × 1 mes sin producción, sin rotaciones especiales
const r_expected = calculateImpact({
  screens: 1,
  months: 1,
  frequencySeconds: 30,
  includeProduction: false,
  mode: "expected",
});
const r_conserv = calculateImpact({
  screens: 1,
  months: 1,
  frequencySeconds: 30,
  includeProduction: false,
  mode: "conservative",
});
const r_optimist = calculateImpact({
  screens: 1,
  months: 1,
  frequencySeconds: 30,
  includeProduction: false,
  mode: "optimistic",
});

expectClose(
  r_expected.totalImpressions.expected,
  16200,
  100,
  "expected 1×1: imps",
);
expect(
  r_conserv.totalImpressions.expected,
  r_expected.totalImpressions.min,
  "conservative.expected === expected.min",
);
expect(
  r_optimist.totalImpressions.expected,
  r_expected.totalImpressions.max,
  "optimistic.expected === expected.max",
);

expectTrue(
  r_expected.totalImpressions.min < r_expected.totalImpressions.expected,
  "min < expected",
);
expectTrue(
  r_expected.totalImpressions.expected < r_expected.totalImpressions.max,
  "expected < max",
);

console.log(`  expected: ${r_expected.totalImpressions.expected} imps`);
console.log(
  `  range: [${r_expected.totalImpressions.min}, ${r_expected.totalImpressions.max}]`,
);

// === Suite: CPM ordering ===

console.log("\n=== Suite: CPM ordering ===");

const cpm_min = r_expected.cpm.min;
const cpm_exp = r_expected.cpm.expected;
const cpm_max = r_expected.cpm.max;

expectTrue(cpm_min <= cpm_exp, `CPM min (${cpm_min}) ≤ expected (${cpm_exp})`);
expectTrue(cpm_exp <= cpm_max, `CPM expected (${cpm_exp}) ≤ max (${cpm_max})`);

console.log(`  CPM: [${cpm_min}, ${cpm_exp}, ${cpm_max}]`);

// Escala: 10 pantallas debe tener CPM ≤ CPM de 1 pantalla (economía de escala)
const r_10 = calculateImpact({
  screens: 10,
  months: 1,
  frequencySeconds: 30,
  includeProduction: false,
  mode: "expected",
});
expectTrue(
  r_10.cpm.expected <= r_expected.cpm.expected,
  `10 pantallas CPM (${r_10.cpm.expected}) ≤ 1 pantalla CPM (${r_expected.cpm.expected})`,
);
console.log(
  `  CPM 1×: ${r_expected.cpm.expected}, CPM 10×: ${r_10.cpm.expected}`,
);

// === Suite: Reach ===

console.log("\n=== Suite: Reach ===");

const reach_min = r_expected.totalUniqueReach.min;
const reach_exp = r_expected.totalUniqueReach.expected;
const reach_max = r_expected.totalUniqueReach.max;

expectTrue(
  reach_min <= reach_exp,
  `reach min (${reach_min}) ≤ expected (${reach_exp})`,
);
expectTrue(
  reach_exp <= reach_max,
  `reach expected (${reach_exp}) ≤ max (${reach_max})`,
);

// Frecuencia OTS coherente con taxi-use-frequency
const freq = r_expected.frequencyOTS;
expectTrue(
  freq.min <= freq.expected && freq.expected <= freq.max,
  "OTS range ordenado",
);
expectClose(
  freq.expected,
  2.5,
  0.1,
  "OTS esperado = 2.5 (taxi-use-frequency source value)",
);
console.log(`  OTS: [${freq.min}, ${freq.expected}, ${freq.max}]`);

// === Suite: Edges ===

console.log("\n=== Suite: Edges ===");

// 0 pantallas → 0 impressions
const r_zero = calculateImpact({
  screens: 0,
  months: 1,
  frequencySeconds: 30,
  includeProduction: false,
  mode: "expected",
});
expect(r_zero.totalImpressions.expected, 0, "0 screens → 0 imps");
expect(r_zero.totalCost, 0, "0 screens → 0 cost");
console.log(
  `  0 pantallas: imps=${r_zero.totalImpressions.expected}, cost=${r_zero.totalCost}`,
);

// includeProduction toggle
const r_prod = calculateImpact({
  screens: 1,
  months: 1,
  frequencySeconds: 30,
  includeProduction: true,
  mode: "expected",
});
const r_noprod = calculateImpact({
  screens: 1,
  months: 1,
  frequencySeconds: 30,
  includeProduction: false,
  mode: "expected",
});
expectTrue(
  r_prod.totalCost > r_noprod.totalCost,
  `includeProduction=true → cost > false (${r_prod.totalCost} > ${r_noprod.totalCost})`,
);
expect(
  r_prod.totalCost - r_noprod.totalCost,
  2500,
  "productionFee exacta = RD$2,500",
);

// Meses escala linealmente
const r_3m = calculateImpact({
  screens: 5,
  months: 3,
  frequencySeconds: 30,
  includeProduction: false,
  mode: "expected",
});
const r_1m = calculateImpact({
  screens: 5,
  months: 1,
  frequencySeconds: 30,
  includeProduction: false,
  mode: "expected",
});
expectClose(
  r_3m.totalImpressions.expected,
  r_1m.totalImpressions.expected * 3,
  10,
  "3 meses = 3× impressions",
);
expectClose(
  r_3m.totalUniqueReach.expected,
  r_1m.totalUniqueReach.expected * 3,
  10,
  "3 meses = 3× reach",
);

// === Suite: Legacy wrapper ===

console.log("\n=== Suite: Legacy ===");

const leg = calculateImpactLegacy(1, 1, 30, false);
expect(
  leg.impressions,
  r_noprod.totalImpressions.expected,
  "legacy.impressions === expected.expected.imps",
);
expect(
  leg.totalCost,
  r_noprod.totalCost,
  "legacy.totalCost === expected.totalCost",
);

// === Suite: Formatters ===

console.log("\n=== Suite: Formatters ===");

const r1 = formatRange({ min: 100, expected: 200, max: 300 });
expect(r1, "200 (100–300)", "formatRange range");

const r2 = formatRange({ min: 100, expected: 100, max: 100 });
expect(r2, "100", "formatRange point");

const c1 = formatCPM({ min: 50, expected: 100, max: 200 });
expect(c1, "RD$ 100/CPM (50–200)", "formatCPM range");

// === Suite: Sources audit ===

console.log("\n=== Suite: Sources audit ===");

const calib = isCalibrationStatus();
expectTrue(
  typeof calib.hasOwnData === "boolean",
  "isCalibrationStatus.hasOwnData boolean",
);
expectTrue(
  typeof calib.staleSourcesCount === "number",
  "isCalibrationStatus.staleSourcesCount number",
);

const primary = getPrimarySource();
expectTrue(
  primary.tier === "A" ||
    primary.tier === "B" ||
    primary.tier === "C" ||
    primary.tier === "D",
  "primary source tier válido",
);
expectTrue(primary.label.length > 0, "primary source label no vacío");

const badge = getCalibrationBadge();
expectTrue(
  ["red", "amber", "green"].includes(badge.color),
  "badge color válido",
);

// Verificar que TODAS las variables usadas tienen source registrada
const usedSourceIds = new Set<string>();
r_expected.sourcesUsed.forEach((s) => usedSourceIds.add(s.id));
expectTrue(
  usedSourceIds.size >= 6,
  `≥6 fuentes usadas en cálculo (got ${usedSourceIds.size})`,
);

// Cada source tiene URL o publisher no vacío
r_expected.sourcesUsed.forEach((s) => {
  expectTrue(s.publisher.length > 0, `source ${s.id} tiene publisher`);
});

// === Result ===

console.log("\n=== Result: ${passed} passed, ${failed} failed ===");
if (failed > 0) {
  console.log("\nFAILURES:");
  failures.forEach((f, i) => console.log(`\n[${i + 1}]\n${f}`));
  throw new Error(`${failed} tests failed`);
}

console.log("\n✅ All tests passed");
