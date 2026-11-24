"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("node:child_process");
const { readFileSync, mkdtempSync, rmSync } = require("node:fs");
const os = require("node:os");
const vm = require("node:vm");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

// Never display file contents, connection strings, or secret bytes when the
// guard trips. Report only paths to investigators with repository access.
function isForbiddenTrackedPath(file) {
  const normalized = file.replace(/\\/g, "/").replace(/^\.\//, "");
  const base = path.posix.basename(normalized);
  // Ignore rules do not protect files already committed to Git. Reject all
  // tracked agent attachments and OAuth client-secret JSON files regardless
  // of location. The guard prints paths only, never contents or secret bytes.
  if (normalized.toLowerCase().startsWith(".hermes/desktop-attachments/")) return true;
  if (/^client_secret(?:[._-][^/]*)?\.json$/i.test(base)) return true;
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
    ".hermes/desktop-attachments/example-screenshot.png",
    ".hermes/desktop-attachments/client_secret_fixture.json",
    "config/client_secret.json", "config/client_secret_example.json",
    "config/CLIENT_SECRET-example.JSON",
  ]) assert.equal(isForbiddenTrackedPath(name), true, name);
  for (const name of [
    "apps/api/.env.example", ".env.example", "src/service.ts",
    "scripts/audit.test.cjs", ".npmrc",
    "docs/oauth-client-secret-runbook.md", "config/oauth.example.json",
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
  const auditStep = src.split("      - name: Run Security Audit\n")[1]
    ?.split("\n      - name: ")[0];
  assert.ok(auditStep, "Expected audit step");
  const shellBody = auditStep.split("        run: |\n")[1];
  assert.ok(shellBody, "Expected audit run script block");
  const shellSource = shellBody.split("\n").map(line =>
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

test("weekly audit always reports any failure even when the audit never produced outputs", () => {
  const src = readFileSync(path.join(root, ".github/workflows/security-audit-weekly.yml"), "utf8");
  const section = src.split("      - name: Create GitHub Issue on failure\n")[1]
    ?.split("      - name: Slack Notification on failure\n")[0];
  assert.ok(section, "Expected the weekly incident reporting step");
  assert.match(section, /^\s*if: failure\(\)$/m);
  assert.doesNotMatch(section, /if: failure\(\) &&/);
  assert.doesNotMatch(section, /labels:\s*\[/);
  assert.doesNotMatch(section, /assignees:\s*\[/);
  assert.match(section, /AUDIT_OUTCOME: \$\{\{ steps\.audit\.outcome \}\}/);
  assert.match(section, /if \(fs\.existsSync\('\.\/advisories-summary\.json'\)\)/);
});

test("weekly audit failure reporter creates sanitized issue without summary, after early error, or with findings", async () => {
  const src = readFileSync(path.join(root, ".github/workflows/security-audit-weekly.yml"), "utf8");
  const section = src.split("      - name: Create GitHub Issue on failure\n")[1]
    ?.split("      - name: Slack Notification on failure\n")[0];
  assert.ok(section, "Expected the weekly incident reporter");
  const body = section.split("          script: |\n")[1]?.split("\n")
    .map(line => line.startsWith("            ") ? line.slice(12) : line).join("\n");
  assert.ok(body?.includes("await github.rest.issues.create"), "Missing GitHub issue action");
  async function simulate(summary, env) {
    const created = [];
    const syntheticFs = {
      existsSync: () => summary !== undefined,
      readFileSync: () => summary,
    };
    const result = vm.runInNewContext("(async () => {\n" + body + "\n})()", {
      require(name) {
        assert.equal(name, "fs");
        return syntheticFs;
      },
      process: { env },
      Date,
      context: { repo: { owner: "fixture", repo: "fixture" }, runId: 4242 },
      github: { rest: { issues: { create: async issue => { created.push(issue); } } } },
    }, { timeout: 2000 });
    await result;
    assert.equal(created.length, 1, "Every failure must emit exactly one issue");
    const issue = created[0];
    assert.equal(issue.owner, "fixture");
    assert.equal(issue.repo, "fixture");
    assert.ok(issue.title.includes("4242"));
    assert.doesNotMatch(issue.body, /SYNTHETIC_PRIVATE_URL|SYNTHETIC_PASSWORD|raw-sql-text/);
    assert.equal(issue.labels, undefined);
    assert.equal(issue.assignees, undefined);
    return issue.body;
  }
  const early = await simulate(undefined, { AUDIT_OUTCOME: "failure" });
  assert.match(early, /Audit interrupted/);
  assert.match(early, /Unavailable/);

  const malformed = await simulate("{ not json } SYNTHETIC_PASSWORD", { AUDIT_OUTCOME: "failure" });
  assert.match(malformed, /Unavailable/);

  const substantive = await simulate(
    JSON.stringify({
      ERROR_COUNT: 3, WARN_COUNT: 2, INFO_COUNT: 1,
      raw_sql: "raw-sql-text", credentials: "SYNTHETIC_PASSWORD",
    }),
    { AUDIT_OUTCOME: "failure", AUDIT_NEW_ERRORS: "true", AUDIT_NEW_GRANTS: "true" },
  );
  assert.match(substantive, /New security ERRORs detected/);
  assert.match(substantive, /Client-role table grants/);
  assert.match(substantive, /ERROR: 3, WARN: 2, INFO: 1/);

  const nonAudit = await simulate(undefined, { AUDIT_OUTCOME: "success" });
  assert.match(nonAudit, /Workflow failed in setup, artifact upload/);
});

test("Slack weekly notifications never expose webhook URL through curl process argv", {
  skip: process.platform === "win32",
}, () => {
  const source = readFileSync(path.join(root, ".github/workflows/security-audit-weekly.yml"), "utf8");
  const privateFixture = "https://example.invalid/webhook/PRIVATE_FIXTURE_URL_MARKER";
  for (const name of ["Slack Notification on failure", "Slack Notification on success"]) {
    const section = source.split("      - name: " + name + "\n")[1]
      ?.split("\n      - name: ")[0];
    assert.ok(section, "Expected Slack step: " + name);
    const block = section.split("        run: |\n")[1];
    assert.ok(block, "Expected Slack shell script");
    const shell = block.split("\n")
      .map(line => line.startsWith("          ") ? line.slice(10) : line)
      .join("\n").replace(/\$\{\{[^}]*\}\}/g, "synthetic-github-value");
    // Dynamic mock below checks every argv item, not here-doc source text.
    assert.match(shell, /--config - <<CURL_CONFIG/);
    assert.match(shell, /url = "\$SLACK_WEBHOOK_URL"/);

    const folder = mkdtempSync(path.join(os.tmpdir(), "tad-slack-argv-"));
    try {
      const argvFile = path.join(folder, "args.txt");
      const configFile = path.join(folder, "config.txt");
      const mock = [
        "curl() {",
        "  printf '%s\\n' \"$@\" > \"$TAD_CURL_ARGV_OUT\"",
        "  cat > \"$TAD_CURL_CONFIG_OUT\"",
        "}",
      ].join("\n");
      const run = spawnSync("bash", ["-c", mock + "\n" + shell], {
        env: {
          PATH: process.env.PATH || "",
          SLACK_WEBHOOK_URL: privateFixture,
          TAD_CURL_ARGV_OUT: argvFile,
          TAD_CURL_CONFIG_OUT: configFile,
        },
        encoding: "utf8",
        timeout: 4000,
      });
      assert.equal(run.status, 0, "Slack synthetic notification shell failed");
      const argv = readFileSync(argvFile, "utf8");
      const config = readFileSync(configFile, "utf8");
      assert.ok(!argv.includes(privateFixture), "Webhook must not appear in curl argv");
      assert.match(argv, /--config\n-\n/);
      assert.ok(config.includes(privateFixture), "Webhook should be curl stdin config only");
      assert.ok(!run.stdout.includes(privateFixture) && !run.stderr.includes(privateFixture));
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  }
});

test("weekly audit secrets are scoped to the exact consuming steps, never the job", () => {
  const workflow = readFileSync(path.join(root, ".github/workflows/security-audit-weekly.yml"), "utf8");
  const jobHeader = workflow.split("    steps:\n")[0];
  assert.doesNotMatch(jobHeader, /^    env:/m, "No job-wide secret env");
  function stepSection(name) {
    const match = workflow.split("      - name: " + name + "\n")[1]
      ?.split("\n      - name: ")[0];
    assert.ok(match, "Missing step " + name);
    return match;
  }

  for (const name of [
    "Checkout repository",
    "Setup Supabase CLI",
    "Upload advisories artifact",
    "Create GitHub Issue on failure",
  ]) {
    const section = stepSection(name);
    assert.doesNotMatch(section, /\$\{\{\s*secrets\./, name + " must not receive privileged secrets");
    assert.doesNotMatch(section, /^\s*SUPABASE_ACCESS_TOKEN:/m);
    assert.doesNotMatch(section, /^\s*DB_PASSWORD:/m);
    assert.doesNotMatch(section, /^\s*SLACK_WEBHOOK_URL:/m);
  }

  const audit = stepSection("Run Security Audit");
  assert.match(audit, /        env:\n/);
  assert.match(audit, /SUPABASE_PROJECT_REF: \$\{\{ secrets\.SUPABASE_PROJECT_REF/);
  assert.match(audit, /SUPABASE_ACCESS_TOKEN: \$\{\{ secrets\.SUPABASE_ACCESS_TOKEN \}\}/);
  assert.match(audit, /DB_PASSWORD: \$\{\{ secrets\.DB_PASSWORD \}\}/);
  assert.doesNotMatch(audit, /SLACK_WEBHOOK_URL: \$\{\{/);

  for (const [name, outcome] of [
    ["Slack Notification on failure", "failure"],
    ["Slack Notification on success", "success"],
  ]) {
    const section = stepSection(name);
    assert.match(section, new RegExp("if: " + outcome + "\\(\\)"));
    assert.match(section, /        env:\n          SLACK_WEBHOOK_URL: \$\{\{ secrets\.SLACK_WEBHOOK_URL \}\}/);
    assert.match(section, /if \[ -z "\$\{SLACK_WEBHOOK_URL:-\}" \]; then\n\s*exit 0/);
    assert.doesNotMatch(section, /\$\{\{\s*secrets\.(?:DB_PASSWORD|SUPABASE_ACCESS_TOKEN)/);
  }
});

test("weekly Slack steps safely skip when webhook secret is absent", {
  skip: process.platform === "win32",
}, () => {
  const workflow = readFileSync(path.join(root, ".github/workflows/security-audit-weekly.yml"), "utf8");
  for (const name of ["Slack Notification on success", "Slack Notification on failure"]) {
    const section = workflow.split("      - name: " + name + "\n")[1]
      ?.split("\n      - name: ")[0];
    assert.ok(section);
    const script = section.split("        run: |\n")[1].split("\n")
      .map(line => line.startsWith("          ") ? line.slice(10) : line)
      .join("\n").replace(/\$\{\{[^}]*\}\}/g, "synthetic-gh-value");
    // Bash syntactic checks must not send a network request or need credentials.
    const testRun = spawnSync("bash", ["-n"], { input: script, encoding: "utf8", timeout: 4000 });
    assert.equal(testRun.status, 0);
    const run = spawnSync("bash", ["-c", "curl(){ exit 98; }\n" + script], {
      env: { PATH: process.env.PATH || "" }, encoding: "utf8", timeout: 4000,
    });
    assert.equal(run.status, 0, "Missing optional webhook must skip without calling curl");
    assert.doesNotMatch(run.stdout + run.stderr, /synthetic-gh-value/);
  }
});

test("weekly PostgreSQL audit reads valid idle-transaction columns, not nonexistent error logs", () => {
  const src = readFileSync(path.join(root, ".github/workflows/security-audit-weekly.yml"), "utf8");
  const section = src.split("          # 10. Long-idle transactions.")[1]
    ?.split("          # Long-running queries")[0];
  assert.ok(section, "Expected idle-transaction audit block");
  assert.match(section, /pg_catalog\.pg_stat_activity/);
  assert.match(section, /state_change < now\(\) - interval '5 minutes'/);
  assert.match(section, /datname = current_database\(\)/);
  assert.match(section, /SELECT count\(\*\)::integer/);
  assert.doesNotMatch(section, /max\(log_time\)|as error_count|check skipped \(permissions\)/);
  assert.match(section, /if ! \[\[ "\$IDLE_TXN_COUNT" =~ \^\[0-9\]\+\$ \]\]; then/);
});

test("weekly idle-transaction count warns on real signals and refuses malformed or failed SQL", {
  skip: process.platform === "win32",
}, () => {
  const src = readFileSync(path.join(root, ".github/workflows/security-audit-weekly.yml"), "utf8");
  const section = src.split("          # 10. Long-idle transactions.")[1]
    ?.split("          # Long-running queries")[0];
  assert.ok(section, "Expected idle-transaction Bash block");
  // split() starts after the heading's period, in the middle of its comment.
  // Drop that partial first line before evaluating the rest as Bash.
  const script = section.split("\n").slice(1).map(line =>
    line.startsWith("          ") ? line.slice(10) : line,
  ).join("\n");

  function run(output, broken = false) {
    const stub = broken
      ? 'psql(){ return 7; }\n'
      : 'psql(){ printf "%s\\n" "$TAD_TEST_IDLE_COUNT"; }\n';
    return spawnSync("bash", ["-c", "set -euo pipefail\n" + stub + script], {
      env: { PATH: process.env.PATH || "", TAD_TEST_IDLE_COUNT: output },
      encoding: "utf8", timeout: 4000,
    });
  }
  const clean = run("0");
  assert.equal(clean.status, 0);
  assert.match(clean.stdout, /Idle transactions older than five minutes: 0/);
  assert.doesNotMatch(clean.stdout + clean.stderr, /::warning::/);

  const busy = run("2");
  assert.equal(busy.status, 0);
  assert.match(busy.stdout, /::warning::Long-idle transactions detected \(2\)/);

  const malformed = run("not-a-number");
  assert.equal(malformed.status, 1);
  assert.match(malformed.stdout + malformed.stderr, /Invalid idle-transaction count/);

  const queryFailure = run("0", true);
  assert.notEqual(queryFailure.status, 0, "SQL failure must stop the audit");
  assert.doesNotMatch(queryFailure.stdout + queryFailure.stderr, /check skipped/i);
});

test("security job runs tracked-credential preflight before installing dependencies", () => {
  const workflow = readFileSync(path.join(root, ".github/workflows/ci.yml"), "utf8");
  const start = workflow.indexOf("\n  security:\n");
  const end = workflow.indexOf("\n  build:\n", start);
  assert.ok(start >= 0 && end > start, "Expected security and build jobs");
  const securityJob = workflow.slice(start, end);
  const preflight = securityJob.indexOf("scripts/tracked-postgres-secrets-guard.test.cjs");
  const install = securityJob.indexOf("pnpm install --frozen-lockfile");
  assert.ok(preflight >= 0 && install > preflight, "Tracked credential gate must run before dependency install");
  assert.match(securityJob, /node --test --test-name-pattern=/);
});


test("manual Supabase audit keeps tokens and passwords off process argv and avoids raw SQL output", {
  skip: process.platform === "win32",
}, () => {
  const src = readFileSync(path.join(root, "scripts/security-audit.sh"), "utf8");
  assert.match(src, /PROJECT_REF="\$\{SUPABASE_PROJECT_REF:-\}"/);
  assert.match(src, /curl -fsS --config -/);
  assert.match(src, /export PGPASSWORD="\$DB_PASSWORD"/);
  assert.match(src, /psql -X -v ON_ERROR_STOP=1/);
  assert.doesNotMatch(src, /postgres(?:ql)?:\/\/postgres:\$DB_PASSWORD@/);
  assert.doesNotMatch(src, /(?:-H|--header)\s+["']Authorization: Bearer \$SUPABASE_ACCESS_TOKEN/);
  assert.doesNotMatch(src, /SELECT pid,[^\n]*query\b/);
  assert.doesNotMatch(src, /Storage usage: \$STORAGE_USAGE/);
  assert.doesNotMatch(src, /\\\(.detail\)/);
  const syntax = spawnSync("bash", ["-n"], {
    input: src, encoding: "utf8", timeout: 4000,
  });
  assert.equal(syntax.status, 0, "Manual audit must be valid bash without printing secret values");
  const preflight = spawnSync("bash", ["-c", src], {
    env: { PATH: process.env.PATH || "" },
    encoding: "utf8", timeout: 4000,
  });
  assert.equal(preflight.status, 1, "Missing configuration must fail before any API/DB access");
  assert.doesNotMatch(preflight.stdout + preflight.stderr, /postgresql:\/\//);
});

test("scheduled security audit refuses a valid but wrong production project", {
  skip: process.platform === "win32",
}, () => {
  const src = readFileSync(
    path.join(root, ".github/workflows/security-audit-weekly.yml"),
    "utf8",
  );
  // Execute the preflight alone; no Supabase or GitHub endpoint is contacted.
  const start = src.indexOf("          # Refuse missing credentials");
  const end = src.indexOf("          # Libpq reads the password", start);
  assert.ok(start >= 0 && end > start, "Expected credential and project preflight");
  const script = src
    .slice(start, end)
    .split("\n")
    .map((line) => line.startsWith("          ") ? line.slice(10) : line)
    .join("\n");
  assert.match(script, /AUDIT_EXPECTED_PROJECT_REF="ltdcdhqixvbpdcitthqf"/);
  assert.match(script, /SUPABASE_PROJECT_REF.*AUDIT_EXPECTED_PROJECT_REF/);

  function run(projectRef, token = "synthetic-token", password = "synthetic-password") {
    return spawnSync("bash", ["-c", "set -euo pipefail\n" + script], {
      env: {
        PATH: process.env.PATH || "",
        SUPABASE_PROJECT_REF: projectRef,
        SUPABASE_ACCESS_TOKEN: token,
        DB_PASSWORD: password,
      },
      encoding: "utf8",
      timeout: 4000,
    });
  }

  const valid = run("ltdcdhqixvbpdcitthqf");
  assert.equal(valid.status, 0, "Owner-confirmed project must be accepted");
  for (const invalid of [
    run("aaaaaaaaaaaaaaaaaaaa"),
    run("REPLACE_WITH_SECRET"),
    run(""),
    run("ltdcdhqixvbpdcitthqf", ""),
    run("ltdcdhqixvbpdcitthqf", "synthetic-token", ""),
  ]) {
    assert.notEqual(invalid.status, 0, "Invalid audit target/configuration must stop");
    assert.doesNotMatch(
      invalid.stdout + invalid.stderr,
      /synthetic-token|synthetic-password/,
      "Preflight may never print credentials",
    );
  }
});

test("weekly Supabase audit fails closed on malformed Management API advisories", {
  skip: process.platform === "win32",
}, () => {
  const src = readFileSync(
    path.join(root, ".github/workflows/security-audit-weekly.yml"),
    "utf8",
  );
  const validation = src.match(/if ! jq -e '([^']+)' <<<"\$ADVISORIES"/);
  assert.ok(validation, "Weekly audit must validate the lints response");
  const validateAt = src.indexOf("if ! jq -e '");
  const countAt = src.indexOf('ERROR_COUNT=$(echo "$ADVISORIES"');
  assert.ok(
    validateAt >= 0 && countAt > validateAt,
    "Validation must precede security-advisory counts",
  );
  const examples = [
    [[], true],
    [[{ name: "function_search_path_mutable", level: "WARN" }], true],
    [{}, false],
    [{ message: "unauthorized", status: 401 }, false],
    [null, false],
    [[{ name: "incomplete" }], false],
    [[{ name: "", level: "ERROR" }], false],
    [[{ name: "unknown", level: "UNEXPECTED" }], false],
  ];
  for (const [payload, accepted] of examples) {
    const result = spawnSync("jq", ["-e", validation[1]], {
      input: JSON.stringify(payload),
      encoding: "utf8",
      timeout: 4000,
    });
    assert.equal(
      result.status,
      accepted ? 0 : 1,
      "Unexpected validation verdict for synthetic Management API lints",
    );
  }
});

test("weekly audit validates required Storage Auth and Functions payloads", {
  skip: process.platform === "win32",
}, () => {
  const src = readFileSync(
    path.join(root, ".github/workflows/security-audit-weekly.yml"),
    "utf8",
  );
  const contracts = [
    {
      variable: "STORAGE",
      after: 'echo "$STORAGE" | jq -r',
      samples: [
        [[], true],
        [[{ id: "bucket-1", name: "media", public: false }], true],
        [{ message: "unauthorized", status: 401 }, false],
        [{ data: [] }, false],
        [null, false],
        [[{ id: "bucket-1", name: "media" }], false],
      ],
    },
    {
      variable: "AUTH_CONFIG",
      after: 'echo "$AUTH_CONFIG" | jq',
      samples: [
        [{ disable_signup: false, external_email_enabled: true }, true],
        [{ disable_signup: true, external_email_enabled: false }, true],
        [{}, false],
        [{ message: "forbidden", status: 403 }, false],
        [{ disable_signup: null, external_email_enabled: true }, false],
        [[], false],
      ],
    },
    {
      variable: "FUNCTIONS",
      after: 'FUNC_COUNT=$(echo "$FUNCTIONS"',
      samples: [
        [[], true],
        [[{ slug: "reconcile", name: "Reconcile" }], true],
        [{ message: "not found" }, false],
        [{ data: [] }, false],
        [[{ slug: "reconcile" }], false],
        [null, false],
      ],
    },
  ];
  for (const contract of contracts) {
    const matcher = new RegExp(
      'if ! jq -e \\'([^\\']+)\\' <<<"\\
  skip: process.platform === "win32",
}, () => {
  const src = readFileSync(path.join(root, "scripts/security-audit.sh"), "utf8");
  const shape = src.match(/if ! jq -e '([^']+)' <<<"\$ADVISORIES"/);
  assert.ok(shape, "Manual audit must verify security-lint JSON shape before counting");
  for (const [sample, expected] of [
    [[], 0],
    [[{ level: "WARN", name: "function_search_path_mutable" }], 0],
    [{}, 1],
    [{ message: "synthetic", status: 200 }, 1],
    [null, 1],
    [[{ name: "unknown_level", level: "NOT_A_LEVEL" }], 1],
    [[{ level: "WARN", name: "" }], 1],
  ]) {
    const run = spawnSync("jq", ["-e", shape[1]], {
      input: JSON.stringify(sample), encoding: "utf8", timeout: 4000,
    });
    assert.equal(run.status, expected, "Unexpected verdict for synthetic security-lint payload");
  }

  const knownMatch = src.match(/KNOWN_BLOCKED_ERRORS='([^']+)'/);
  assert.ok(knownMatch, "Expected one exact exception object");
  const known = JSON.parse(knownMatch[1]);
  assert.deepEqual(known, {
    name: "rls_disabled_in_public", schema: "public", table: "spatial_ref_sys",
  });
  const jqCount = src.match(/NEW_ERRORS=\$\(echo "\$ADVISORIES" \| jq --argjson known "\$KNOWN_BLOCKED_ERRORS" \\\n\s+'([^']+)'/);
  assert.ok(jqCount, "Expected exact-object RLS error filtering");
  const lints = [
    { level: "ERROR", name: "rls_disabled_in_public", metadata: { schema: "public", name: "spatial_ref_sys" } },
    { level: "ERROR", name: "rls_disabled_in_public", metadata: { schema: "public", name: "new_table" } },
    { level: "ERROR", name: "rls_disabled_in_public", metadata: { schema: "private", name: "spatial_ref_sys" } },
    { level: "ERROR", name: "rls_disabled_in_public" },
    { level: "INFO", name: "rls_enabled_no_policy" },
  ];
  const count = spawnSync("jq", ["--argjson", "known", JSON.stringify(known), jqCount[1]], {
    input: JSON.stringify(lints), encoding: "utf8", timeout: 4000,
  });
  assert.equal(count.status, 0, "jq filter did not execute");
  assert.equal(count.stdout.trim(), "3", "RLS errors for all other objects must remain blocking");
});
 + contract.variable + '"',
    );
    const match = src.match(matcher);
    assert.ok(match, contract.variable + " must have a jq validation");
    const validationAt = src.indexOf(match[0]);
    const useAt = src.indexOf(contract.after, validationAt);
    assert.ok(useAt > validationAt, contract.variable + " must be validated before use");

    for (const [payload, accepted] of contract.samples) {
      const result = spawnSync("jq", ["-e", match[1]], {
        input: JSON.stringify(payload),
        encoding: "utf8",
        timeout: 4000,
      });
      assert.equal(
        result.status === 0,
        accepted,
        "Unexpected " + contract.variable + " validation verdict",
      );
    }
  }
});

test("manual Supabase audit rejects malformed advisories and only excepts the exact PostGIS table", {
  skip: process.platform === "win32",
}, () => {
  const src = readFileSync(path.join(root, "scripts/security-audit.sh"), "utf8");
  const shape = src.match(/if ! jq -e '([^']+)' <<<"\$ADVISORIES"/);
  assert.ok(shape, "Manual audit must verify security-lint JSON shape before counting");
  for (const [sample, expected] of [
    [[], 0],
    [[{ level: "WARN", name: "function_search_path_mutable" }], 0],
    [{}, 1],
    [{ message: "synthetic", status: 200 }, 1],
    [null, 1],
    [[{ name: "unknown_level", level: "NOT_A_LEVEL" }], 1],
    [[{ level: "WARN", name: "" }], 1],
  ]) {
    const run = spawnSync("jq", ["-e", shape[1]], {
      input: JSON.stringify(sample), encoding: "utf8", timeout: 4000,
    });
    assert.equal(run.status, expected, "Unexpected verdict for synthetic security-lint payload");
  }

  const knownMatch = src.match(/KNOWN_BLOCKED_ERRORS='([^']+)'/);
  assert.ok(knownMatch, "Expected one exact exception object");
  const known = JSON.parse(knownMatch[1]);
  assert.deepEqual(known, {
    name: "rls_disabled_in_public", schema: "public", table: "spatial_ref_sys",
  });
  const jqCount = src.match(/NEW_ERRORS=\$\(echo "\$ADVISORIES" \| jq --argjson known "\$KNOWN_BLOCKED_ERRORS" \\\n\s+'([^']+)'/);
  assert.ok(jqCount, "Expected exact-object RLS error filtering");
  const lints = [
    { level: "ERROR", name: "rls_disabled_in_public", metadata: { schema: "public", name: "spatial_ref_sys" } },
    { level: "ERROR", name: "rls_disabled_in_public", metadata: { schema: "public", name: "new_table" } },
    { level: "ERROR", name: "rls_disabled_in_public", metadata: { schema: "private", name: "spatial_ref_sys" } },
    { level: "ERROR", name: "rls_disabled_in_public" },
    { level: "INFO", name: "rls_enabled_no_policy" },
  ];
  const count = spawnSync("jq", ["--argjson", "known", JSON.stringify(known), jqCount[1]], {
    input: JSON.stringify(lints), encoding: "utf8", timeout: 4000,
  });
  assert.equal(count.status, 0, "jq filter did not execute");
  assert.equal(count.stdout.trim(), "3", "RLS errors for all other objects must remain blocking");
});
