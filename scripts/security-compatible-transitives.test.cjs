"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { once } = require("node:events");
const { gzipSync } = require("node:zlib");
const { createRequire } = require("node:module");

const root = path.resolve(__dirname, "..");
const { readOverrides } = require("./pnpm-overrides-config.cjs");
const overrides = readOverrides();
const lock = fs.readFileSync(path.join(root, "pnpm-lock.yaml"), "utf8").replace(/\r\n?/g, "\n");
const expected = {
  "@nestjs/platform-express>body-parser": "1.20.9",
  "express@4>body-parser": "1.20.9",
  "express@5>body-parser": "2.4.0",
  "next@15.5.29>postcss": "8.5.33",
  "@nestjs/cli>glob": "10.5.0",
  "@angular-devkit/core>picomatch": "4.0.7",
  "@nestjs/config>lodash": "4.18.1",
  "@nestjs/swagger>lodash": "4.18.1",
  "@nestjs/swagger>js-yaml": "4.3.2"
};

test("actual Nest and MCP parsers preserve JSON while rejecting malformed or oversized gzip", { timeout: 10000 }, async () => {
  const apiRequire = createRequire(path.join(root, "apps/api/package.json"));
  const nestRequire = createRequire(apiRequire.resolve("@nestjs/platform-express"));
  const sdkRequire = createRequire(apiRequire.resolve("@modelcontextprotocol/sdk/server/mcp.js"));
  const expressRequire = createRequire(sdkRequire.resolve("express"));
  for (const ownerRequire of [nestRequire, expressRequire]) {
    const parser = ownerRequire("body-parser").json({ limit: "1kb" });
    const server = http.createServer((request, response) => {
      parser(request, response, error => {
        response.setHeader("Content-Type", "application/json");
        response.statusCode = error?.status || 200;
        response.end(JSON.stringify(error ? { type: error.type } : request.body));
      });
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const send = body => new Promise((resolve, reject) => {
      const request = http.request({
        host: "127.0.0.1", port: server.address().port, method: "POST", agent: false,
        headers: { "Content-Type": "application/json", "Content-Encoding": "gzip", "Content-Length": body.length },
      }, response => {
        const chunks = [];
        response.on("data", chunk => chunks.push(chunk));
        response.on("end", () => resolve({ status: response.statusCode, body: JSON.parse(Buffer.concat(chunks).toString()) }));
      });
      request.setTimeout(2000, () => request.destroy(new Error("Local parser fixture timed out")));
      request.on("error", reject);
      request.end(body);
    });
    try {
      const valid = gzipSync(Buffer.from('{"accepted":true}'));
      assert.deepEqual(await send(valid), { status: 200, body: { accepted: true } });
      assert.equal((await send(gzipSync(Buffer.from("not-json")))).status, 400);
      assert.equal((await send(gzipSync(Buffer.from(JSON.stringify({ value: "x".repeat(2048) }))))).status, 413);
      assert.equal((await send(Buffer.concat([valid, Buffer.from("invalid-trailer")]))).status, 400);
    } finally {
      await new Promise(resolve => server.close(resolve));
    }
  }
});

test("overrides affect only identified vulnerable package versions, preserving major lines", () => {
  for (const [selector, version] of Object.entries(expected)) {
    assert.equal(overrides[selector], version);
    assert.ok(selector.includes(">"), "Overrides must target a proven parent edge: " + selector);
    const targetMajor = selector === "express@5>body-parser" ? 2
      : selector.endsWith(">body-parser") ? 1
      : selector.endsWith(">postcss") ? 8
      : selector.endsWith(">glob") ? 10
      : selector.endsWith(">picomatch") ? 4
      : selector.endsWith(">lodash") || selector.endsWith(">js-yaml") ? 4
      : NaN;
    assert.equal(Number(version.split(".")[0]), targetMajor);
  }
  assert.equal(overrides.multer, "2.5.0");
  assert.equal(overrides["follow-redirects"], "1.16.2");
});

test("pnpm generated lock no longer contains the targeted unsafe resolutions", () => {
  const vulnerable = [
    "body-parser@1.20.4", "body-parser@1.20.8", "body-parser@2.3.0",
    "postcss@8.4.31", "glob@10.4.5", "picomatch@4.0.1",
    "lodash@4.17.21", "js-yaml@4.1.0"
  ];
  for (const installed of vulnerable) {
    assert.ok(!lock.includes("\n  " + installed + ":"),
      "Vulnerable lock package remains: " + installed);
    assert.ok(!lock.includes("\n  " + installed + "("),
      "Vulnerable lock snapshot remains: " + installed);
  }
  for (const patched of new Set(Object.entries(expected).map(([k,v]) => k.slice(k.indexOf(">")+1) + "@" + v))) {
    assert.ok(lock.includes("\n  " + patched + ":"),
      "Expected fixed package resolution: " + patched);
  }
});

test("MCP SDK resolves patched Hono Node transport without changing SDK major", () => {
  const selector = "@modelcontextprotocol/sdk>@hono/node-server";
  assert.equal(overrides[selector], "2.1.6");
  assert.match(lock, /\n  '@hono\/node-server@2\.1\.6':\n/);
  assert.doesNotMatch(lock, /\n  '@hono\/node-server@2\.1\.5':\n/);
  const snapshots = lock.split("\nsnapshots:\n")[1];
  assert.ok(snapshots, "Expected frozen lock snapshots");
  const sdk = /^  '@modelcontextprotocol\/sdk@1\.32\.1[^\n]*:\n/m.exec(snapshots);
  assert.ok(sdk, "Expected pinned MCP SDK 1.x snapshot");
  const rest = snapshots.slice(sdk.index + sdk[0].length);
  const end = rest.search(/^  \S/m);
  const entry = end === -1 ? rest : rest.slice(0, end);
  assert.match(entry, /^      '@hono\/node-server': 2\.1\.6(?:\(|$)/m);
});

test("NestJS common resolves patched file-type for the magic-number validator", () => {
  assert.equal(overrides["@nestjs/common>file-type"], "21.3.4");
  assert.match(lock, /\n  file-type@21\.3\.4:\n/);
  assert.doesNotMatch(lock, /\n  file-type@20\.4\.1:\n/);
  const snapshots = lock.split("\nsnapshots:\n")[1];
  assert.ok(snapshots, "Expected frozen lock snapshots");
  const nest = /^  '@nestjs\/common@10\.4\.22[^\n]*:\n/m.exec(snapshots);
  assert.ok(nest, "Expected NestJS common 10.4.22 runtime snapshot");
  const rest = snapshots.slice(nest.index + nest[0].length);
  const end = rest.search(/^  \S/m);
  const entry = end === -1 ? rest : rest.slice(0, end);
  assert.match(entry, /^      file-type: 21\.3\.4$/m);
});

test("NestJS FileTypeValidator accepts real PNG magic bytes and rejects MIME spoofing", {
  timeout: 10000,
}, async () => {
  const apiRequire = createRequire(path.join(root, "apps/api/package.json"));
  const { FileTypeValidator } = apiRequire("@nestjs/common");
  assert.equal(typeof FileTypeValidator, "function");
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2Y5Y8AAAAASUVORK5CYII=",
    "base64",
  );
  const validator = new FileTypeValidator({ fileType: /^image\/png$/ });
  assert.equal(await validator.isValid({
    buffer: png,
    mimetype: "application/octet-stream",
    originalname: "valid.png",
  }), true, "MIME detection should use actual PNG magic bytes");
  assert.equal(await validator.isValid({
    buffer: Buffer.from("not an image"),
    mimetype: "image/png",
    originalname: "spoofed.png",
  }), false, "Untrusted file extension or client MIME must not bypass validation");
});

test("Angular Devkit resolves patched AJV 8 without replacing legacy AJV 6", () => {
  assert.equal(overrides["@angular-devkit/core>ajv"], "8.20.0");
  assert.match(lock, /^  ajv@8\.20\.0:$/m);
  assert.doesNotMatch(lock, /^  ajv@8\.12\.0:$/m);
  assert.match(lock, /^  ajv@6\.15\.0:$/m);

  const snapshots = lock.split("\nsnapshots:\n")[1];
  assert.ok(snapshots, "Expected frozen lock snapshots");
  const angular = /^  '@angular-devkit\/core@17\.3\.11[^\n]*:\n/m.exec(snapshots);
  assert.ok(angular, "Expected Angular Devkit 17 build tool");
  const tail = snapshots.slice(angular.index + angular[0].length);
  const next = tail.search(/^  \S/m);
  const block = next === -1 ? tail : tail.slice(0, next);
  assert.match(block, /^      ajv: 8\.20\.0$/m);
  assert.match(block, /^      ajv-formats: 2\.1\.1\(ajv@8\.20\.0\)$/m);
});

test("patched AJV 8.20 validates schemas while Angular Devkit is locked to this version", () => {
  const apiRequire = createRequire(path.join(root, "apps/api/package.json"));
  const sdkRequire = createRequire(apiRequire.resolve("@modelcontextprotocol/sdk/server/mcp.js"));
  assert.equal(sdkRequire("ajv/package.json").version, "8.20.0");
  const Ajv = sdkRequire("ajv").default;
  assert.equal(typeof Ajv, "function");
  const validator = new Ajv({ allErrors: true }).compile({
    type: "object",
    required: ["route"],
    properties: { route: { type: "string", pattern: "^/" } },
    additionalProperties: false,
  });
  assert.equal(validator({ route: "/campaign" }), true);
  assert.equal(validator({ route: "campaign" }), false);
  assert.equal(validator({ route: "/campaign", unexpected: true }), false);
});

test("security lock preparation workflow does not reach main", () => {
  const exists = fs.existsSync(path.join(root,
    ".github/workflows/security-compatible-lockfile-generator.yml"));
  assert.equal(exists, false);
});
