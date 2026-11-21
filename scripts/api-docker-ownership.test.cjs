"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dockerfile = fs.readFileSync(path.join(root, "Dockerfile.api"), "utf8");
const kycService = fs.readFileSync(
  path.join(root, "apps/api/src/modules/kyc/kyc.service.ts"),
  "utf8",
);

test("API image retains non-root identity and startup permissions", () => {
  assert.match(dockerfile, /addgroup --system --gid 1001 nodejs/);
  assert.match(dockerfile, /adduser --system --uid 1001 --ingroup nodejs --home \/app nestjs/);
  assert.match(dockerfile, /chmod \+x \/app\/apps\/api\/docker-entrypoint\.sh/);
  assert.match(dockerfile, /^USER nestjs$/m);
  assert.match(dockerfile, /^WORKDIR \/app\/apps\/api$/m);
});

test("image build does not recursively chown the pnpm dependencies tree", () => {
  const runSteps = dockerfile
    .split("\n")
    .filter((line) => !/^\s*#/.test(line))
    .join("\n");
  assert.doesNotMatch(runSteps, /\bchown\s+(?:-[a-zA-Z]*R[a-zA-Z]*|--recursive)\b/);
  assert.match(runSteps, /chown nestjs:nodejs \/app \/app\/apps\/api\/kyc-files/);
  assert.doesNotMatch(runSteps, /\bchmod\s+(?:-R\s+)?777\b/);
  assert.match(dockerfile, /pnpm --filter api run build/);
  assert.match(dockerfile, /prisma generate --schema=\.\/apps\/api\/prisma\/schema\.prisma/);
});

test("KYC runtime directory exists and belongs to non-root API user", () => {
  assert.match(kycService, /KYC_FILES_DIR\s*=\s*"\.\/kyc-files"/);
  assert.match(dockerfile, /mkdir -p \/app\/apps\/api\/kyc-files/);
  assert.match(dockerfile, /chown nestjs:nodejs \/app \/app\/apps\/api\/kyc-files/);
});
