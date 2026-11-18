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
const dockerfile = fs.readFileSync(path.join(root, "Dockerfile.api"), "utf8");

test("image promotion is manual-only, main-only and tied to current head SHA", () => {
  assert.match(workflow, /^on:\n  workflow_dispatch:\s*$/m);
  assert.doesNotMatch(workflow, /^on:\n\s+(push|pull_request|schedule):/m);
  assert.match(workflow, /github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /github\.repository == 'tadtaxiadvertising\/tad-dooh-platform'/);
  assert.match(workflow, /head\.data\.commit\.sha !== sha|current\.data\.commit\.sha !== sha/);
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

test("nested .env and private-key files cannot enter the Docker context", () => {
  for (const pattern of [
    ".env", ".env.*", "**/.env", "**/.env.*",
    "**/.envrc", "**/.envrc.*", "**/*.pem",
    "**/*.p8", "**/*.p12", "**/*.pfx",
    "**/id_rsa", "**/id_ed25519",
  ]) {
    assert.ok(
      dockerignore.split(/\r?\n/).includes(pattern),
      `Docker context missing exclusion pattern: ${pattern}`,
    );
  }
});
