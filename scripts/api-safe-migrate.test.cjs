"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const windows = process.platform === "win32";
// Match the real-shell harness used by api-entrypoint-env.test.cjs.
// A POSIX shell is required, but /bin/sh is not a native Windows path.
const shell = windows ? "C:\\Program Files\\Git\\bin\\bash.exe" : "/bin/sh";
const shellArgs = windows ? ["--noprofile", "--norc", "--posix", "-s"] : ["-s"];

const root = path.resolve(__dirname, "..");
const script = fs.readFileSync(
  path.join(root, "apps/api/scripts/migrate-safe.sh"), "utf8",
);
const pkg = JSON.parse(fs.readFileSync(
  path.join(root, "apps/api/package.json"), "utf8",
));
const fixtures = Object.freeze({
  DATABASE_URL: "postgresql://runtime:fixture-only@runtime.invalid:6543/fixture",
  SUPABASE_URL: "https://fixture-project.supabase.invalid",
  DIRECT_URL: "postgresql://direct:fixture-only@direct.invalid:5432/fixture",
});
const migrateMarker = "[fixture] migration invoked";

// The real migrate-safe.sh executes with a real POSIX shell. Node/pnpm
// are fixture-only function overrides: NO network or production connection.
const boundary = `node() {
  if [ "$#" -ne 1 ]; then
    echo "[fixture] unexpected Node args" >&2
    return 91
  fi
  case "\${1-}" in
    "./scripts/check-supabase-target.cjs")
      if [ "\${TAD_TEST_PREFLIGHT_FAIL:-}" = "1" ]; then
        echo "[fixture] target mismatch" >&2
        return 19
      fi
      echo "[fixture] target checked"
      ;;
    "./scripts/check-prisma-drift.cjs")
      if [ "\${DATABASE_URL:-}" != "\${DIRECT_URL:-}" ]; then
        echo "[fixture] drift check used wrong database" >&2
        return 93
      fi
      if [ "\${TAD_TEST_DRIFT_FAIL:-}" = "1" ]; then
        echo "[fixture] schema drift detected" >&2
        return 31
      fi
      echo "[fixture] schema verified"
      ;;
    *)
      echo "[fixture] unexpected Node command" >&2
      return 91
      ;;
  esac
}
pnpm() {
  if [ "$#" -ne 5 ] || [ "\${1-}" != "exec" ] ||
     [ "\${2-}" != "prisma" ] || [ "\${3-}" != "migrate" ] ||
     [ "\${4-}" != "deploy" ] ||
     [ "\${5-}" != "--schema=./prisma/schema.prisma" ] ||
     [ "\${DATABASE_URL:-}" != "\${DIRECT_URL:-}" ]; then
    echo "[fixture] invalid migration contract" >&2
    return 92
  fi
  echo "[fixture] migration invoked"
  return "\${TAD_TEST_MIGRATE_STATUS:-23}"
}
`;

function execute(environment) {
  assert.ok(
    fs.existsSync(shell),
    `Required real POSIX shell is unavailable: ${shell}`,
  );
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tad-safe-migrate-"));
  try {
    const env = { PATH: "", TAD_APPROVE_MANUAL_MIGRATION: "YES", ...environment };
    if (windows) {
      // Match the working Windows Git Bash entrypoint test harness.
      env.SYSTEMROOT = process.env.SYSTEMROOT || process.env.SystemRoot;
    }
    const result = spawnSync(shell, shellArgs, {
      input: boundary + script,
      encoding: "utf8",
      cwd: dir,
      env,
      timeout: 4000,
      windowsHide: true,
    });
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    const output = result.stdout + result.stderr;
    for (const secretFixture of Object.values(fixtures)) {
      assert.equal(output.includes(secretFixture), false, "Never expose connection values");
    }
    return { status: result.status, output };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("manual npm migration scripts never run db push", () => {
  assert.equal(pkg.scripts["deploy:migrate"], "sh ./scripts/migrate-safe.sh");
  assert.equal(pkg.scripts["start:migrate"], "sh ./scripts/migrate-safe.sh && node dist/main.js");
  assert.doesNotMatch(pkg.scripts["start:migrate"], /db push|accept-data-loss/);
  assert.doesNotMatch(pkg.scripts["deploy:migrate"], /db push|accept-data-loss/);
});

for (const missing of Object.keys(fixtures)) {
  test(`migration refuses missing ${missing} before running any tool`, () => {
    const env = Object.fromEntries(Object.entries(fixtures).filter(([key]) => key !== missing));
    const result = execute(env);
    assert.equal(result.status, 1);
    assert.match(result.output, new RegExp(`REFUSED: ${missing} is required`));
    assert.doesNotMatch(result.output, /\[fixture\] target checked|migration invoked/);
  });
}

test("manual migration requires explicit YES even with complete database configuration", () => {
  const result = execute({ ...fixtures, TAD_APPROVE_MANUAL_MIGRATION: "NO" });
  assert.equal(result.status, 1);
  assert.match(result.output, /explicit TAD_APPROVE_MANUAL_MIGRATION=YES required/);
  assert.doesNotMatch(result.output, /target checked|migration invoked/);
});

test("an unverified Supabase target blocks migration", () => {
  const result = execute({ ...fixtures, TAD_TEST_PREFLIGHT_FAIL: "1" });
  assert.equal(result.status, 19);
  assert.match(result.output, /target mismatch/);
  assert.doesNotMatch(result.output, /migration invoked/);
});

test("only direct DB URL reaches versioned migrate deploy, and failure propagates", () => {
  const result = execute(fixtures);
  assert.equal(result.status, 23);
  assert.match(result.output, /\[fixture\] target checked/);
  assert.ok(result.output.includes(migrateMarker));
  assert.doesNotMatch(result.output, /db push|accept-data-loss/);
  assert.doesNotMatch(result.output, /schema verified|schema drift detected/);
});

test("successful migration is not declared complete until schema parity passes", () => {
  const result = execute({ ...fixtures, TAD_TEST_MIGRATE_STATUS: "0" });
  assert.equal(result.status, 0);
  assert.match(result.output, /migration invoked/);
  assert.match(result.output, /schema verified/);
});

test("post-migration missing schema fails closed instead of returning success", () => {
  const result = execute({
    ...fixtures,
    TAD_TEST_MIGRATE_STATUS: "0",
    TAD_TEST_DRIFT_FAIL: "1",
  });
  assert.equal(result.status, 31);
  assert.match(result.output, /schema drift detected/);
  assert.match(result.output, /migration invoked/);
});
