"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { readOverrides } = require("./pnpm-overrides-config.cjs");

const root = path.resolve(__dirname, "..");

test("the workspace and frozen lockfile pin exactly the same dependency overrides", () => {
  const workspace = readOverrides();
  const locked = readOverrides("pnpm-lock.yaml");
  assert.equal(Object.keys(workspace).length, 14);
  assert.deepEqual(workspace, locked);
  assert.equal(workspace.multer, "2.5.0");
  assert.equal(workspace["follow-redirects"], "1.16.2");
  assert.equal(workspace["external-editor>tmp"], "0.2.7");
  assert.equal(workspace["next@15.5.29>postcss"], "8.5.33");
  assert.equal(Object.hasOwn(workspace, "next@15.5.28>postcss"), false);
});

test("security overrides are no longer hidden in package.json", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  assert.equal(pkg.pnpm, undefined);
});

test("advertiser Docker build uses a fixed pnpm v10 and a frozen lockfile", () => {
  const docker = fs.readFileSync(path.join(root, "Dockerfile.advertiser"), "utf8");
  assert.match(docker, /^RUN npm install -g pnpm@10\.34\.9$/m);
  assert.match(docker, /^RUN pnpm install --frozen-lockfile$/m);
  assert.doesNotMatch(docker, /^RUN pnpm install --no-frozen-lockfile$/m);
});
