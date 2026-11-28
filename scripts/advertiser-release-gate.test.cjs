"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("post-deploy verification checks advertiser DNS, HTTPS, and actual V6 HTML", () => {
  const script = read("verify-deployment.sh");
  assert.match(script, /check_domain "Advertiser" "\$ADVERTISER_URL"/);
  assert.match(script, /check_https "Advertiser" "\$ADVERTISER_URL"/);
  assert.match(script, /node "\$ROOT_DIR\/scripts\/advertiser-release-drift\.cjs"/);
  assert.match(script, /2\) fail "Advertiser entrega HTML anterior o no reconocido"/);
  assert.match(script, /\*\) fail "No se pudo verificar la versión pública del anunciante"/);
  assert.match(script, /ADVERTISER_URL="https:\/\/tad\.anunciante\.ibusiness\.com\.do"/);
});

test("release verification is read-only and avoids fragile global cache or service restarts", () => {
  const script = read("verify-deployment.sh");
  assert.doesNotMatch(script, /docker (restart|rm|stop)|kubectl|railway (redeploy|rollback)|prisma migrate deploy/i);
  assert.doesNotMatch(script, /curl [^\n]*(?:-X POST|--request POST)/);
  assert.match(script, /No reinicies API\/Player/);
  const probe = read("scripts/advertiser-release-drift.cjs");
  assert.match(probe, /redirect: "manual"/);
  assert.match(probe, /cache: "no-store"/);
  assert.doesNotMatch(probe, /process\.env\.[A-Z_]*SECRET|headers\??\.get\(["']set-cookie["']\)/i);
});
