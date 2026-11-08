"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createRequire } = require("node:module");

const root = path.resolve(__dirname, "..");
const apiRequire = createRequire(path.join(root, "apps/api/package.json"));
const servicesRequire = createRequire(path.join(root, "packages/services/package.json"));
const driverRequire = createRequire(path.join(root, "apps/driver/package.json"));

function loadAuthSchemas() {
  const ts = require("typescript");
  const filename = path.join(root, "packages/services/auth-schemas.ts");
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(compiled, {
    module: loaded, exports: loaded.exports, require: servicesRequire,
  }, { filename, timeout: 1000 });
  return loaded.exports;
}

function loadWorkboxSerializer() {
  const pwaRequire = createRequire(driverRequire.resolve("@ducanh2912/next-pwa"));
  const webpackPluginRequire = createRequire(pwaRequire.resolve("workbox-webpack-plugin"));
  const buildRequire = createRequire(webpackPluginRequire.resolve("workbox-build"));
  const terserRequire = createRequire(buildRequire.resolve("@rollup/plugin-terser"));
  return {
    serialize: terserRequire("serialize-javascript"),
    version: terserRequire("serialize-javascript/package.json").version,
  };
}

test("every direct Zod consumer resolves the patched v4 implementation", () => {
  for (const owner of [
    "apps/admin", "apps/driver", "apps/api", "apps/agents-orchestrator",
    "packages/services", "packages/impact-calculator",
  ]) {
    const ownerRequire = createRequire(path.join(root, owner, "package.json"));
    const version = ownerRequire("zod/package.json").version.split(".").map(Number);
    assert.equal(version[0], 4, owner);
    assert.ok(version[1] > 6 || (version[1] === 6 && version[2] >= 6), owner);
    const z = ownerRequire("zod");
    const invalid = z.array(z.string()).max(3).safeParse([1, 2, 3, 4]);
    assert.equal(invalid.success, false, owner);
    assert.ok(invalid.error.issues.length > 0, owner);
  }
});

test("real shared auth schemas preserve accepted credentials and denial paths", () => {
  const schemas = loadAuthSchemas();
  const valid = { email: "operator@tad.do", password: "ValidPass123" };
  assert.equal(schemas.LoginSchema.safeParse(valid).success, true);
  assert.equal(schemas.LoginSchema.safeParse({ ...valid, email: "operator@untrusted.invalid" }).success, false);
  assert.equal(schemas.LoginSchema.safeParse({ ...valid, password: "DROP TABLE users" }).success, false);
  assert.equal(schemas.PublicCredentialsSchema.safeParse({ ...valid, email: "owner@business.invalid" }).success, true);
  assert.equal(schemas.RecoverySchema.safeParse({ email: valid.email }).success, true);
  assert.equal(schemas.RecoverySchema.safeParse({ email: "invalid-email" }).success, false);
  assert.equal(schemas.UpdatePasswordSchema.safeParse({ password: valid.password, confirmPassword: valid.password }).success, true);
  const mismatch = schemas.UpdatePasswordSchema.safeParse({ password: valid.password, confirmPassword: "AnotherPass123" });
  assert.equal(mismatch.success, false);
  assert.ok(mismatch.error.issues.some(issue => issue.path.includes("confirmPassword")));
});

test("transformed auth emails normalize case without throwing and keep denial rules", () => {
  const schemas = loadAuthSchemas();
  for (const [schema, input, normalized] of [
    [schemas.LoginSchema, { email: "Operator@TAD.DO", password: "ValidPass123" }, "operator@tad.do"],
    [schemas.RecoverySchema, { email: "Operator@TAD.DO" }, "operator@tad.do"],
    [schemas.PublicCredentialsSchema, { email: "Owner@Business.Invalid", password: "ValidPass123" }, "owner@business.invalid"],
  ]) {
    const result = schema.safeParse(input);
    assert.equal(result.success, true);
    assert.equal(result.data.email, normalized);
  }
  for (const schema of [schemas.LoginSchema, schemas.RecoverySchema, schemas.PublicCredentialsSchema]) {
    const injection = schema.safeParse({ email: "SELECT@TAD.DO", password: "ValidPass123" });
    assert.equal(injection.success, false);
  }
  for (const schema of [schemas.LoginSchema, schemas.RecoverySchema]) {
    assert.equal(schema.safeParse({ email: "Operator@UNTRUSTED.INVALID", password: "ValidPass123" }).success, false);
  }
});

test("MCP validates Zod v4 input using only linked in-memory transports", { timeout: 5000 }, async () => {
  const { McpServer } = apiRequire("@modelcontextprotocol/sdk/server/mcp.js");
  const { Client } = apiRequire("@modelcontextprotocol/sdk/client/index.js");
  const { InMemoryTransport } = apiRequire("@modelcontextprotocol/sdk/inMemory.js");
  const z = apiRequire("zod");
  const server = new McpServer({ name: "tad-security-fixture", version: "1.0.0" });
  const client = new Client({ name: "tad-security-fixture-client", version: "1.0.0" });
  server.registerTool("fixture_echo", {
    inputSchema: z.object({ message: z.string().min(1) }),
  }, async ({ message }) => ({ content: [{ type: "text", text: message }] }));
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    const result = await client.callTool({ name: "fixture_echo", arguments: { message: "local-only" } });
    assert.equal(result.content[0].text, "local-only");
    const invalid = await client.callTool({ name: "fixture_echo", arguments: { message: 42 } });
    assert.equal(invalid.isError, true);
  } finally {
    await client.close();
    await server.close();
  }
});

test("the actual Workbox minifier resolves patched serialization and preserves options", () => {
  const { serialize, version } = loadWorkboxSerializer();
  assert.equal(version, "7.1.3");
  const options = { pattern: /fixture/gi, expires: new Date("2026-01-01T00:00:00Z"), values: [1, "two"] };
  const restored = vm.runInNewContext("(" + serialize(options) + ")", {}, { timeout: 100 });
  assert.equal(restored.pattern.source, "fixture");
  assert.equal(restored.pattern.flags, "gi");
  assert.equal(restored.expires.toISOString(), options.expires.toISOString());
  assert.equal(JSON.stringify(restored.values), JSON.stringify(options.values));
});

test("spoofed RegExp flags and Date serialization cannot execute marker code", () => {
  const { serialize } = loadWorkboxSerializer();
  const regex = Object.create(RegExp.prototype);
  Object.defineProperty(regex, "source", { get: () => "x" });
  Object.defineProperty(regex, "flags", { get: () => '\"+(global.compromised=true)+\"' });
  regex.toJSON = () => "@placeholder";
  const date = Object.create(Date.prototype);
  date.toISOString = () => '\"+(global.compromised=true)+\"';
  date.toJSON = () => "@placeholder";
  for (const payload of [regex, date]) {
    const context = { compromised: false };
    context.global = context;
    try {
      const serialized = serialize({ payload });
      vm.runInNewContext("result = " + serialized, context, { timeout: 100 });
    } catch (error) {
      // Rejecting a spoofed built-in or invalid flags is also a safe outcome.
      assert.match(error.name, /^(?:TypeError|SyntaxError|Error)$/);
    }
    assert.equal(context.compromised, false);
  }
});
