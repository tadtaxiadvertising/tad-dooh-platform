"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const { realpathSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const { once } = require("node:events");
const { createRequire } = require("node:module");
const { pathToFileURL } = require("node:url");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const apiRequire = createRequire(path.join(root, "apps/api/package.json"));
const nestRequire = createRequire(apiRequire.resolve("@nestjs/platform-express"));
const expressRequire = createRequire(nestRequire.resolve("express"));
const qs = expressRequire("qs");

function loadWorkboxSerializer() {
  const driverRequire = createRequire(path.join(root, "apps/driver/package.json"));
  const pwaRequire = createRequire(driverRequire.resolve("@ducanh2912/next-pwa"));
  const pluginRequire = createRequire(pwaRequire.resolve("workbox-webpack-plugin"));
  const buildRequire = createRequire(pluginRequire.resolve("workbox-build"));
  const terserRequire = createRequire(buildRequire.resolve("@rollup/plugin-terser"));
  const entry = terserRequire.resolve("serialize-javascript");
  return { serialize: terserRequire("serialize-javascript"), entry };
}

test("the actual Nest query serializer handles attacker-controlled constructor.isBuffer", () => {
  const input = qs.parse("x[constructor][isBuffer]=not-callable", { plainObjects: true });
  assert.doesNotThrow(() => qs.stringify(input));
  assert.deepEqual(qs.parse(qs.stringify(input), { plainObjects: true }), input);
});

test("the actual Nest query serializer handles comma arrays with non-callable toString and nulls", () => {
  const hostile = { a: [{ toString: "not-callable" }] };
  for (const options of [
    { arrayFormat: "comma" },
    { arrayFormat: "comma", encodeValuesOnly: true },
  ]) {
    assert.doesNotThrow(() => qs.stringify(hostile, options));
    assert.doesNotThrow(() => qs.stringify({ a: [1, null, undefined, 2] }, options));
  }
  assert.equal(qs.stringify({ a: ["one", "two"] }, { arrayFormat: "comma" }), "a=one%2Ctwo");
});

test("the actual Nest query parser enforces comma array limits on bracket keys", () => {
  const options = { comma: true, arrayLimit: 3, throwOnLimitExceeded: true };
  assert.throws(() => qs.parse("a[]=1,2,3,4", options), RangeError);
  assert.deepEqual(qs.parse("a[]=1,2,3", options).a, [["1", "2", "3"]]);
});

test("the real Nest Express adapter preserves routing, query and body parsing over loopback", { timeout: 10000 }, async () => {
  const { ExpressAdapter } = apiRequire("@nestjs/platform-express");
  const adapter = new ExpressAdapter();
  adapter.useBodyParser("json", false, { limit: "1kb" });
  adapter.useBodyParser("urlencoded", false, { extended: true, limit: "1kb" });
  const app = adapter.getInstance();
  app.get("/fixture/:id", (request, response) => response.json({ id: request.params.id, query: request.query }));
  app.post("/fixture", (request, response) => response.json(request.body));
  app.use((error, _request, response, _next) => response.status(error.status || 500).json({ type: error.type }));
  const server = http.createServer(app);
  try {
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const base = `http://127.0.0.1:${server.address().port}`;
    const send = (resource, options) => fetch(base + resource, { ...options, signal: AbortSignal.timeout(3000) });
    const get = await send("/fixture/driver-123?filter[status]=active&tags[]=one&tags[]=two");
    assert.equal(get.status, 200);
    assert.deepEqual(await get.json(), { id: "driver-123", query: { filter: { status: "active" }, tags: ["one", "two"] } });
    const json = await send("/fixture", { method: "POST", headers: { "Content-Type": "application/json" }, body: '{"accepted":true}' });
    assert.equal(json.status, 200);
    assert.deepEqual(await json.json(), { accepted: true });
    const form = await send("/fixture", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "profile[name]=fixture&tags[]=one&tags[]=two" });
    assert.equal(form.status, 200);
    assert.deepEqual(await form.json(), { profile: { name: "fixture" }, tags: ["one", "two"] });
    const invalid = await send("/fixture", { method: "POST", headers: { "Content-Type": "application/json" }, body: "invalid-json" });
    assert.equal(invalid.status, 400);
    await invalid.arrayBuffer();
    const oversized = await send("/fixture", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value: "x".repeat(2048) }) });
    assert.equal(oversized.status, 413);
    await oversized.arrayBuffer();
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test("the actual Workbox serializer escapes a closing script at the end of spoofed function source", () => {
  const { serialize } = loadWorkboxSerializer();
  function first() {}
  first.toString = () => "function first(){ return 1 }//</script";
  function second() {}
  second.toString = () => "function second(x){ return x } > <span data-fixture>";
  const output = serialize({ nested: { first }, second }, { space: 2 });
  assert.equal(/<\/script/i.test(output), false);
});

test("the actual Workbox serializer handles an array-like object without an unbounded index scan", { timeout: 5000 }, () => {
  const { entry } = loadWorkboxSerializer();
  // A child bounds the vulnerable library's CPU use; no application bootstrap or network is involved.
  const child = spawnSync(process.execPath, ["-e", `
    const serialize = require(process.argv[1]);
    const payload = Object.create(Array.prototype);
    payload.length = 4294967295;
    payload.marker = "local-only";
    process.stdout.write(serialize(payload));
  `, entry], { encoding: "utf8", timeout: 2000, maxBuffer: 4096 });
  assert.ifError(child.error);
  assert.equal(child.status, 0, child.stderr);
  assert.deepEqual(JSON.parse(child.stdout), { length: 4294967295, marker: "local-only" });
});

test("the actual Workbox serializer omits functions without mutating options", () => {
  const { serialize } = loadWorkboxSerializer();
  const callback = () => "fixture";
  const options = { keep: 1, callback, nested: { callback }, values: [callback, 2] };
  assert.deepEqual(JSON.parse(serialize(options, { ignoreFunction: true })), { keep: 1, nested: {}, values: [null, 2] });
  assert.equal(options.callback, callback);
  assert.equal(options.nested.callback, callback);
  assert.equal(options.values[0], callback);
});

test("the actual Player Vite server denies a fixture env file with raw query variants", { timeout: 15000 }, async () => {
  const playerRequire = createRequire(path.join(root, "apps/player/package.json"));
  const vitePackage = playerRequire.resolve("vite/package.json");
  const { createServer } = await import(pathToFileURL(path.join(path.dirname(vitePackage), "dist/node/index.js")).href);
  // Native canonicalization expands Windows 8.3 names, which Vite correctly rejects.
  const temporaryRoot = realpathSync.native(os.tmpdir());
  const fixture = await fs.mkdtemp(path.join(temporaryRoot, "tad-vite-deny-"));
  const marker = "TAD_SYNTHETIC_DENIED_FIXTURE";
  let server;
  try {
    await fs.writeFile(path.join(fixture, ".env"), marker);
    await fs.writeFile(path.join(fixture, "allowed.txt"), "TAD_PUBLIC_FIXTURE");
    server = await createServer({
      configFile: false, envFile: false, root: fixture, cacheDir: path.join(fixture, ".vite"), logLevel: "silent",
      optimizeDeps: { noDiscovery: true, include: [] },
      server: { host: "127.0.0.1", port: 0, strictPort: true, fs: { allow: [fixture], deny: ["**/.env"] } },
    });
    await server.listen();
    const base = `http://127.0.0.1:${server.httpServer.address().port}`;
    const normal = await fetch(base + "/allowed.txt", { signal: AbortSignal.timeout(3000) });
    assert.equal(normal.status, 200);
    assert.equal(await normal.text(), "TAD_PUBLIC_FIXTURE");
    const failures = [];
    for (const query of ["", "?raw", "?import&raw", "?import&url&inline"]) {
      const response = await fetch(base + "/.env" + query, { signal: AbortSignal.timeout(3000) });
      const body = await response.text();
      if (response.status !== 403 || body.includes(marker)) failures.push({ query, status: response.status, leakedMarker: body.includes(marker) });
    }
    assert.deepEqual(failures, [], "Denied fixture contents must remain blocked after query stripping");
  } finally {
    if (server) await server.close();
    assert.equal(path.dirname(fixture), temporaryRoot);
    assert.ok(path.basename(fixture).startsWith("tad-vite-deny-"));
    await fs.rm(fixture, { recursive: true, force: true });
  }
});
