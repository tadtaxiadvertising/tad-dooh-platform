const { test } = require('node:test');
const assert = require('node:assert/strict');
const { computeCls, medianFinite } = require('./landing-v3-measure.cjs');

const shift = (startTime, value, hadRecentInput = false) => ({ startTime, value, hadRecentInput });
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

test('CLS ignores input-related shifts and selects the largest session window', () => {
  near(computeCls([shift(100, 0.02), shift(200, 0.8, true), shift(300, 0.03), shift(2000, 0.09)]), 0.09);
  assert.equal(computeCls([]), 0);
  assert.equal(computeCls([shift(10, 0.8, true)]), 0);
});

test('CLS starts at the first shift, not navigation start', () => {
  near(computeCls([500, 1300, 2100, 2900, 3700, 4500, 5300].map(t => shift(t, 0.02))), 0.14);
});

test('CLS resets at one-second gaps or the five-second window limit', () => {
  near(computeCls([shift(100, 0.04), shift(1100, 0.05)]), 0.05);
  near(computeCls([500, 1400, 2300, 3200, 4100, 5000, 5500].map(t => shift(t, 0.02))), 0.12);
});

test('CLS uses chronological order and does not mutate samples', () => {
  const entries = [shift(3000, 0.02), shift(100, 0.1), shift(500, 0.05)];
  near(computeCls(entries), 0.15);
  assert.deepEqual(entries.map(item => item.startTime), [3000, 100, 500]);
});

test('lab median handles even samples and missing measurements explicitly', () => {
  assert.equal(medianFinite([300, 100, 200]), 200);
  assert.equal(medianFinite([100, 300, null, NaN]), 200);
  assert.equal(medianFinite([null, undefined, Infinity]), null);
  assert.equal(medianFinite([0]), 0);
});
