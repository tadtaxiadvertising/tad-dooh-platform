"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const workflow = fs.readFileSync(
  path.join(root, ".github/workflows/publish-audited-api-image.yml"),
  "utf8",
);
const dockerignore = fs.readFileSync(path.join(root, ".dockerignore"), "utf8");
const apiDockerignore = fs.readFileSync(
  path.join(root, "Dockerfile.api.dockerignore"),
  "utf8",
);
const dockerfile = fs.readFileSync(path.join(root, "Dockerfile.api"), "utf8");

test("image promotion is manual-only, main-only and tied to current head SHA", () => {
  assert.match(workflow, /^on:\n  workflow_dispatch:\s*$/m);
  assert.doesNotMatch(workflow, /^on:\n\s+(push|pull_request|schedule):/m);
  assert.match(workflow, /github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /github\.repository == 'tadtaxiadvertising\/tad-dooh-platform'/);
  assert.match(workflow, /head\.data\.commit\.sha !== sha|current\.data\.commit\.sha !== sha/);
});

test("GHCR publisher refuses unprotected main before registry login or image build", () => {
  const headCheck = workflow.indexOf("current.data.commit.sha !== sha");
  const protectionCheck = workflow.indexOf("current.data.protected !== true");
  const dockerSetup = workflow.indexOf("- name: Set up Docker Buildx");
  assert.ok(headCheck >= 0 && protectionCheck > headCheck);
  assert.ok(dockerSetup > protectionCheck, "Release protection must precede Docker steps");
  assert.match(workflow, /enforcedChecks\?\.enforcement_level !== 'on'/);
  assert.match(workflow, /!Array\.isArray\(enforcedChecks\.checks\)/);
  assert.match(workflow, /check\.context === 'Summary'/);
  assert.match(workflow, /check\.app_id === 15368/);
  assert.match(workflow, /REFUSED: main branch protection is not active/);
  assert.match(workflow, /REFUSED: app-pinned Summary is not enforced/);
});

test("publication requires executed and successful exact-SHA CI, not a green-looking label", () => {
  assert.match(workflow, /head_sha: sha, event: 'push'/);
  assert.match(workflow, /run\.head_sha === sha/);
  assert.match(workflow, /run\.path === trustedPaths\[name\]/);
  assert.match(workflow, /\.github\/workflows\/ci\.yml/);
  assert.match(workflow, /\.github\/workflows\/docker-image\.yml/);
  assert.match(workflow, /run\.head_branch === 'main'/);
  assert.match(workflow, /latest\.conclusion !== 'success'/);
  assert.match(workflow, /'CI Quality Gates'/);
  assert.match(workflow, /'Docker Image CI'/);
  for (const required of [
    "'Tests':", "'TypeScript Check':", "'Prisma Validation':",
    "'Security Audit':", "'Format & Lint':",
    "'Build Docker Image (api)':", "'Summary':",
    "'Run API tests'", "'TypeScript check (all workspaces)'",
    "'Prisma validate schema'", "'Build canonical Docker image'",
  ]) {
    assert.ok(workflow.includes(required), `Missing promotion gate: ${required}`);
  }
  assert.match(workflow, /job\.runner_id <= 0/);
  assert.match(workflow, /job\.steps\.length === 0/);
  assert.match(workflow, /step\.status !== 'completed'/);
  assert.match(workflow, /step\.conclusion !== 'success'/);
  assert.match(workflow, /!step\.started_at/);
});

test("image publishing uses registry-only token, never app secret or build argument", () => {
  assert.match(workflow, /packages: write/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /docker\/login-action@v3/);
  assert.match(workflow, /docker\/build-push-action@v6/);
  assert.match(workflow, /file: \.\/Dockerfile\.api/);
  assert.match(workflow, /push: true/);
  assert.doesNotMatch(workflow, /build-args:|secret-envs:|secret-files:/i);
  assert.doesNotMatch(workflow, /SUPABASE_SERVICE_ROLE_KEY|DIRECT_URL|DATABASE_URL|JWT_SECRET|BREVO_API_KEY|SMTP_PASSWORD/);
  assert.doesNotMatch(dockerfile, /^\s*(?:ARG|ENV)\s+(?:JWT_SECRET|DATABASE_URL|DIRECT_URL|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_JWT_SECRET|SMTP_PASSWORD)(?:\s|=)/mi);
});

test("promotion emits immutable digest; it never deploys or changes runtime config", () => {
  assert.match(workflow, /steps\.build\.outputs\.digest/);
  assert.match(workflow, /sha256:\[0-9a-f\]\{64\}/);
  assert.match(workflow, /ghcr\.io\/tadtaxiadvertising\/tad-dooh-platform-api@/);
  assert.doesNotMatch(workflow, /railway\/deploy|easypanel\/deploy|docker stack deploy|kubectl apply/);
});

test("root and API Docker build contexts exclude nested credentials and agent attachments", () => {
  // Dockerfile.api.dockerignore TAKES PRECEDENCE over the root .dockerignore
  // when Dockerfile.api is selected; checking only the root is insufficient.
  assert.match(dockerfile, /^COPY \. \.$/m);
  for (const [name, content] of [
    [".dockerignore", dockerignore],
    ["Dockerfile.api.dockerignore", apiDockerignore],
  ]) {
    const lines = content.split(/\r?\n/);
    for (const pattern of [
      ".env", ".env.*", "**/.env", "**/.env.*",
      "**/.envrc", "**/.envrc.*", "**/*.pem",
      "**/*.p8", "**/*.p12", "**/*.pfx",
      "**/id_rsa", "**/id_ed25519",
      ".hermes", "**/.hermes",
      "client_secret*.json", "**/client_secret*.json",
    ]) {
      assert.ok(
        lines.includes(pattern),
        `${name} missing Docker context exclusion: ${pattern}`,
      );
    }
  }
});


const protection = require("./protect-main-branch.cjs");

function stubProtectionApi(options = {}) {
  const sha = "a".repeat(40);
  const calls = [];
  let installed = false;
  let branchReads = 0;
  const getBranch = () => ({
    name: "main",
    protected: installed || options.alreadyProtected === true,
    commit: { sha: options.moveMainOnSecondRead && ++branchReads === 2 ? "b".repeat(40) : sha },
  });
  const summary = options.summary || {
    name: "Summary",
    app: { slug: "github-actions", id: 15368 },
    started_at: "2026-11-21T22:00:00Z",
    status: "completed",
    conclusion: "success",
  };
  function api(method, route, payload) {
    calls.push({ method, route, payload });
    if (route === protection.BASE + "/branches/main" && method === "GET") {
      return getBranch();
    }
    if (route === protection.BASE + "/rulesets" && method === "GET") {
      return options.rules || [];
    }
    if (route.includes("/check-runs?") && method === "GET") {
      return { check_runs: [summary] };
    }
    if (route === protection.BASE + "/branches/main/protection" && method === "PUT") {
      installed = true;
      return {};
    }
    if (route === protection.BASE + "/branches/main/protection" && method === "GET") {
      const wanted = protection.protectionPayload();
      return {
        required_status_checks: wanted.required_status_checks,
        enforce_admins: { enabled: options.incompletePostCheck ? false : true },
        required_pull_request_reviews: wanted.required_pull_request_reviews,
        required_conversation_resolution: { enabled: true },
        allow_force_pushes: { enabled: false },
        allow_deletions: { enabled: false },
      };
    }
    throw new Error("Unexpected test API call: " + method + " " + route);
  }
  return { api, calls, sha };
}

test("main protection plan is read-only, app-pinned and matches CI Summary contract", () => {
  const fixture = stubProtectionApi();
  const logs = [];
  const result = protection.run({
    mode: "--plan",
    env: {},
    api: fixture.api,
    log: text => logs.push(text),
  });
  assert.equal(result.applied, false);
  assert.equal(result.sha, fixture.sha);
  assert.ok(fixture.calls.length >= 3);
  assert.ok(fixture.calls.every(call => call.method === "GET"));
  assert.ok(logs.some(line => line.includes("DRY_RUN_ONLY")));
  const wanted = protection.protectionPayload();
  assert.deepEqual(wanted.required_status_checks.checks, [{ context: "Summary", app_id: 15368 }]);
  assert.deepEqual(wanted.required_status_checks.contexts, ["Summary"]);
  assert.equal(wanted.required_status_checks.strict, true);
  assert.equal(wanted.enforce_admins, true);
  assert.equal(wanted.required_pull_request_reviews.required_approving_review_count, 1);
  assert.equal(wanted.required_pull_request_reviews.dismiss_stale_reviews, true);
  assert.equal(wanted.required_pull_request_reviews.require_last_push_approval, true);
  assert.equal(wanted.allow_force_pushes, false);
  assert.equal(wanted.allow_deletions, false);
  assert.equal(wanted.required_conversation_resolution, true);

  const ci = fs.readFileSync(path.join(root, ".github/workflows/ci.yml"), "utf8");
  assert.match(ci, /summary:\n    name: Summary/);
  assert.match(ci, /needs: \[format, typecheck, test, prisma, security, build\]/);
  assert.match(ci, /if: always\(\)/);
  assert.match(ci, /\$BUILD_RESULT" != "success"/);
});

test("main protection applies only with independent explicit admin approval", () => {
  const fixture = stubProtectionApi();
  assert.throws(() => protection.run({
    mode: "--apply", env: {}, api: fixture.api, log: () => {},
  }), /EXPLICIT_ADMIN_APPROVAL_REQUIRED/);
  assert.equal(fixture.calls.length, 0);
  assert.throws(() => protection.run({
    mode: "--force", env: {}, api: fixture.api, log: () => {},
  }), /UNKNOWN_MODE/);
  assert.equal(fixture.calls.length, 0);
});

test("main protection refuses to overwrite protected branches or rulesets", () => {
  for (const option of [{ alreadyProtected: true }, { rules: [{ id: 42, enforcement: "active" }] }]) {
    const fixture = stubProtectionApi(option);
    assert.throws(() => protection.run({
      mode: "--apply",
      env: { TAD_APPROVE_MAIN_PROTECTION: "YES" },
      api: fixture.api, log: () => {},
    }), /BRANCH_ALREADY_PROTECTED|EXISTING_RULESETS/);
    assert.equal(fixture.calls.some(c => c.method === "PUT"), false);
  }
});

test("main protection rejects incomplete, failed or impersonated required Summary", () => {
  const base = {
    name: "Summary", app: { slug: "github-actions", id: 15368 },
    status: "completed", conclusion: "success",
  };
  for (const summary of [
    { ...base, conclusion: "failure" },
    { ...base, status: "in_progress", conclusion: null },
    { ...base, app: { slug: "untrusted-app", id: 3 } },
    { ...base, app: { slug: "github-actions", id: 4 } },
    { ...base, name: "Other Job" },
  ]) {
    const fixture = stubProtectionApi({ summary });
    assert.throws(() => protection.run({
      mode: "--apply",
      env: { TAD_APPROVE_MAIN_PROTECTION: "YES" },
      api: fixture.api, log: () => {},
    }), /MAIN_SUMMARY_NOT_EXECUTED_AND_GREEN/);
    assert.equal(fixture.calls.some(c => c.method === "PUT"), false);
  }
});

test("main protection refuses moving branch before writing settings", () => {
  const fixture = stubProtectionApi({ moveMainOnSecondRead: true });
  assert.throws(() => protection.run({
    mode: "--apply",
    env: { TAD_APPROVE_MAIN_PROTECTION: "YES" },
    api: fixture.api, log: () => {},
  }), /MAIN_MOVED_DURING_PREFLIGHT/);
  assert.equal(fixture.calls.some(c => c.method === "PUT"), false);
});

test("main protection verifies all safeguards after applying, not just a successful API PUT", () => {
  const bad = stubProtectionApi({ incompletePostCheck: true });
  assert.throws(() => protection.run({
    mode: "--apply",
    env: { TAD_APPROVE_MAIN_PROTECTION: "YES" },
    api: bad.api, log: () => {},
  }), /POST_WRITE_PROTECTION_INCOMPLETE/);
  assert.equal(bad.calls.filter(c => c.method === "PUT").length, 1);

  // The GitHub API response must include a real nonzero review count;
  // missing (undefined) count must never be accepted as a protected branch.
  const desired = protection.protectionPayload();
  const missingReviewCount = {
    required_status_checks: desired.required_status_checks,
    enforce_admins: { enabled: true },
    required_pull_request_reviews: {
      ...desired.required_pull_request_reviews,
      required_approving_review_count: undefined,
    },
    required_conversation_resolution: { enabled: true },
    allow_force_pushes: { enabled: false },
    allow_deletions: { enabled: false },
  };
  assert.throws(
    () => protection.assertInstalled(missingReviewCount),
    /POST_WRITE_PROTECTION_INCOMPLETE/,
  );

  const fixture = stubProtectionApi();
  const messages = [];
  const result = protection.run({
    mode: "--apply",
    env: { TAD_APPROVE_MAIN_PROTECTION: "YES" },
    api: fixture.api, log: message => messages.push(message),
  });
  assert.equal(result.applied, true);
  const puts = fixture.calls.filter(c => c.method === "PUT");
  assert.equal(puts.length, 1);
  assert.equal(puts[0].route, protection.BASE + "/branches/main/protection");
  assert.deepEqual(puts[0].payload, protection.protectionPayload());
  assert.ok(messages.some(m => m.includes("TAD_MAIN_PROTECTION_VERIFIED")));
});
