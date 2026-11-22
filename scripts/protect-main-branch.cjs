#!/usr/bin/env node
"use strict";

// Owner-operated P0 #313 control. This file NEVER writes to GitHub unless
// --apply and TAD_APPROVE_MAIN_PROTECTION=YES are both supplied.
// Requires an authenticated GitHub CLI account with repository admin rights.
// This is not an API/database migration, deployment or merge automation.

const { spawnSync } = require("node:child_process");

const REPO = "tadtaxiadvertising/tad-dooh-platform";
const BASE = "repos/" + REPO;
const CHECK_NAME = "Summary";
const GITHUB_ACTIONS_APP_ID = 15368;

function protectionPayload() {
  return {
    required_status_checks: {
      strict: true,
      contexts: [CHECK_NAME],
      checks: [{ context: CHECK_NAME, app_id: GITHUB_ACTIONS_APP_ID }],
    },
    enforce_admins: true,
    required_pull_request_reviews: {
      dismiss_stale_reviews: true,
      require_code_owner_reviews: false,
      required_approving_review_count: 1,
      require_last_push_approval: true,
    },
    restrictions: null,
    allow_force_pushes: false,
    allow_deletions: false,
    required_conversation_resolution: true,
  };
}

function ghApi(method, route, payload) {
  const args = ["api", "--method", method, route];
  if (payload !== undefined) args.push("--input", "-");
  const result = spawnSync("gh", args, {
    input: payload === undefined ? undefined : JSON.stringify(payload),
    encoding: "utf8",
    windowsHide: true,
    timeout: 15000,
    maxBuffer: 2 * 1024 * 1024,
  });
  // Do not forward CLI errors: they may contain remote URLs or credentials.
  if (result.error || result.status !== 0) {
    throw new Error("GITHUB_API_" + method + "_UNAVAILABLE_OR_FORBIDDEN");
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error("GITHUB_API_INVALID_JSON");
  }
}

function assertUnprotected(branch, rules) {
  if (branch?.name !== "main" ||
      !/^[a-f0-9]{40}$/.test(branch?.commit?.sha || "")) {
    throw new Error("UNEXPECTED_MAIN_BRANCH_IDENTITY");
  }
  if (branch.protected !== false) {
    throw new Error("BRANCH_ALREADY_PROTECTED_REVIEW_EXISTING_RULES");
  }
  // Never overwrite or conflict with preexisting repository rulesets.
  if (!Array.isArray(rules) || rules.length !== 0) {
    throw new Error("EXISTING_RULESETS_REQUIRE_ADMIN_REVIEW");
  }
  return branch.commit.sha;
}

function assertExecutedSummary(checks) {
  const candidates = Array.isArray(checks?.check_runs) ? checks.check_runs : [];
  const found = candidates
    .filter(check =>
      check.name === CHECK_NAME &&
      check.app?.slug === "github-actions" &&
      check.app?.id === GITHUB_ACTIONS_APP_ID)
    .sort((a, b) => String(b.started_at || "").localeCompare(String(a.started_at || "")));
  if (found.length === 0 || found[0].status !== "completed" ||
      found[0].conclusion !== "success") {
    throw new Error("MAIN_SUMMARY_NOT_EXECUTED_AND_GREEN");
  }
}

function assertInstalled(config) {
  const checks = config?.required_status_checks;
  const approvals = config?.required_pull_request_reviews;
  if (checks?.strict !== true ||
      !Array.isArray(checks.checks) ||
      !checks.checks.some(c => c.context === CHECK_NAME && c.app_id === GITHUB_ACTIONS_APP_ID) ||
      config?.enforce_admins?.enabled !== true ||
      !Number.isInteger(approvals?.required_approving_review_count) ||
      approvals.required_approving_review_count < 1 ||
      approvals?.dismiss_stale_reviews !== true ||
      approvals?.require_last_push_approval !== true ||
      config?.required_conversation_resolution?.enabled !== true ||
      config?.allow_force_pushes?.enabled !== false ||
      config?.allow_deletions?.enabled !== false) {
    throw new Error("POST_WRITE_PROTECTION_INCOMPLETE_MANUAL_REVIEW_REQUIRED");
  }
}

function run({ mode = "--plan", env = process.env, api = ghApi, log = console.log } = {}) {
  if (!["--plan", "--apply"].includes(mode)) throw new Error("UNKNOWN_MODE");
  if (mode === "--apply" && env.TAD_APPROVE_MAIN_PROTECTION !== "YES") {
    throw new Error("EXPLICIT_ADMIN_APPROVAL_REQUIRED");
  }

  const branch = api("GET", BASE + "/branches/main");
  const rules = api("GET", BASE + "/rulesets");
  const sha = assertUnprotected(branch, rules);
  assertExecutedSummary(api("GET", BASE + "/commits/" + sha + "/check-runs?per_page=100"));
  const desired = protectionPayload();
  log("TAD_MAIN_PROTECTION_PLAN: target=main required=Summary github-actions-app=15368 strict=true reviews=1 admins=enforced");
  if (mode === "--plan") {
    log("TAD_MAIN_PROTECTION_DRY_RUN_ONLY: no settings changed");
    return { applied: false, sha };
  }

  // Fail closed when main moved between preflight and the write.
  const fresh = api("GET", BASE + "/branches/main");
  const freshRules = api("GET", BASE + "/rulesets");
  if (assertUnprotected(fresh, freshRules) !== sha) {
    throw new Error("MAIN_MOVED_DURING_PREFLIGHT");
  }
  api("PUT", BASE + "/branches/main/protection", desired);
  // Never assert success merely from PUT status.
  assertInstalled(api("GET", BASE + "/branches/main/protection"));
  const verifiedBranch = api("GET", BASE + "/branches/main");
  if (verifiedBranch.protected !== true) {
    throw new Error("POST_WRITE_BRANCH_NOT_PROTECTED");
  }
  log("TAD_MAIN_PROTECTION_VERIFIED: admin enforcement, reviews, strict app-pinned Summary");
  return { applied: true, sha };
}

module.exports = {
  BASE, GITHUB_ACTIONS_APP_ID, CHECK_NAME,
  protectionPayload, assertUnprotected, assertExecutedSummary, assertInstalled, run,
};

if (require.main === module) {
  try {
    if (process.argv.length > 3) throw new Error("UNEXPECTED_ARGUMENTS");
    run({ mode: process.argv.length === 2 ? "--plan" : process.argv[2] });
  } catch (error) {
    console.error("[protect-main] REFUSED (" + error.message + "). No claim of completed protection.");
    process.exitCode = 1;
  }
}
