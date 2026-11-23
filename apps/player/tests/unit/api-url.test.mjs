import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolvePlayerApiUrl } from "../../src/api-url.ts";

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const read = file => fs.readFileSync(path.join(repository, file), "utf8");
const productionBase = "https://tad.api.ibusiness.com.do/api/v1";

test("production Player builds authenticated API endpoint URLs under /api/v1", () => {
  const base = resolvePlayerApiUrl(productionBase, false);
  assert.equal(`${base}/device/sync`, `${productionBase}/device/sync`);
  assert.equal(`${base}/telemetry/playback-batch`, `${productionBase}/telemetry/playback-batch`);
  assert.equal(`${base}/sync/TAD-1`, `${productionBase}/sync/TAD-1`);
  assert.equal(resolvePlayerApiUrl(`${productionBase}/`, false), productionBase);
});

test("missing VITE_API_URL does not silently fall back to a retired host", () => {
  for (const input of [undefined, null, "", "  ", 42]) {
    assert.throws(() => resolvePlayerApiUrl(input, false), /PLAYER_API_URL_REQUIRED/);
  }
});

test("rejects mismatched path, including the historical /api prefix", () => {
  for (const input of [
    "https://tad.api.ibusiness.com.do/api",
    "https://tad.api.ibusiness.com.do",
    "https://tad.api.ibusiness.com.do/api/v2",
    "https://tad.api.ibusiness.com.do/api/v1/../v2",
  ]) {
    assert.throws(() => resolvePlayerApiUrl(input, false), /PLAYER_API_URL_PATH_INVALID/);
  }
});

test("rejects unsafe production schemes, even if the URL has the right path", () => {
  for (const input of [
    "http://tad.api.ibusiness.com.do/api/v1",
    "ws://localhost:3000/api/v1",
    "file:///api/v1",
  ]) {
    assert.throws(() => resolvePlayerApiUrl(input, false), /PLAYER_API_URL_INSECURE/);
  }
});

test("allows HTTP only for explicit local development", () => {
  for (const input of [
    "http://localhost:3000/api/v1",
    "http://127.0.0.1:3000/api/v1",
    "http://[::1]:3000/api/v1",
  ]) {
    assert.equal(resolvePlayerApiUrl(input, true), input);
    assert.throws(() => resolvePlayerApiUrl(input, false), /PLAYER_API_URL_INSECURE/);
  }
  assert.throws(
    () => resolvePlayerApiUrl("http://external.test/api/v1", true),
    /PLAYER_API_URL_INSECURE/,
  );
});

test("rejects secret-bearing credentials, query parameters, and hash fragments", () => {
  for (const input of [
    "https://user:password@tad.api.ibusiness.com.do/api/v1",
    "https://tad.api.ibusiness.com.do/api/v1?token=secret",
    "https://tad.api.ibusiness.com.do/api/v1#fragment",
  ]) {
    assert.throws(() => resolvePlayerApiUrl(input, false), /PLAYER_API_URL_PATH_INVALID/);
  }
});

test("deployment source defaults and Player config agree on Nest global prefix", () => {
  const main = read("apps/api/src/main.ts");
  assert.match(main, /setGlobalPrefix\("api\/v1"/);
  for (const file of ["Dockerfile.player", "apps/player/.env.example", "easypanel-env-template.md"]) {
    assert.ok(read(file).includes(`VITE_API_URL=${productionBase}`), file);
  }
  const config = read("apps/player/src/config.ts");
  assert.match(config, /resolvePlayerApiUrl\(\s*import\.meta\.env\.VITE_API_URL/);
  assert.doesNotMatch(config, /api\.tad\.dooh\.cloud/);
});
