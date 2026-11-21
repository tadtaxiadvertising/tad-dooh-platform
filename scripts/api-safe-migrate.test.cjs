"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { inspectLocalMigration } = require("../apps/api/scripts/assert-local-prisma-migration.cjs");

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
  TAD_EXPECTED_SUPABASE_PROJECT_REF: "aaaaaaaaaaaaaaaaaaaa",
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
    "../../scripts/verify-supabase-runtime-target.cjs")
      if [ "\${TAD_TEST_PINNED_FAIL:-}" = "1" ]; then
        echo "[fixture] independently pinned target mismatch" >&2
        return 17
      fi
      echo "[fixture] pinned project checked"
      ;;
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
      if [ "\${TAD_TEST_DRIFT_QUERY_ERROR:-}" = "1" ]; then
        echo "[fixture] catalog inspection unavailable" >&2
        return 2
      fi
      if [ "\${TAD_TEST_DRIFT_FAIL:-}" = "1" ] || { [ "\${TAD_TEST_DRIFT_POST_FAIL:-}" = "1" ] && [ "\${TAD_TEST_MIGRATION_INVOKED:-}" = "1" ]; }; then
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
  TAD_TEST_MIGRATION_INVOKED=1
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

test("independently pinned target mismatch refuses before invoking Prisma", () => {
  const result = execute({ ...fixtures, TAD_TEST_PINNED_FAIL: "1" });
  assert.equal(result.status, 17);
  assert.match(result.output, /independently pinned target mismatch/);
  assert.doesNotMatch(result.output, /migration invoked|target checked|schema verified/);
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
  assert.doesNotMatch(result.output, /schema verified/, "no postcheck after failed migration");
  assert.doesNotMatch(result.output, /schema drift detected/);
});

test("successful migration is not declared complete until schema parity passes", () => {
  const result = execute({ ...fixtures, TAD_TEST_MIGRATE_STATUS: "0" });
  assert.equal(result.status, 0);
  assert.match(result.output, /migration invoked/);
  assert.match(result.output, /pinned project checked/);
  assert.equal((result.output.match(/schema verified/g) || []).length, 1, "postcheck only; pending migrations are permitted on healthy other targets");
});

for (const [description, variant] of [
  ["uppercase", "LTDCDHQIXVBPDCITTHQF"],
  ["padded", " ltdcdhqixvbpdcitthqf "],
  ["newline-suffixed", "ltdcdhqixvbpdcitthqf\n"],
]) {
  test(`rejects noncanonical project-ref alias: ${description}`, () => {
    const result = execute({
      ...fixtures,
      TAD_EXPECTED_SUPABASE_PROJECT_REF: variant,
      TAD_TEST_MIGRATE_STATUS: "0",
    });
    assert.equal(result.status, 1);
    assert.match(result.output, /project ref must be lowercase ASCII without whitespace/);
    assert.doesNotMatch(result.output, /pinned project checked|migration invoked/);
  });
}

test("P0 canonical project is frozen before SQL, even with bypass-looking flags", () => {
  const result = execute({
    ...fixtures,
    TAD_EXPECTED_SUPABASE_PROJECT_REF: "ltdcdhqixvbpdcitthqf",
    TAD_ALLOW_UNSAFE_MIGRATION: "YES",
    TAD_APPROVE_SCHEMA_REPAIR: "YES",
    TAD_TEST_MIGRATE_STATUS: "0",
  });
  assert.equal(result.status, 1);
  assert.match(result.output, /P0 #217 production project frozen/);
  assert.match(result.output, /pinned project checked/);
  assert.match(result.output, /target checked/);
  assert.doesNotMatch(result.output, /migration invoked|schema verified/);
});

test("other target retains post-migration drift check", () => {
  const result = execute({ ...fixtures, TAD_TEST_MIGRATE_STATUS: "0", TAD_TEST_DRIFT_FAIL: "1" });
  assert.equal(result.status, 31);
  assert.match(result.output, /schema drift detected/);
  assert.match(result.output, /migration invoked/);
});

test("other target fails closed when post-migration catalog inspection is unavailable", () => {
  const result = execute({ ...fixtures, TAD_TEST_MIGRATE_STATUS: "0", TAD_TEST_DRIFT_QUERY_ERROR: "1" });
  assert.equal(result.status, 2);
  assert.match(result.output, /catalog inspection unavailable/);
  assert.match(result.output, /migration invoked/);
});

test("new post-migration drift still fails closed after successful migration", () => {
  const result = execute({
    ...fixtures,
    TAD_TEST_MIGRATE_STATUS: "0",
    TAD_TEST_DRIFT_POST_FAIL: "1",
  });
  assert.equal(result.status, 31);
  assert.match(result.output, /schema drift detected/);
  assert.match(result.output, /migration invoked/);
});

test("developer Prisma migrate command cannot bypass the local-only gate", () => {
  assert.equal(
    pkg.scripts["prisma:migrate"],
    "node scripts/assert-local-prisma-migration.cjs && prisma migrate dev",
  );
  assert.equal(pkg.scripts.clean, "ts-node scripts/clean-db.ts");
});

test("local-only migrate dev accepts only explicit opt-in and loopback DB", () => {
  const base = {
    NODE_ENV: "development",
    TAD_APPROVE_LOCAL_MIGRATION: "YES",
    DATABASE_URL: "postgresql://local-user:synthetic-secret@127.0.0.1:5432/tad_dev",
  };
  assert.equal(inspectLocalMigration(base), null);
  assert.equal(inspectLocalMigration({ ...base, DATABASE_URL: "postgres://u:p@localhost:5432/dev" }), null);
  assert.equal(inspectLocalMigration({ ...base, DATABASE_URL: "postgres://u:p@[::1]:5432/dev" }), null);
});

test("local Prisma migration refuses production/staging/undefined NODE_ENV and missing approval", () => {
  const env = {
    NODE_ENV: "development",
    TAD_APPROVE_LOCAL_MIGRATION: "YES",
    DATABASE_URL: "postgres://u:synthetic-secret@localhost:5432/dev",
  };
  for (const value of ["production", "staging", "", undefined]) {
    assert.equal(inspectLocalMigration({ ...env, NODE_ENV: value }), "NON_DEVELOPMENT_ENVIRONMENT");
  }
  for (const value of ["no", "", undefined]) {
    assert.equal(inspectLocalMigration({ ...env, TAD_APPROVE_LOCAL_MIGRATION: value }), "EXPLICIT_LOCAL_APPROVAL_REQUIRED");
  }
  assert.equal(inspectLocalMigration({ ...env, TAD_EXPECTED_SUPABASE_PROJECT_REF: "ltdcdhqixvbpdcitthqf" }), "PINNED_SUPABASE_PROJECT_PRESENT");
});

test("local migration refuses remote, malformed and absent database targets", () => {
  const env = { NODE_ENV: "development", TAD_APPROVE_LOCAL_MIGRATION: "YES" };
  for (const value of [undefined, "", "postgres://u:synthetic-secret@db.aaaaaaaaaaaaaaaaaaaa.supabase.co/postgres", "postgres://u:synthetic-secret@aws-0-us-west-2.pooler.supabase.com/postgres", "postgres://u:synthetic-secret@192.168.1.10/dev", "not-a-url", "https://localhost/dev"]) {
    assert.notEqual(inspectLocalMigration({ ...env, DATABASE_URL: value }), null);
  }
});

test("runtime security CI inherits exact root pnpm packageManager version", () => {
  const rootPackage = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const workflow = fs.readFileSync(
    path.join(root, ".github/workflows/runtime-security-regression.yml"), "utf8",
  );
  assert.equal(rootPackage.packageManager, "pnpm@10.34.9");
  assert.match(workflow, /uses: pnpm\/action-setup@v4/);
  assert.doesNotMatch(workflow, /version:\s*10(?:\s|$)/m);
  const sharedBuild = workflow.indexOf("pnpm --filter @tad/impact-calculator run build");
  const apiTests = workflow.indexOf("pnpm --filter api test --runInBand");
  const apiTypecheck = workflow.indexOf("pnpm exec tsc --noEmit --project apps/api/tsconfig.json");
  assert.ok(sharedBuild > 0 && sharedBuild < apiTests && sharedBuild < apiTypecheck, "Build dependency before API checks");

});

test("local migration refusal CLI never exposes database URLs or passwords", () => {
  const script = path.join(root, "apps/api/scripts/assert-local-prisma-migration.cjs");
  const fixture = "postgres://u:synthetic-secret@db.aaaaaaaaaaaaaaaaaaaa.supabase.co/postgres";
  const env = {
    PATH: "",
    NODE_ENV: "development",
    TAD_APPROVE_LOCAL_MIGRATION: "YES",
    DATABASE_URL: fixture,
  };
  if (windows) env.SYSTEMROOT = process.env.SYSTEMROOT || process.env.SystemRoot || "";
  const result = spawnSync(process.execPath, [script], {
    cwd: root, env, encoding: "utf8", windowsHide: true, timeout: 4000,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /\[migration\] REFUSED \(NON_LOCAL_DATABASE_TARGET\)/);
  assert.doesNotMatch(result.stdout + result.stderr, /synthetic-secret|db\.aaaaaaaaaaaaaaaaaaaa|postgres:\/\//);
});
