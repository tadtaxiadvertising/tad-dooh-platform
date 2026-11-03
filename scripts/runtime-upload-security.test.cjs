"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { Readable } = require("node:stream");
const { createRequire } = require("node:module");

const root = path.resolve(__dirname, "..");
const lock = fs.readFileSync(path.join(root, "pnpm-lock.yaml"), "utf8");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const apiPkg = JSON.parse(fs.readFileSync(path.join(root, "apps/api/package.json"), "utf8"));
const apiRequire = createRequire(path.join(root, "apps/api/package.json"));

test("NestJS/Express upload dependencies no longer resolve vulnerable Multer versions", () => {
  assert.equal(pkg.pnpm.overrides.multer, "2.5.0");
  assert.equal(apiPkg.dependencies.multer, "^2.5.0");
  assert.match(lock, /\n  multer@2\.5\.0:\n/);
  assert.doesNotMatch(lock, /\n  multer@(?:1\.|2\.[0-4]\.)/);
  assert.match(lock, /multer: 2\.5\.0/);
});

test("redirect dependency is patched across workspace snapshots", () => {
  assert.equal(pkg.pnpm.overrides["follow-redirects"], "1.16.2");
  assert.match(lock, /\n  follow-redirects@1\.16\.2:\n/);
  assert.doesNotMatch(lock, /\n  follow-redirects@1\.16\.[01]:\n/);
});

test("patched Multer rejects an oversized multipart file without any network request", { timeout: 5000 }, async () => {
  const multer = apiRequire("multer");
  const boundary = "TadUnitBoundary";
  const body = Buffer.from(
    "--" + boundary + "\r\n" +
      'Content-Disposition: form-data; name="media"; filename="example.txt"\r\n' +
      "Content-Type: text/plain\r\n\r\n" +
      "A".repeat(96) + "\r\n--" + boundary + "--\r\n",
  );
  const req = Readable.from([body]);
  req.method = "POST";
  req.headers = {
    "content-type": "multipart/form-data; boundary=" + boundary,
    "content-length": String(body.length),
  };
  const error = await new Promise((resolve, reject) => {
    multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 } })
      .single("media")(req, {}, (err) => resolve(err || null));
    req.on("error", reject);
  });
  assert.ok(error, "oversized upload must be rejected");
  assert.equal(error.code, "LIMIT_FILE_SIZE");
});

test("branch does not retain the temporary write-enabled workflow", () => {
  assert.equal(fs.existsSync(path.join(root, ".github/workflows/prepare-runtime-security-lock.yml")), false);
});
