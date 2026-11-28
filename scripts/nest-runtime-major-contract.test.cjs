"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");

const root = path.resolve(__dirname, "..");
const apiRequire = createRequire(path.join(root, "apps/api/package.json"));
const packages = ["@nestjs/core", "@nestjs/common", "@nestjs/platform-express"];

function major(range) {
  const match = /^[~^]?(\d+)\./.exec(range || "");
  assert.ok(match, "Expected a pinned semver major: " + range);
  return Number(match[1]);
}

test("root and API NestJS core, common and platform-express declare a single matching major", () => {
  for (const file of ["package.json", "apps/api/package.json"]) {
    const dependencies = JSON.parse(fs.readFileSync(path.join(root, file), "utf8")).dependencies;
    const versions = packages.map(name => major(dependencies[name]));
    assert.equal(new Set(versions).size, 1, file + " must not mix Nest core/common/HTTP adapter majors");
  }
});

test("effective API Nest runtime satisfies the peer-dependency major contract", () => {
  const versions = new Map(packages.map(name => [
    name, apiRequire(name + "/package.json"),
  ]));
  const majors = packages.map(name => major(versions.get(name).version));
  assert.equal(new Set(majors).size, 1, "Actual installed Nest packages must use one major");
  const accepted = String.raw`(?:^|\s|\|)\^` + major(versions.get("@nestjs/core").version) + String.raw`\.`;
  for (const [owner, dependency] of [
    ["@nestjs/core", "@nestjs/common"],
    ["@nestjs/core", "@nestjs/platform-express"],
    ["@nestjs/platform-express", "@nestjs/common"],
    ["@nestjs/platform-express", "@nestjs/core"],
  ]) {
    const declared = versions.get(owner).peerDependencies?.[dependency];
    assert.equal(typeof declared, "string", owner + " must declare " + dependency + " as peer");
    assert.match(declared, new RegExp(accepted), owner + " expects a different Nest major for " + dependency);
  }
});

test("minimal real Nest + Express app boots and serves a local HTTP request", { timeout: 10000 }, async () => {
  const { NestFactory } = apiRequire("@nestjs/core");
  const { Module, Controller, Get } = apiRequire("@nestjs/common");
  const { ExpressAdapter } = apiRequire("@nestjs/platform-express");

  class ProbeController {
    ping() { return { status: "up" }; }
  }
  Controller("probe")(ProbeController);
  Get("ping")(ProbeController.prototype, "ping", Object.getOwnPropertyDescriptor(ProbeController.prototype, "ping"));

  class ProbeModule {}
  Module({ controllers: [ProbeController] })(ProbeModule);

  let app;
  try {
    app = await NestFactory.create(ProbeModule, new ExpressAdapter(), {
      logger: false,
      abortOnError: false,
    });
    await app.listen(0, "127.0.0.1");
    const address = app.getHttpServer().address();
    assert.ok(address && typeof address.port === "number");
    const response = await fetch("http://127.0.0.1:" + address.port + "/probe/ping", {
      signal: AbortSignal.timeout(3000),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "up" });
  } finally {
    if (app) await app.close();
  }
});
