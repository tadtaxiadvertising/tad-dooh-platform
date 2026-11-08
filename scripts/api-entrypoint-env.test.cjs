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
});

// Only the migration boundary is substituted. The production entrypoint and its
// set -eu behavior execute unchanged in a real shell. No pnpm executable runs.
const migrationBoundary = `pnpm() {
  if [ "$#" -ne 5 ] || [ "\${1-}" != "exec" ] || [ "\${2-}" != "prisma" ] || [ "\${3-}" != "migrate" ] || [ "\${4-}" != "deploy" ] || [ "\${5-}" != "--schema=./prisma/schema.prisma" ]; then
    printf '%s\\n' '[test] unexpected migration command'
    return 91
  fi
  printf '%s\\n' '${migrationMarker}'
  return 17
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
    // Construct from scratch: parent credentials, BASH_ENV and PATH are never
    // inherited. Empty PATH and cwd prevent a real Node/API binary from running
    // if migration failure propagation regresses.
    const env = { NODE_ENV: "test", PORT: "3000", PATH: "", ...environment };
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
  test(`the real API entrypoint fails closed with a clear JWT diagnostic when JWT_SECRET is ${description}`, () => {
    const { status, output } = runEntrypoint(environment);
    assert.equal(status, 1);
    assert.match(output, /FATAL: JWT_SECRET not configured/);
    assertSafeMissingDiagnostics(output, [
      "JWT_SECRET",
      "DATABASE_URL",
      "SUPABASE_URL",
      "DIRECT_URL",
    ]);
    assert.doesNotMatch(output, /Applying Prisma migrations/);
    assert.equal(output.includes(migrationMarker), false);
    assertNoNodeStart(output);
  });
}

test("the real API entrypoint reports missing DIRECT_URL safely after JWT validation", () => {
  const { status, output } = runEntrypoint({ JWT_SECRET: fixtures.JWT_SECRET });
  assert.equal(status, 1);
  assert.match(output, /\[entrypoint\] JWT_SECRET=SET/);
  assert.match(output, /FATAL: DIRECT_URL is required/);
  assertSafeMissingDiagnostics(output, [
    "DATABASE_URL",
    "SUPABASE_URL",
    "DIRECT_URL",
  ]);
  assert.equal(output.includes(migrationMarker), false);
  assertNoNodeStart(output);
});

test("the real API entrypoint propagates migration failure without starting Node or logging values", () => {
  const { status, output } = runEntrypoint(fixtures);
  assert.equal(status, 17);
  for (const name of Object.keys(fixtures)) {
    assert.ok(
      output.includes(`[entrypoint] ${name}=SET`),
      `${name} must be reported as SET.`,
    );
  }
  assert.equal(output.includes(migrationMarker), true);
  assert.doesNotMatch(output, /Prisma migrations applied/);
  assert.doesNotMatch(output, /parameter not set|unbound variable/i);
  assertNoNodeStart(output);
});
