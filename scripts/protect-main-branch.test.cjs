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
