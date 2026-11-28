#!/usr/bin/env node
"use strict";

// Owner-operated P0 #313 control. This file NEVER writes to GitHub unless
// --apply and TAD_APPROVE_MAIN_PROTECTION=YES are both supplied.
// Requires an authenticated GitHub CLI account with repository admin rights.
// This is not an API/database migration, deployment or merge automation.
// --verify audits the original independent-review profile through GET only.
// --verify-solo audits the owner-approved solo profile (#313) through GET only.
// Neither verification mode changes branch settings.

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

function branchSha(branch) {
  if (branch?.name !== "main" ||
      !/^[a-f0-9]{40}$/.test(branch?.commit?.sha || "")) {
    throw new Error("UNEXPECTED_MAIN_BRANCH_IDENTITY");
  }
  return branch.commit.sha;
}

function assertUnprotected(branch, rules) {
  const sha = branchSha(branch);
  if (branch.protected !== false) {
    throw new Error("BRANCH_ALREADY_PROTECTED_REVIEW_EXISTING_RULES");
  }
  // Never overwrite or conflict with preexisting repository rulesets.
  if (!Array.isArray(rules) || rules.length !== 0) {
    throw new Error("EXISTING_RULESETS_REQUIRE_ADMIN_REVIEW");
  }
  return sha;
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

function installedProtectionIssues(config, solo = false) {
  const checks = config?.required_status_checks;
  const approvals = config?.required_pull_request_reviews;
  const rules = [
    [checks?.strict === true, "STRICT_STATUS_CHECKS"],
    [Array.isArray(checks?.checks) && checks.checks.some(c =>
      c?.context === CHECK_NAME && c?.app_id === GITHUB_ACTIONS_APP_ID), "APP_PINNED_SUMMARY"],
    [config?.enforce_admins?.enabled === true, "ADMIN_ENFORCEMENT"],
    [Number.isInteger(approvals?.required_approving_review_count) &&
      (solo ? approvals.required_approving_review_count === 0 :
        approvals.required_approving_review_count >= 1), "REQUIRED_PR_REVIEWS"],
    [approvals?.dismiss_stale_reviews === true, "STALE_REVIEW_DISMISSAL"],
    [approvals?.require_last_push_approval === !solo, "LAST_PUSH_APPROVAL"],
    ...(solo ? [[approvals?.require_code_owner_reviews === false, "SOLO_CODE_OWNER_REVIEWS"]] : []),
    [config?.required_conversation_resolution?.enabled === true, "CONVERSATION_RESOLUTION"],
    [config?.allow_force_pushes?.enabled === false, "FORCE_PUSHES_DISABLED"],
    [config?.allow_deletions?.enabled === false, "DELETIONS_DISABLED"],
  ];
  return rules.filter(([passed]) => !passed).map(([, name]) => name);
}

function assertInstalled(config) {
  if (installedProtectionIssues(config).length > 0) {
    throw new Error("POST_WRITE_PROTECTION_INCOMPLETE_MANUAL_REVIEW_REQUIRED");
  }
}

function run({ mode = "--plan", env = process.env, api = ghApi, log = console.log } = {}) {
  if (!["--plan", "--apply", "--verify", "--verify-solo"].includes(mode)) throw new Error("UNKNOWN_MODE");
  if (mode === "--apply" && env.TAD_APPROVE_MAIN_PROTECTION !== "YES") {
    throw new Error("EXPLICIT_ADMIN_APPROVAL_REQUIRED");
  }

  const branch = api("GET", BASE + "/branches/main");
  if (mode === "--verify" || mode === "--verify-solo") {
    const solo = mode === "--verify-solo";
    const sha = branchSha(branch);
    if (branch.protected !== true) throw new Error("MAIN_NOT_PROTECTED");
    const issues = installedProtectionIssues(api("GET", BASE + "/branches/main/protection"), solo);
    if (issues.length > 0) {
      throw new Error("EXISTING_PROTECTION_INCOMPLETE:" + issues.join(","));
    }
    assertExecutedSummary(api("GET", BASE + "/commits/" + sha + "/check-runs?per_page=100"));
    const fresh = api("GET", BASE + "/branches/main");
    if (branchSha(fresh) !== sha || fresh.protected !== true) {
      throw new Error("MAIN_MOVED_DURING_VERIFICATION");
    }
    log("TAD_MAIN_PROTECTION_READ_ONLY_VERIFIED: profile=" + (solo ? "solo" : "independent-review") + "; required settings and same-SHA Summary green; no settings changed");
    return { verified: true, sha };
  }
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
