"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

// Never display file contents, connection strings, or secret bytes when the
// guard trips. Report only paths to investigators with repository access.
function isForbiddenTrackedPath(file) {
  const normalized = file.replace(/\\/g, "/").replace(/^\.\//, "");
  const base = path.posix.basename(normalized);
  if (
    normalized === "apps/api/prisma-cloud-test.js" ||
    normalized === "apps/api/test_db.py"
  ) return true;
  if (/^\.env(?:\.|$)/i.test(base) && !/\.example$/i.test(base)) return true;
  if (/^(?:id_rsa|id_ed25519)$/i.test(base)) return true;
  if (/\.(?:p8|p12|pfx|pem)$/i.test(base)) return true;
  return false;
}

function isExecutableNonTestSource(file) {
  if (!/\.(?:js|cjs|mjs|py|ts|tsx)$/i.test(file)) return false;
  if (/(?:^|\/)(?:test|tests|__tests__|fixtures|examples)(?:\/|$)/i.test(file)) return false;
  if (/\.(?:test|spec)\.[cm]?[jt]sx?$/i.test(file)) return false;
  // This gate scans executable source only, not documents, markdown or the
  // deliberately synthetic connection strings in test fixtures.
  return true;
}

function containsEmbeddedPostgresPassword(content) {
  return /postgres(?:ql)?:\/\/[^:\s\/'"`]+:[^@\s\/'"`]+@[^\s\/'"`]+/i.test(content);
}

function trackedPaths() {
  const output = execFileSync("git", ["ls-files", "-z"], {
    cwd: root, encoding: "utf8", maxBuffer: 8 * 1024 * 1024,
  });
  return output.split("\0").filter(Boolean);
}

test("sensitive tracked paths are blocked but safe examples are allowed", () => {
  for (const name of [
    "apps/api/prisma-cloud-test.js", "apps/api/test_db.py",
    "apps/api/.env", "apps/driver/.env.local", "config/.env.production",
    "private/id_ed25519", "keys/prod.pem", "certificate.p12",
  ]) assert.equal(isForbiddenTrackedPath(name), true, name);
  for (const name of [
    "apps/api/.env.example", ".env.example", "src/service.ts",
    "scripts/audit.test.cjs", ".npmrc",
  ]) assert.equal(isForbiddenTrackedPath(name), false, name);
});

test("tracked repository no longer contains credential-bearing legacy files or private key material", () => {
  const blocked = trackedPaths().filter(isForbiddenTrackedPath);
  assert.deepEqual(blocked, [], `Forbidden tracked file paths: ${blocked.join(", ")}`);
});

test("runtime source does not embed a literal PostgreSQL URL password", () => {
  const suspicious = [];
  for (const file of trackedPaths().filter(isExecutableNonTestSource)) {
    const value = readFileSync(path.join(root, file), "utf8");
    if (containsEmbeddedPostgresPassword(value)) suspicious.push(file);
  }
  assert.deepEqual(
    suspicious, [],
    `Possible hardcoded database URLs in source paths: ${suspicious.join(", ")}. Never print secret contents.`,
  );
});

test("password detector catches synthetic URLs without echoing secret values", () => {
  const synthetic = ["postgresql://user:fixturevalue@db.example.test:5432/db", "postgres://user:fixturevalue@127.0.0.1:5432/db"];
  for (const sample of synthetic) assert.equal(containsEmbeddedPostgresPassword(sample), true);
  assert.equal(containsEmbeddedPostgresPassword("process.env.DATABASE_URL"), false);
  assert.equal(containsEmbeddedPostgresPassword("postgresql://user@localhost/db"), false);
});

module.exports = {
  isForbiddenTrackedPath,
  isExecutableNonTestSource,
  containsEmbeddedPostgresPassword,
};

test("weekly security audit never passes credentials via psql URL or curl header argv", () => {
  const src = readFileSync(path.join(root, ".github/workflows/security-audit-weekly.yml"), "utf8");
  assert.doesNotMatch(src, /postgres:\$DB_PASSWORD@/);
  assert.doesNotMatch(src, /(?:-H|--header)\s+["']Authorization: Bearer \$SUPABASE_ACCESS_TOKEN/);
  assert.match(src, /export PGPASSWORD="\$DB_PASSWORD"/);
  assert.match(src, /curl -fsS --config -/);
  assert.match(src, /PGHOST="db\.\$SUPABASE_PROJECT_REF\.supabase\.co"/);
});

test("weekly public audit artifacts contain counts only, never raw queries or lints", () => {
  const src = readFileSync(path.join(root, ".github/workflows/security-audit-weekly.yml"), "utf8");
  assert.match(src, /advisories-summary\.json/);
  assert.doesNotMatch(src, /path: advisories\.json/);
  assert.doesNotMatch(src, /SELECT pid,[^\n]*query|AS duration, query/);
  assert.doesNotMatch(src, /Storage usage: \$STORAGE_TOTAL/);
  assert.equal(src.includes(String.raw`\(.detail)`), false);
  assert.match(src, /active_queries_over_30_seconds/);
});

test("weekly Supabase audit shell block parses with its heredoc after YAML indentation", {
  skip: process.platform === "win32",
}, () => {
  const src = readFileSync(path.join(root, ".github/workflows/security-audit-weekly.yml"), "utf8");
  const match = src.match(/      - name: Run Security Audit\n        id: audit\n        run: \|\n([\s\S]*?)(?=\n      - name: |$)/);
  assert.ok(match, "Expected audit script block");
  const shellSource = match[1].split("\n").map(line =>
    line.startsWith("          ") ? line.slice(10) : line,
  ).join("\n");
  const parsed = spawnSync("bash", ["-n"], {
    input: shellSource, encoding: "utf8", timeout: 4000,
  });
  assert.equal(parsed.status, 0, "Bash syntax check refused (no secret values printed)");
});

test("weekly audit severity filters include only unknown errors and warnings", {
  skip: process.platform === "win32",
}, () => {
  const src = readFileSync(path.join(root, ".github/workflows/security-audit-weekly.yml"), "utf8");
  const lines = src.split(/\r?\n/);
  function filterFor(variable) {
    const line = lines.findIndex(value => value.includes(variable + '=$(echo "$ADVISORIES" | jq --argjson known '));
    assert.ok(line >= 0, "Expected " + variable + " filter");
    const expression = lines[line + 1].trim();
    assert.ok(expression.startsWith("'[") && expression.endsWith("]')"), "Expected literal jq array filter");
    return expression.slice(1, -2);
  }
  const items = [
    { level: "INFO", name: "informational" },
    { level: "WARN", name: "known_warning" },
    { level: "WARN", name: "new_warning" },
    { level: "ERROR", name: "rls_disabled_in_public", metadata: { schema: "public", name: "spatial_ref_sys" } },
    { level: "ERROR", name: "rls_disabled_in_public", metadata: { schema: "public", name: "new_unprotected_table" } },
    { level: "ERROR", name: "rls_disabled_in_public", metadata: { schema: "private", name: "spatial_ref_sys" } },
    { level: "ERROR", name: "rls_disabled_in_public" },
    { level: "ERROR", name: "new_security_error" },
  ];
  function apply(expr, known) {
    const run = spawnSync("jq", ["--argjson", "known", JSON.stringify(known), expr], {
      input: JSON.stringify(items), encoding: "utf8", timeout: 4000,
    });
    assert.equal(run.status, 0, "jq severity filter failed");
    return JSON.parse(run.stdout).map(item => item.metadata?.name || item.name);
  }
  assert.deepEqual(
    apply(filterFor("NEW_ERRORS"), { name: "rls_disabled_in_public", schema: "public", table: "spatial_ref_sys" }),
    ["new_unprotected_table", "spatial_ref_sys", "rls_disabled_in_public", "new_security_error"],
    "RLS missing on any new public table must never be suppressed by lint name",
  );
  assert.deepEqual(apply(filterFor("NEW_WARNS"), ["known_warning"]), ["new_warning"]);
});

test("weekly audit exits nonzero for each independent dangerous condition", {
  skip: process.platform === "win32",
}, () => {
  const src = readFileSync(path.join(root, ".github/workflows/security-audit-weekly.yml"), "utf8");
  const match = src.match(/          if \[ "\$NEW_ERROR_COUNT" -gt 0 \] \|\|[\s\S]*?\n          fi/);
  assert.ok(match, "Expected the real counter-based fail-closed decision");
  const shellCode = match[0].split("\n").map(line => line.replace(/^ {10}/, "")).join("\n");
  const cases = [
    [{}, 0],
    [{ NEW_ERROR_COUNT: "1" }, 1],
    [{ GRANT_COUNT: "1" }, 1],
    [{ MUTABLE_FUNCS: "1" }, 1],
    [{ DB_SIZE_MB: "451" }, 1],
  ];
  for (const [changes, expected] of cases) {
    const run = spawnSync("bash", ["-c", shellCode], {
      env: {
        PATH: process.env.PATH || "",
        NEW_ERROR_COUNT: "0",
        GRANT_COUNT: "0",
        MUTABLE_FUNCS: "0",
        DB_SIZE_MB: "0",
        ...changes,
      },
      encoding: "utf8", timeout: 4000,
    });
    assert.equal(run.status, expected, "Unexpected safety verdict");
  }
  assert.doesNotMatch(shellCode, /\$\{(?:new_errors|new_grants|mutable_funcs|db_critical):-false\}/);
});
