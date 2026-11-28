"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const main = fs.readFileSync(path.join(root, "apps/api/src/main.ts"), "utf8");
const controller = fs.readFileSync(
  path.join(root, "apps/api/src/health/health.controller.ts"),
  "utf8",
);
const readiness = fs.readFileSync(
  path.join(root, "scripts/check-api-readiness.cjs"),
  "utf8",
);

test("every public health path is excluded explicitly from /api/v1 global prefix", () => {
  const prefix = main.slice(
    main.indexOf('app.setGlobalPrefix("api/v1"'),
    main.indexOf("// SHELTER C-I1"),
  );
  assert.ok(prefix.includes('app.setGlobalPrefix("api/v1"'));
  for (const route of ["health", "health/full", "health/ready"]) {
    assert.ok(
      prefix.includes(`{ path: "${route}", method: RequestMethod.GET }`),
      `Missing exact public health route: ${route}`,
    );
  }
});

test("DB metrics are not added to the root public health exclusions", () => {
  const prefix = main.slice(
    main.indexOf('app.setGlobalPrefix("api/v1"'),
    main.indexOf("// SHELTER C-I1"),
  );
  assert.ok(!prefix.includes('{ path: "health/db", method: RequestMethod.GET }'));
});

test("/health/ready is public but does not expose internal database metrics", () => {
  assert.match(controller, /@Get\("ready"\)\s+@Public\(\)/);
  const method = controller.slice(
    controller.indexOf("async checkReady()"),
    controller.indexOf('@Get("full")'),
  );
  assert.match(method, /getHealthMetrics\(\)/);
  assert.match(method, /db\?\.connected === true/);
  assert.match(method, /db\?\.masterSyncViewReady === true/);
  assert.match(method, /ServiceUnavailableException/);
  assert.match(method, /status: "degraded"/);
  assert.doesNotMatch(method, /activeConnections:|memory:|return \{[^}]*db\s*[,:]/);
});

test("liveness remains independent of the database and external validation uses /health/full", () => {
  assert.match(controller, /@Get\(\)\s+@Public\(\)\s+check\(\)/);
  assert.ok(readiness.includes("read('/health')"));
  assert.ok(readiness.includes("read('/health/full')"));
  assert.match(controller, /@Get\("full"\)\s+@Public\(\)/);
});
