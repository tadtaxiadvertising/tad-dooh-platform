const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../apps/advertiser/node_modules/typescript');

// Execute the source helper without loading any app, client or provider.
const filename = path.resolve(__dirname, '../apps/driver/lib/earningsPreview.ts');
const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  fileName: filename,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const mod = { exports: {} };
new Function('exports', 'module', source)(mod.exports, mod);
const { previewDriverEarnings } = mod.exports;

test('driver educational preview preserves uncapped ordinary event counts and the 15-ad cap', () => {
  for (const count of [101, 1000]) {
    const result = previewDriverEarnings(Number.MAX_VALUE, count, count);
    assert.equal(result.ads, 15);
    assert.equal(result.sales, count);
    assert.equal(result.referrals, count);
    assert.equal(result.illustrativeTotalRD, 7500 + count * 1000);
  }
  assert.equal(previewDriverEarnings(2.9, 1.5, 1.5).illustrativeTotalRD, 2000);
  for (const value of [NaN, Infinity, -Infinity, -8]) {
    assert.equal(previewDriverEarnings(value, value, value).illustrativeTotalRD, 0);
  }
});

test('driver educational preview rejects product overflow and unsafe integer precision', () => {
  for (const count of [Number.MAX_VALUE, 1e306, Number.MAX_SAFE_INTEGER]) {
    for (const args of [[15, count, 1], [15, 1, count]]) {
      assert.throws(() => previewDriverEarnings(...args), {
        name: 'RangeError', message: /simulación.*capacidad.*numérica/i,
      });
    }
  }
});

test('driver educational preview rejects unsafe event subtotals even when each product is safe', () => {
  const count = 10_000_000_000_000;
  assert.ok(Number.isSafeInteger(count * 500), 'Each event stream is representable on its own.');
  assert.throws(() => previewDriverEarnings(0, count, count), RangeError);
});

test('driver educational preview validates the final total after adding capped ad income', () => {
  const count = Math.floor(Number.MAX_SAFE_INTEGER / 500);
  assert.ok(Number.isSafeInteger(count * 500));
  assert.equal(previewDriverEarnings(0, count, 0).illustrativeTotalRD, count * 500);
  assert.throws(() => previewDriverEarnings(15, count, 0), RangeError);
});


test('driver preview clearly separates monthly campaigns from approved one-time events', () => {
  const lab = fs.readFileSync(
    path.resolve(__dirname, '../apps/driver/components/landing/DriverEarningsLab.tsx'),
    'utf8',
  );
  assert.match(lab, /Ejemplo combinado: un mes de anuncios y bonos por eventos/);
  assert.match(lab, /Los ingresos de pantalla se ilustran por mes/);
  assert.match(lab, /referidos son bonos por eventos aprobados/);
  assert.match(lab, /no se repiten\s+automáticamente en meses siguientes/);
  assert.match(lab, /result\.recurringMonthlyExampleRD/);
  assert.match(lab, /result\.oneTimeEventsExampleRD/);
  assert.doesNotMatch(lab, /Total bruto del ejemplo, en un mismo período/);
});
