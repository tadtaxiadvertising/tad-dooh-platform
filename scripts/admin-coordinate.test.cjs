const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const file = path.resolve(__dirname, "../apps/admin/utils/mapCoordinates.ts");
const js = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  fileName: file,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const mod = { exports: {} };
new Function("exports", "module", js)(mod.exports, mod);
const { parseMapCoordinate } = mod.exports;

test("valid numeric coordinates preserve signed zero and decimal precision", () => {
  for (const [raw, expected] of [
    [0, 0], ["0", 0], [" 0 ", 0], [-0, -0],
    [18.4861, 18.4861], [" 18.4861 ", 18.4861],
    ["-69.9312", -69.9312], [-69.9312, -69.9312],
  ]) assert.ok(Object.is(parseMapCoordinate(raw), expected),
    String(raw) + " must normalize exactly");
});

test("missing and non-numeric locations do not silently become zero", () => {
  for (const raw of [undefined, null, "", " ", "\t", "NaN", "Infinity",
    "-Infinity", "not a number", {}, [], true, false]) {
    assert.ok(Number.isNaN(parseMapCoordinate(raw)), String(raw));
  }
});

test("the map rejects coordinates outside geographic bounds at its rendering boundary", () => {
  const map = fs.readFileSync(path.resolve(__dirname, "../apps/admin/components/MapView.tsx"), "utf8");
  assert.match(map, /parseMapCoordinate\(rawLatitude\)/);
  assert.match(map, /parseMapCoordinate\(rawLongitude\)/);
  assert.match(map, /latitude < -90/);
  assert.match(map, /latitude > 90/);
  assert.match(map, /longitude < -180/);
  assert.match(map, /longitude > 180/);
  assert.doesNotMatch(map, /L\.MarkerCluster/);
});

test("API proxy preserves existing cookie strings without undefined or number headers", () => {
  const proxy = fs.readFileSync(path.resolve(__dirname, "../apps/admin/pages/api/proxy/[...path].ts"), "utf8");
  assert.match(proxy, /Array\.isArray\(existingCookies\)/);
  assert.match(proxy, /typeof existingCookies === "string"/);
  assert.match(proxy, /res\.setHeader\("set-cookie", \[\.\.\.cookiesArray, serverSetCookie\]\)/);
});
