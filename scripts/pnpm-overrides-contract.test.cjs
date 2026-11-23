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
  assert.equal(Object.keys(workspace).length, 17);
  assert.deepEqual(workspace, locked);
  assert.equal(workspace.multer, "2.5.0");
  assert.equal(workspace["follow-redirects"], "1.16.2");
  assert.equal(workspace["external-editor>tmp"], "0.2.7");
  assert.equal(workspace["next@15.5.29>postcss"], "8.5.33");
  assert.equal(workspace["@modelcontextprotocol/sdk>@hono/node-server"], "2.1.6");
  assert.equal(workspace["@nestjs/common>file-type"], "21.3.4");
  assert.equal(workspace["@angular-devkit/core>ajv"], "8.20.0");
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

test("each installed Next 15.5.29 snapshot resolves patched PostCSS 8.5.33", () => {
  const lock = fs.readFileSync(path.join(root, "pnpm-lock.yaml"), "utf8")
    .replace(/\r\n?/g, "\n");
  const snapshots = lock.split("\nsnapshots:\n")[1];
  assert.ok(snapshots, "Frozen lock must include snapshot resolutions");
  const matches = [...snapshots.matchAll(/^  next@15\.5\.29[^\n]*:\n/gm)];
  assert.ok(matches.length >= 3, "Expected all Next runtime snapshots");
  for (const match of matches) {
    const tail = snapshots.slice(match.index + match[0].length);
    const nextPackage = tail.search(/^  \S/gm);
    const block = nextPackage === -1 ? tail : tail.slice(0, nextPackage);
    assert.match(block, /^      postcss: 8\.5\.33$/m, match[0].trim());
  }
  assert.doesNotMatch(lock, /^  postcss@8\.4\.31:/m);
  assert.doesNotMatch(lock, /^  next@15\.5\.28(?=[:(])/m);
});

test("admin focused workflow uses root packageManager pnpm without conflicting major pin", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const workflow = fs.readFileSync(
    path.join(root, ".github/workflows/admin-typescript-checks.yml"), "utf8",
  );
  assert.equal(pkg.packageManager, "pnpm@10.34.9");
  assert.match(workflow, /uses: pnpm\/action-setup@v4/);
  assert.doesNotMatch(workflow, /uses: pnpm\/action-setup@v4\s*\n\s+with:\s*\n\s+version:/);
  assert.match(workflow, /pnpm install --frozen-lockfile/);
});
