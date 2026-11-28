"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  BASE,
  CHECK_NAME,
  GITHUB_ACTIONS_APP_ID,
  protectionPayload,
  assertUnprotected,
  assertExecutedSummary,
  assertInstalled,
  run,
} = require("./protect-main-branch.cjs");

const SHA = "a".repeat(40);
const MOVED_SHA = "b".repeat(40);

function mainBranch(sha = SHA, protectedBranch = false) {
  return { name: "main", commit: { sha }, protected: protectedBranch };
}

function successfulSummary() {
  return {
    name: CHECK_NAME,
    status: "completed",
    conclusion: "success",
    started_at: "2026-11-23T01:30:20Z",
    app: { id: GITHUB_ACTIONS_APP_ID, slug: "github-actions" },
  };
}

function installedProtection() {
  return {
    required_status_checks: {
      strict: true,
      checks: [{ context: CHECK_NAME, app_id: GITHUB_ACTIONS_APP_ID }],
    },
    required_pull_request_reviews: {
      required_approving_review_count: 1,
      dismiss_stale_reviews: true,
      require_last_push_approval: true,
    },
    enforce_admins: { enabled: true },
    required_conversation_resolution: { enabled: true },
    allow_force_pushes: { enabled: false },
    allow_deletions: { enabled: false },
  };
}

function fixture({
  initialProtected = false,
  rulesets = [],
  checks = [successfulSummary()],
  moveBranch = false,
  invalidPostWrite = false,
} = {}) {
  const calls = [];
  const logs = [];
  let branchReads = 0;
  let wrote = false;
  function api(method, route, payload) {
    calls.push({ method, route, payload });
    if (method === "GET" && route === BASE + "/branches/main") {
      branchReads += 1;
      if (moveBranch && branchReads >= 2) return mainBranch(MOVED_SHA, false);
      return mainBranch(SHA, initialProtected || wrote);
    }
    if (method === "GET" && route === BASE + "/rulesets") return rulesets;
    if (method === "GET" && route === BASE + "/commits/" + SHA + "/check-runs?per_page=100") {
      return { check_runs: checks };
    }
    if (method === "PUT" && route === BASE + "/branches/main/protection") {
      assert.deepEqual(payload, protectionPayload());
      wrote = true;
      return {};
    }
    if (method === "GET" && route === BASE + "/branches/main/protection") {
      return invalidPostWrite ? { ...installedProtection(), enforce_admins: { enabled: false } } : installedProtection();
    }
    throw new Error("Unexpected fixture API request: " + method + " " + route);
  }
  return { api, calls, logs, log: message => logs.push(message) };
}

test("protection contract pins strict GitHub Actions Summary with no destructive permissions", () => {
  const payload = protectionPayload();
  assert.equal(payload.required_status_checks.strict, true);
  assert.deepEqual(payload.required_status_checks.contexts, ["Summary"]);
  assert.deepEqual(payload.required_status_checks.checks, [
    { context: "Summary", app_id: GITHUB_ACTIONS_APP_ID },
  ]);
  assert.equal(payload.enforce_admins, true);
  assert.equal(payload.required_pull_request_reviews.required_approving_review_count, 1);
  assert.equal(payload.required_pull_request_reviews.dismiss_stale_reviews, true);
  assert.equal(payload.required_pull_request_reviews.require_last_push_approval, true);
  assert.equal(payload.allow_force_pushes, false);
  assert.equal(payload.allow_deletions, false);
});

test("plan mode reads state but never writes, even when Summary is green", () => {
  const f = fixture();
  const result = run({ mode: "--plan", api: f.api, log: f.log });
  assert.deepEqual(result, { applied: false, sha: SHA });
  assert.equal(f.calls.length, 3);
  assert.ok(f.calls.every(call => call.method === "GET"));
  assert.ok(f.logs.some(message => message.includes("DRY_RUN_ONLY")));
});

function verificationFixture({ config = installedProtection(), protectedMain = true,
  moved = false, checks = [successfulSummary()], forbidden = false } = {}) {
  const calls = [];
  const logs = [];
  let branchReads = 0;
  const api = (method, route) => {
    calls.push({ method, route });
    assert.equal(method, "GET", "verification must never write GitHub settings");
    if (route === BASE + "/branches/main") {
      branchReads += 1;
      return mainBranch(moved && branchReads > 1 ? MOVED_SHA : SHA, protectedMain);
    }
    if (route === BASE + "/branches/main/protection") {
      if (forbidden) throw new Error("GITHUB_API_GET_UNAVAILABLE_OR_FORBIDDEN");
      return config;
    }
    if (route === BASE + "/commits/" + SHA + "/check-runs?per_page=100") {
      return { check_runs: checks };
    }
    throw new Error("Unexpected verification route");
  };
  return { api, calls, logs, log: value => logs.push(value) };
}

test("verify audits complete existing protection without approval or any write", () => {
  const f = verificationFixture();
  assert.deepEqual(run({ mode: "--verify", env: {}, api: f.api, log: f.log }),
    { verified: true, sha: SHA });
  assert.equal(f.calls.length, 4);
  assert.ok(f.calls.every(call => call.method === "GET"));
  assert.ok(f.logs.some(line => line.includes("READ_ONLY_VERIFIED")));
  assert.ok(f.logs.every(line => !line.includes("DRY_RUN_ONLY")));
});

test("verify rejects protected main without PR review rules, even with apply approval set", () => {
  const f = verificationFixture({ config: { ...installedProtection(), required_pull_request_reviews: null } });
  assert.throws(() => run({ mode: "--verify", env: { TAD_APPROVE_MAIN_PROTECTION: "YES" },
    api: f.api, log: f.log }), /EXISTING_PROTECTION_INCOMPLETE.*REQUIRED_PR_REVIEWS/);
  assert.equal(f.calls.length, 2);
  assert.ok(f.logs.every(line => !line.includes("READ_ONLY_VERIFIED")));
});

test("verify refuses partial settings without trying to repair them", () => {
  for (const config of [
    { ...installedProtection(), required_status_checks: { strict: false, checks: [] } },
    { ...installedProtection(), required_status_checks: { strict: true, checks: [null, {}] } },
    { ...installedProtection(), enforce_admins: { enabled: false } },
    { ...installedProtection(), allow_force_pushes: { enabled: true } },
    { ...installedProtection(), allow_deletions: { enabled: true } },
    { ...installedProtection(), required_conversation_resolution: { enabled: false } },
    { ...installedProtection(), required_pull_request_reviews: {
      ...installedProtection().required_pull_request_reviews, require_last_push_approval: false } },
  ]) {
    const f = verificationFixture({ config });
    assert.throws(() => run({ mode: "--verify", api: f.api, log: f.log }), /EXISTING_PROTECTION_INCOMPLETE/);
    assert.ok(f.calls.every(call => call.method === "GET"));
  }
});

test("verify fails closed on absent protection, forbidden reads, missing Summary or moving main", () => {
  const cases = [
    [{ protectedMain: false }, /MAIN_NOT_PROTECTED/],
    [{ forbidden: true }, /GITHUB_API_GET_UNAVAILABLE_OR_FORBIDDEN/],
    [{ checks: [] }, /MAIN_SUMMARY_NOT_EXECUTED_AND_GREEN/],
    [{ moved: true }, /MAIN_MOVED_DURING_VERIFICATION/],
  ];
  for (const [options, expected] of cases) {
    const f = verificationFixture(options);
    assert.throws(() => run({ mode: "--verify", api: f.api, log: f.log }), expected);
    assert.ok(f.calls.every(call => call.method === "GET"));
    assert.ok(f.logs.every(line => !line.includes("READ_ONLY_VERIFIED")));
  }
});

test("verify CLI exits zero only for complete read-only proof and reports safe failure codes", (t) => {
  const { spawnSync } = require("node:child_process");
  const fs = require("node:fs");
  const os = require("node:os");
  const path = require("node:path");
  const script = require.resolve("./protect-main-branch.cjs");
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tad-protection-cli-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const preload = path.join(directory, "provider-fixture.cjs");
  for (const mode of ["complete", "missing-reviews", "forbidden"]) {
    const program = `
      const cp = require('node:child_process');
      const branch = ${JSON.stringify(mainBranch(SHA, true))};
      const config = ${JSON.stringify(installedProtection())};
      if (${JSON.stringify(mode)} === 'missing-reviews') config.required_pull_request_reviews = null;
      cp.spawnSync = (executable, args) => {
        if (executable !== 'gh' || args[2] !== 'GET') throw new Error('MUTATION_ATTEMPT');
        const route = args[3];
        if (route.endsWith('/protection') && ${JSON.stringify(mode)} === 'forbidden') {
          return {status:1, stderr:'PRIVATE_PROVIDER_ERROR_FIXTURE'};
        }
        const result = route.endsWith('/protection') ? config : route.includes('/check-runs')
          ? {check_runs:[${JSON.stringify(successfulSummary())}]} : branch;
        return {status:0, stdout:JSON.stringify(result)};
      };
    `;
    fs.writeFileSync(preload, program);
    const result = spawnSync(process.execPath, ["--require", preload, script, "--verify"],
      {encoding:"utf8", timeout:15000, windowsHide:true});
    assert.equal(result.status, mode === "complete" ? 0 : 1, result.stderr);
    assert.doesNotMatch(result.stdout + result.stderr, /PRIVATE_PROVIDER_ERROR_FIXTURE|MUTATION_ATTEMPT/);
    if (mode === "complete") assert.match(result.stdout, /READ_ONLY_VERIFIED/);
    else assert.match(result.stderr, mode === "forbidden"
      ? /GITHUB_API_GET_UNAVAILABLE_OR_FORBIDDEN/ : /EXISTING_PROTECTION_INCOMPLETE.*REQUIRED_PR_REVIEWS/);
  }
});

test("apply without explicit administrator approval does not contact GitHub", () => {
  const f = fixture();
  assert.throws(
    () => run({ mode: "--apply", env: {}, api: f.api, log: f.log }),
    /EXPLICIT_ADMIN_APPROVAL_REQUIRED/,
  );
  assert.equal(f.calls.length, 0);
});

test("unknown mode is rejected before contacting GitHub", () => {
  const f = fixture();
  assert.throws(
    () => run({ mode: "--force", api: f.api, log: f.log }),
    /UNKNOWN_MODE/,
  );
  assert.equal(f.calls.length, 0);
});

test("existing protection and rulesets must never be overwritten", () => {
  for (const options of [{ initialProtected: true }, { rulesets: [{ id: 42 }] }]) {
    const f = fixture(options);
    assert.throws(() => run({ mode: "--plan", api: f.api, log: f.log }),
      /BRANCH_ALREADY_PROTECTED_REVIEW_EXISTING_RULES|EXISTING_RULESETS_REQUIRE_ADMIN_REVIEW/);
    assert.ok(f.calls.every(call => call.method === "GET"));
  }
});

test("malformed branch identity or missing GitHub Actions Summary rejects the operation", () => {
  assert.throws(() => assertUnprotected(mainBranch("invalid"), []),
    /UNEXPECTED_MAIN_BRANCH_IDENTITY/);
  for (const badChecks of [
    [],
    [{ ...successfulSummary(), conclusion: "failure" }],
    [{ ...successfulSummary(), app: { id: 0, slug: "unknown" } }],
    [
      successfulSummary(),
      { ...successfulSummary(), conclusion: "failure", started_at: "2026-11-23T02:00:00Z" },
    ],
  ]) {
    assert.throws(() => assertExecutedSummary({ check_runs: badChecks }),
      /MAIN_SUMMARY_NOT_EXECUTED_AND_GREEN/);
  }
  assert.doesNotThrow(() => assertExecutedSummary({ check_runs: [successfulSummary()] }));
});

test("main SHA moving during apply preflight blocks write", () => {
  const f = fixture({ moveBranch: true });
  assert.throws(
    () => run({ mode: "--apply", env: { TAD_APPROVE_MAIN_PROTECTION: "YES" }, api: f.api, log: f.log }),
    /MAIN_MOVED_DURING_PREFLIGHT/,
  );
  assert.ok(f.calls.every(call => call.method !== "PUT"));
});

test("a successful PUT is not counted as verified without the required readback", () => {
  const f = fixture({ invalidPostWrite: true });
  assert.throws(
    () => run({ mode: "--apply", env: { TAD_APPROVE_MAIN_PROTECTION: "YES" }, api: f.api, log: f.log }),
    /POST_WRITE_PROTECTION_INCOMPLETE_MANUAL_REVIEW_REQUIRED/,
  );
  assert.equal(f.calls.filter(call => call.method === "PUT").length, 1);
  assert.ok(f.logs.every(message => !message.includes("PROTECTION_VERIFIED")));
  assert.throws(() => assertInstalled({
    ...installedProtection(),
    required_status_checks: { strict: false, checks: [] },
  }), /POST_WRITE_PROTECTION_INCOMPLETE_MANUAL_REVIEW_REQUIRED/);
});

test("successful apply verifies rules, enforcement and protected branch by read-after-write", () => {
  const f = fixture();
  const result = run({
    mode: "--apply",
    env: { TAD_APPROVE_MAIN_PROTECTION: "YES" },
    api: f.api,
    log: f.log,
  });
  assert.deepEqual(result, { applied: true, sha: SHA });
  assert.deepEqual(f.calls.map(call => call.method), [
    "GET", "GET", "GET", "GET", "GET", "PUT", "GET", "GET",
  ]);
  assert.equal(f.calls.filter(call => call.method === "PUT").length, 1);
  assert.ok(f.logs.some(message => message.includes("PROTECTION_VERIFIED")));
});


function soloProtection() {
  const config = installedProtection();
  return {
    ...config,
    required_pull_request_reviews: {
      ...config.required_pull_request_reviews,
      required_approving_review_count: 0,
      require_last_push_approval: false,
      require_code_owner_reviews: false,
    },
  };
}

test("solo verification accepts only the explicit owner-approved profile using GET", () => {
  const config = soloProtection();
  const f = verificationFixture({ config });
  assert.deepEqual(run({ mode: "--verify-solo", api: f.api, log: f.log }),
    { verified: true, sha: SHA });
  assert.equal(f.calls.length, 4);
  assert.ok(f.calls.every(call => call.method === "GET"));
  assert.ok(f.logs.some(line => line.includes("profile=solo")));
  const strict = verificationFixture({ config });
  assert.throws(() => run({ mode: "--verify", api: strict.api, log: strict.log }),
    /EXISTING_PROTECTION_INCOMPLETE.*REQUIRED_PR_REVIEWS/);
});

test("solo verification does not accept missing PR rules or unsafe common protections", () => {
  const config = soloProtection();
  const review = config.required_pull_request_reviews;
  for (const bad of [
    { ...config, required_pull_request_reviews: null },
    { ...config, required_pull_request_reviews: { ...review, required_approving_review_count: undefined } },
    { ...config, required_pull_request_reviews: { ...review, require_last_push_approval: true } },
    { ...config, required_pull_request_reviews: { ...review, require_code_owner_reviews: true } },
    { ...config, required_pull_request_reviews: { ...review, dismiss_stale_reviews: false } },
    { ...config, required_status_checks: { strict: false, checks: [] } },
    { ...config, required_status_checks: { strict: true, checks: [{ context: "Summary", app_id: 77 }] } },
    { ...config, enforce_admins: { enabled: false } },
    { ...config, allow_force_pushes: { enabled: true } },
    { ...config, allow_deletions: { enabled: true } },
    { ...config, required_conversation_resolution: { enabled: false } },
    installedProtection(),
  ]) {
    const f = verificationFixture({ config: bad });
    assert.throws(() => run({ mode: "--verify-solo", api: f.api, log: f.log }),
      /EXISTING_PROTECTION_INCOMPLETE/);
    assert.ok(f.calls.every(call => call.method === "GET"));
  }
});

test("solo verification refuses missing or red Summary, moving main and forbidden reads", () => {
  for (const options of [
    { checks: [] },
    { checks: [{ ...successfulSummary(), conclusion: "failure" }] },
    { moved: true },
    { forbidden: true },
    { protectedMain: false },
  ]) {
    const f = verificationFixture({ config: soloProtection(), ...options });
    assert.throws(() => run({ mode: "--verify-solo", api: f.api, log: f.log }));
    assert.ok(f.calls.every(call => call.method === "GET"));
    assert.ok(f.logs.every(line => !line.includes("READ_ONLY_VERIFIED")));
  }
});

test("solo verification never changes the existing installation payload", () => {
  const f = verificationFixture({ config: soloProtection() });
  run({ mode: "--verify-solo", env: { TAD_APPROVE_MAIN_PROTECTION: "YES" }, api: f.api, log: f.log });
  const desired = protectionPayload();
  assert.equal(desired.required_pull_request_reviews.required_approving_review_count, 1);
  assert.equal(desired.required_pull_request_reviews.require_last_push_approval, true);
  assert.ok(f.calls.every(call => call.method === "GET"));
});
