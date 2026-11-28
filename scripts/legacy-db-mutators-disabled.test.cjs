"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const retired = [
  "apps/api/scripts/apply-v12-schema.cjs",
  "apps/api/scripts/dba_remediation.cjs",
  "apps/api/scripts/clean-db.ts",
  "apps/api/create-playlist-items-table.js",
  "apps/api/fix-rls.js",
  "apps/api/fix-rls.ts",
  "apps/api/migrate-playlist-items.js",
  "apps/api/migrate-targets.js",
  "apps/api/scratch/apply_activation_trigger.js",
  "run-sql.js",
  "apply-migration.js",
];

for (const name of retired) {
  const fullPath = path.join(root, name);

  test(`retired mutator cannot contain a database execution path: ${name}`, () => {
    const code = fs.readFileSync(fullPath, "utf8");
    assert.match(code, /\[migration\] REFUSED/);
    assert.match(code, /process\.exitCode\s*=\s*1/);
    assert.doesNotMatch(code, /require\s*\(\s*["'](?:pg|@prisma\/client|dotenv)["']\s*\)/);
    assert.doesNotMatch(code, /new\s+PrismaClient\s*\(/);
    assert.doesNotMatch(code, /\.(?:query|\$executeRawUnsafe|\$executeRaw|\$transaction|deleteMany|updateMany)\s*\(/);
    assert.doesNotMatch(code, /process\.env\.(?:DATABASE_URL|DIRECT_URL|DB_PASSWORD)/);
    assert.doesNotMatch(code, /rejectUnauthorized\s*:\s*false/);
  });

  {
    // Node 22 can also execute this deliberately JavaScript-compatible .ts stub.
    test(`retired mutator exits nonzero without exposing credentials: ${name}`, () => {
      const env = {
        NODE_ENV: "production",
        PATH: "",
        DATABASE_URL: "postgresql://user:synthetic-secret@127.0.0.1:1/postgres",
        DIRECT_URL: "postgresql://user:synthetic-secret@127.0.0.1:2/postgres",
      };
      if (process.platform === "win32") {
        env.SYSTEMROOT = process.env.SYSTEMROOT || process.env.SystemRoot || "";
      }
      const result = spawnSync(process.execPath, [fullPath], {
        cwd: root,
        env,
        encoding: "utf8",
        windowsHide: true,
        timeout: 4000,
      });
      assert.equal(result.error, undefined);
      assert.equal(result.signal, null);
      assert.equal(result.status, 1);
      assert.equal(result.stdout, "");
      assert.match(result.stderr, /\[migration\] REFUSED/);
      assert.doesNotMatch(result.stderr, /synthetic-secret|postgresql:\/\//);
    });
  }
}
