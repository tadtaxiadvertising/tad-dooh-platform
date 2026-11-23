"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const main = fs.readFileSync(
  path.resolve(__dirname, "../apps/api/src/main.ts"),
  "utf8",
);
const corsBlock = main.match(/app\.enableCors\(\{([\s\S]*?)\n\s*\}\);/);

test("GPS browser requests can preflight the DEVICE_AUTH header", () => {
  assert.ok(corsBlock, "API must configure CORS in main.ts");
  const headerMatch = corsBlock[1].match(/\ballowedHeaders:\s*"([^"]+)"/);
  assert.ok(headerMatch, "CORS headers must remain explicit and reviewable");
  const headers = new Set(
    headerMatch[1].split(",").map((name) => name.trim().toLowerCase()),
  );
  for (const required of [
    "content-type",
    "authorization",
    "x-device-id",
    "x-device-token",
  ]) {
    assert.ok(headers.has(required), `Preflight missing ${required}`);
  }
  assert.equal(headers.has("*"), false, "Wildcard headers forbidden");
});

test("device-token preflight does not relax origin restrictions", () => {
  assert.ok(corsBlock, "API must configure CORS in main.ts");
  assert.match(corsBlock[1], /allowedOrigins\.includes\(normalizedOrigin\)/);
  assert.match(corsBlock[1], /callback\(new Error\(`/);
  // A wildcard origin remains a separate existing environment setting and
  // must not be introduced by this narrowly scoped authorization fix.
  assert.doesNotMatch(
    corsBlock[1], /origin:\s*true|origin:\s*"\*"/,
  );
});
