"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(root, "scripts/advertiser-motion-v6-local-qa.sh"), "utf8");
const match = source.match(
  /# BEGIN local-standalone-assets\n([\s\S]*?)# END local-standalone-assets/);
assert.ok(match, "QA script must keep a testable asset-copy block.");
const stageAssets = match[1];

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tad-standalone-assets-"));
  const app = path.join(root, "apps/advertiser");
  const target = path.join(app, ".next/standalone/apps/advertiser");
  fs.mkdirSync(path.join(app, ".next/static"), { recursive: true });
  fs.mkdirSync(path.join(app, "public"), { recursive: true });
  fs.mkdirSync(path.join(target, ".next/static"), { recursive: true });
  fs.mkdirSync(path.join(target, "public"), { recursive: true });
  fs.writeFileSync(path.join(app, ".next/static", "chunk.js"), "new-runtime");
  fs.writeFileSync(path.join(app, "public", "image.svg"), "<svg />");
  fs.writeFileSync(path.join(target, ".next/static", "existing.js"), "keep-me");
  const run = () => spawnSync("bash", ["-euo", "pipefail", "-c", stageAssets], {
    encoding: "utf8", env: { PATH: process.env.PATH, ROOT: root, TARGET: target },
  });
  const cleanup = () => fs.rmSync(root, { recursive: true, force: true });
  return { app, target, run, cleanup };
}

test("QA uses actual served file paths when standalone directories already exist", () => {
  const ctx = fixture();
  try {
    const first = ctx.run();
    assert.equal(first.status, 0, first.stderr);
    assert.equal(fs.readFileSync(path.join(ctx.target, ".next/static/chunk.js"), "utf8"), "new-runtime");
    assert.equal(fs.readFileSync(path.join(ctx.target, "public/image.svg"), "utf8"), "<svg />");
    assert.equal(fs.readFileSync(path.join(ctx.target, ".next/static/existing.js"), "utf8"), "keep-me");
    assert.equal(fs.lstatSync(path.join(ctx.target, ".next/static")).isDirectory(), true);
    assert.equal(fs.lstatSync(path.join(ctx.target, "public")).isDirectory(), true);
    const second = ctx.run();
    assert.equal(second.status, 0, second.stderr);
  } finally { ctx.cleanup(); }
});

test("QA fails closed when compiled static assets are missing", () => {
  const ctx = fixture();
  try {
    fs.rmSync(path.join(ctx.app, ".next/static"), { recursive: true });
    const result = ctx.run();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Missing Next build static assets/);
  } finally { ctx.cleanup(); }
});
