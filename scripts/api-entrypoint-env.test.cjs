"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const entrypoint = fs
  .readFileSync(
    path.resolve(__dirname, "../apps/api/docker-entrypoint.sh"),
    "utf8",
  )
  .replace(/\r\n/g, "\n");
const windows = process.platform === "win32";
const shell = windows ? "C:\\Program Files\\Git\\bin\\bash.exe" : "/bin/sh";
const shellArgs = windows ? ["--noprofile", "--norc", "--posix", "-s"] : ["-s"];
const migrationMarker = "[test] migration boundary reached";
const fixtures = Object.freeze({
  JWT_SECRET: "tad-entrypoint-fixture-jwt-do-not-log",
  DATABASE_URL: "postgresql://fixture:fixture@database.invalid:5432/fixture",
  SUPABASE_URL: "https://entrypoint-fixture.supabase.invalid",
  DIRECT_URL: "postgresql://fixture:fixture@direct.invalid:5432/fixture",
  TAD_EXPECTED_SUPABASE_PROJECT_REF: "abcdefghijklmnopqrst",
});

// Only the migration boundary is substituted. The production entrypoint and its
// set -eu behavior execute unchanged in a real shell. No pnpm executable runs.
const migrationBoundary = `node() {
  if [ "$#" -ne 1 ]; then
    printf '%s\\n' '[test] unexpected Node argument count'
    return 92
  fi
  case "\${1-}" in
    "../../scripts/verify-supabase-runtime-target.cjs")
      if [ "\${TAD_TEST_PINNED_FAIL:-}" = "1" ]; then
        printf '%s\n' '[test] independent Supabase target rejected'
        return 23
      fi
      printf '%s\n' '[test] independent Supabase target verified'
      ;;
    "./scripts/check-supabase-target.cjs")
      if [ "\${TAD_TEST_PREFLIGHT_FAIL:-}" = "1" ]; then
        printf '%s\\n' '[test] Supabase target rejected'
        return 18
      fi
      printf '%s\\n' '[test] Supabase target verified'
      ;;
    "./scripts/check-prisma-drift.cjs")
      if [ "\${DATABASE_URL:-}" != "\${DIRECT_URL:-}" ]; then
        printf '%s\\n' '[test] parity used wrong URL'
        return 94
      fi
      if [ "\${TAD_TEST_DRIFT_FAIL:-}" = "1" ]; then
        printf '%s\\n' '[test] schema drift detected'
        return 31
      fi
      printf '%s\\n' '[test] schema parity verified'
      ;;
    *)
      printf '%s\\n' '[test] unexpected Node command'
      return 92
      ;;
  esac
}
pnpm() {
  if [ "$#" -ne 5 ] || [ "\${1-}" != "exec" ] || [ "\${2-}" != "prisma" ] || [ "\${3-}" != "migrate" ] || [ "\${4-}" != "deploy" ] || [ "\${5-}" != "--schema=./prisma/schema.prisma" ] || [ "\${DATABASE_URL:-}" != "\${DIRECT_URL:-}" ]; then
    printf '%s\\n' '[test] unexpected migration command or target'
    return 91
  fi
  printf '%s\\n' '${migrationMarker}'
  if [ "\${TAD_TEST_MIGRATION_SUCCEED:-}" = "1" ]; then
    return 0
  fi
  return 17
}
sleep() {
  if [ "$#" -ne 1 ] || [ "$1" != "90" ]; then
    echo '[test] unexpected cooldown'
    return 93
  fi
  echo '[test] restart cooldown requested'
}
`;

function runEntrypoint(environment = {}) {
  assert.ok(
    fs.existsSync(shell),
    `Required real POSIX shell is unavailable: ${shell}`,
  );
  const temporaryRoot = fs.realpathSync.native(os.tmpdir());
  const directory = fs.mkdtempSync(
    path.join(temporaryRoot, "tad-api-entrypoint-"),
  );
  try {
    // PATH contains only a fixture executable, never the host Node binary.
    // The real production script remains untouched; we can safely verify
    // that a healthy schema reaches the final exec without starting an API.
    const fakeNode = path.join(directory, "node");
    if (!windows) {
      fs.writeFileSync(
        fakeNode,
        '#!/bin/sh\nif [ "$#" -eq 2 ] && [ "$1" = "--expose-gc" ] && [ "$2" = "dist/main.js" ]; then echo "[test] API exec reached"; exit 0; fi\nexit 95\n',
        { mode: 0o700 },
      );
    }
    const env = {
      NODE_ENV: "test",
      PORT: "3000",
      PATH: windows ? "" : directory,
      ...environment,
    };
    if (windows)
      env.SYSTEMROOT = process.env.SYSTEMROOT || process.env.SystemRoot;
    const result = spawnSync(shell, shellArgs, {
      input: migrationBoundary + entrypoint,
      encoding: "utf8",
      env,
      cwd: directory,
      windowsHide: true,
      timeout: 4000,
      maxBuffer: 64 * 1024,
    });
    assert.equal(
      result.error,
      undefined,
      "The real-shell harness must complete without a launch error.",
    );
    assert.equal(
      result.signal,
      null,
      "The real-shell harness must exit without a signal or timeout.",
    );
    const output = result.stdout + result.stderr;
    for (const value of Object.values(fixtures)) {
      assert.equal(
        output.includes(value),
        false,
        "Startup diagnostics must not expose fixture values.",
      );
    }
    assert.match(
      output,
      /\[entrypoint\] === TAD API ENTRYPOINT ===/,
      "The production entrypoint must execute.",
    );
    return { status: result.status, output };
  } finally {
    assert.equal(path.dirname(directory), temporaryRoot);
    assert.ok(path.basename(directory).startsWith("tad-api-entrypoint-"));
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function assertNoNodeStart(output) {
  assert.doesNotMatch(output, /Starting node dist\/main\.js|Gateway Operativo/);
}

function assertSafeMissingDiagnostics(output, names) {
  assert.doesNotMatch(output, /parameter not set|unbound variable/i);
  for (const name of names) {
    assert.ok(
      output.includes(`[entrypoint] ${name}=MISSING`),
      `${name} must be reported as MISSING.`,
    );
  }
}

for (const [description, environment] of [
  ["unset", {}],
  ["empty", { JWT_SECRET: "" }],
]) {
  test("entrypoint fails closed when JWT_SECRET is " + description, () => {
    const { status, output } = runEntrypoint(environment);
    assert.equal(status, 1);
    assert.match(output, /FATAL: JWT_SECRET not configured/);
    assertSafeMissingDiagnostics(output, ["JWT_SECRET","DATABASE_URL","SUPABASE_URL","DIRECT_URL"]);
    assert.match(output, /90-second idle cooldown/);
    assert.match(output, /\[test\] restart cooldown requested/);
    assert.equal(output.includes(migrationMarker), false);
    assertNoNodeStart(output);
  });
}

for (const missing of ["DATABASE_URL", "SUPABASE_URL", "DIRECT_URL"]) {
  test("missing " + missing + " fails closed with cooldown before database checks", () => {
    const env = { ...fixtures };
    delete env[missing];
    const { status, output } = runEntrypoint(env);
    assert.equal(status, 1);
    assert.match(output, new RegExp("FATAL: " + missing + " is required"));
    assert.doesNotMatch(output, /\[test\] Supabase target verified|schema parity verified/);
    assert.match(output, /90-second idle cooldown/);
    assert.match(output, /\[test\] restart cooldown requested/);
    assert.equal(output.includes(migrationMarker), false);
    assertNoNodeStart(output);
  });
}

test("startup refuses missing independent project ref before any preflight DB checks", () => {
  const env = { ...fixtures };
  delete env.TAD_EXPECTED_SUPABASE_PROJECT_REF;
  const { status, output } = runEntrypoint(env);
  assert.equal(status, 1);
  assert.match(output, /TAD_EXPECTED_SUPABASE_PROJECT_REF is required/);
  assert.match(output, /90-second idle cooldown/);
  assert.doesNotMatch(output, /independent Supabase target verified|Supabase target verified|schema parity verified/);
  assertNoNodeStart(output);
});

test("independent project mismatch fails closed before URL-parity and schema checks", () => {
  const { status, output } = runEntrypoint({
    ...fixtures,
    TAD_TEST_PINNED_FAIL: "1",
  });
  assert.equal(status, 23);
  assert.match(output, /independent Supabase target rejected/);
  assert.match(output, /Independent Supabase target verification failed/);
  assert.doesNotMatch(output, /\[test\] Supabase target verified|schema parity verified/);
  assertNoNodeStart(output);
});

test("Supabase target mismatch blocks the API before any drift check or migration", () => {
  const { status, output } = runEntrypoint({ ...fixtures, TAD_TEST_PREFLIGHT_FAIL: "1" });
  assert.equal(status, 18);
  assert.match(output, /\[test\] Supabase target rejected/);
  assert.match(output, /\[test\] restart cooldown requested/);
  assert.equal(output.includes(migrationMarker), false);
  assert.doesNotMatch(output, /schema parity verified/);
  assertNoNodeStart(output);
});

test("Prisma drift still fails closed with original status but no migration", () => {
  const { status, output } = runEntrypoint({ ...fixtures, TAD_TEST_DRIFT_FAIL: "1" });
  assert.equal(status, 31);
  assert.match(output, /\[test\] schema drift detected/);
  assert.match(output, /90-second idle cooldown/);
  assert.match(output, /\[test\] restart cooldown requested/);
  assert.equal(output.includes(migrationMarker), false);
  assert.doesNotMatch(output, /Prisma schema parity verified; no migrations executed/);
  assertNoNodeStart(output);
});

test("clean schema starts API without migration or a restart cooldown", {
  skip: windows ? "No portable POSIX fake node on Windows Git Bash" : false,
}, () => {
  const { status, output } = runEntrypoint(fixtures);
  assert.equal(status, 0);
  assert.match(output, /\[test\] independent Supabase target verified/);
  assert.match(output, /\[test\] Supabase target verified/);
  assert.match(output, /\[test\] schema parity verified/);
  assert.match(output, /Prisma schema parity verified; no migrations executed/);
  assert.match(output, /\[test\] API exec reached/);
  assert.equal(output.includes(migrationMarker), false);
  assert.doesNotMatch(output, /restart cooldown requested/);
});

test("runtime startup contains no automatic Prisma migration or db push", () => {
  assert.doesNotMatch(entrypoint, /pnpm\s+exec\s+prisma\s+migrate|prisma\s+db\s+push|migrate\s+resolve|--accept-data-loss/);
  assert.match(entrypoint, /verify-supabase-runtime-target\.cjs/);
  assert.match(entrypoint, /check-prisma-drift\.cjs/);
});
