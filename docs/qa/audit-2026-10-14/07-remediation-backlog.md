# 07 — Remediation Backlog

## Prioritization Framework

| Priority | Criteria |
|----------|----------|
| **P0** | Security incident, data loss, production downtime, compliance violation |
| **P1** | Broken CI gate, untested financial logic, blocked development, major bug |
| **P2** | Degraded DX, missing test coverage (non-financial), performance issue |
| **P3** | Cosmetic, nice-to-have, technical debt without immediate impact |

## Backlog Items

### Sprint 1 (Immediate — This Week)

| ID | Finding | Task | Acceptance Criteria | Effort | Dependencies |
|----|---------|------|---------------------|--------|--------------|
| **RB-01** | TAD-QA-001 | **Rotate ALL exposed secrets**<br>1. Supabase: Regenerate service role key, anon key, JWT secret<br>2. Database: Rotate password, update connection strings<br>3. Storage: Rotate S3/R2 access/secret keys<br>4. Email: Rotate SendGrid API key, SMTP password<br>5. Google: Rotate service account key<br>6. Simulator: Rotate `SIMULATOR_API_KEY`<br>7. JWT: Rotate `JWT_SECRET`, `REFRESH_TOKEN_EXPIRES_IN`<br>8. Update EasyPanel env vars, GitHub Secrets | - All rotated secrets working in staging<br>- No `.env` files in git (`git check-ignore apps/api/.env` passes)<br>- TruffleHog scan clean on full history<br>- No P0 security findings remain | 8h | None (do first) |
| **RB-02** | TAD-QA-001 | **Add `.env` to `.gitignore`** (root + per-app)<br>Add pre-commit hook (husky) to block `.env` commits | - `git status` shows no `.env` files<br>- `git check-ignore apps/api/.env` returns path<br>- Commit with `.env` rejected by hook | 1h | RB-01 |
| **RB-03** | TAD-QA-002 | **Fix ESLint v9 migration**<br>1. Create `eslint.config.js` in `apps/admin`, `apps/advertiser`, `apps/driver`, `apps/agents-orchestrator`<br>2. Use shared config or extend `eslint-config-next`/`eslint-config-prettier`<br>3. Pin ESLint 9 in all workspaces<br>4. Fix `next lint` interactive prompt: `next lint --max-warnings=0`<br>5. Fix API lint timeout: restrict patterns, add `--cache` | - `pnpm lint` exits 0 in < 60s<br>- CI `format` job passes<br>- Zero errors/warnings with `--max-warnings 0` | 8h | None |
| **RB-04** | TAD-QA-003, TAD-QA-007 | **Fix API unit tests**<br>1. Add `@types/jest` to `apps/api/package.json` devDependencies<br>2. Add `"types": ["jest", "node"]` to `apps/api/tsconfig.json`<br>3. Fix `verified-metrics` mocks (18 TS errors)<br>4. Fix `qr-scan` mocks + return types (16 TS errors)<br>5. Fix `conversation` mocks + API mismatches (22 TS errors)<br>6. Fix `commission` import + mocks (19 TS errors) | - `cd apps/api && pnpm test` → 9/9 PASS<br>- Coverage ≥ 80% on commission, verified-metrics, payments<br>- CI `test` job passes | 16h | RB-03 (lint must pass first) |
| **RB-05** | TAD-QA-008 | **Fix impact-calculator ts-jest warnings**<br>Add `transformIgnorePatterns: ['<rootDir>/packages/impact-calculator/dist/']` to API Jest config | - No ts-jest warnings about `.js` files<br>- Test output clean | 1h | RB-04 |

### Sprint 2 (Short-term — Next 2 Weeks)

| ID | Finding | Task | Acceptance Criteria | Effort | Dependencies |
|----|---------|------|---------------------|--------|--------------|
| **RB-06** | TAD-QA-004 | **Provision test database for CI**<br>Option A: Supabase Local (`supabase start`) in CI<br>Option B: Testcontainers PostgreSQL<br>Option C: Staging Supabase project (dedicated)<br>Add `DATABASE_URL` to GitHub Secrets | - `npx prisma validate` passes in CI<br>- `npx prisma generate` passes in CI<br>- Integration tests can run (future) | 16h | RB-01 (secrets rotated) |
| **RB-07** | TAD-QA-006 | **Create preview deployment for E2E**<br>1. GitHub Actions: Deploy PR preview to EasyPanel (or Vercel/Netlify for frontends)<br>2. Supabase Preview Branches or local Supabase for test DB<br>3. Update Playwright config to use preview URLs via env vars<br>4. Remove hardcoded production URLs from test files<br>5. Add test data factory + cleanup | - `pnpm test:e2e` runs against `localhost` or preview URLs<br>- Tests create/clean own data<br>- CI runs E2E on every PR<br>- Zero production URLs in test code | 24h | RB-06 (test DB) |
| **RB-08** | TAD-QA-005 | **Optimize Docker builds**<br>1. Add comprehensive `.dockerignore` (node_modules, .git, docs, tests, scratch, .artifacts, *.md)<br>2. Create shared base image for common deps<br>3. Use multi-stage builds with layer caching<br>4. Consider Turborepo for monorepo build orchestration | - `docker build -f Dockerfile.api` < 10 min<br>- All 5 images build in CI < 20 min total<br>- Local builds complete | 16h | None |
| **RB-09** | TAD-QA-009 | **Pin Node 22 everywhere**<br>1. Add `"engines": { "node": "22.x", "pnpm": "9.x" }` to root `package.json`<br>2. Update CI workflow: `NODE_VERSION: "22"`<br>3. Verify all Dockerfiles use `node:22-alpine`<br>4. Document in README | - CI uses Node 22<br>- Docker uses Node 22<br>- `pnpm install` warns on wrong version<br>- No deprecation warnings | 4h | None |
| **RB-10** | TAD-QA-010 | **Add healthchecks to Remotion/Simulator**<br>1. Add `/health` endpoint to `tad-remotion` Express app<br>2. Add HEALTHCHECK to `Dockerfile.remotion` and `Dockerfile.simulator`<br>3. Add healthchecks to `docker-compose.remotion.yml` | - `docker run tad-remotion:test` healthcheck passes<br>- Compose services show healthy<br>- EasyPanel can detect unhealthy containers | 4h | None |
| **RB-11** | TAD-QA-011 | **Fix API lint timeout**<br>1. Restrict pattern to `src/**/*.ts`<br>2. Add `--cache` flag<br>3. Create `eslint.config.js` with proper ignores | - `cd apps/api && pnpm lint` < 60s<br>- CI `format` job passes | 2h | RB-03 |

### Sprint 3 (Medium-term — Next Month)

| ID | Finding | Task | Acceptance Criteria | Effort | Dependencies |
|----|---------|------|---------------------|--------|--------------|
| **RB-12** | TAD-QA-013 | **Add frontend unit tests**<br>1. Add Vitest to `apps/admin`, `apps/advertiser`, `apps/driver`, `apps/player`<br>2. Test critical logic: planner calculations, wallet V12 formulas, offline queue, auth guards<br>3. Target ≥ 60% coverage on business logic files | - `pnpm test` in each frontend runs unit tests<br>- Critical business logic covered<br>- CI runs frontend unit tests | 24h | RB-03 |
| **RB-13** | TAD-QA-014 | **Add Player (tablet) E2E tests**<br>1. Create tests using `cross-player-kiosk` Playwright project<br>2. Test: Asset download → offline playback → telemetry queue → sync on reconnect<br>3. Test: Service Worker precache, update flow, cache eviction<br>4. Test: Chromium kiosk mode behavior | - ≥ 5 critical player flows covered<br>- Tests run in CI<br>- Offline/sync scenarios verified | 24h | RB-07 (preview env) |
| **RB-14** | TAD-QA-015 | **Harden CI security gate**<br>1. Make `security` job fail on high/critical vulns<br>2. Make TruffleHog fail on secrets (not just warn)<br>3. Add `dependabot.yml` for weekly PRs<br>4. Add required status checks on main branch | - PR with vulnerable dep fails CI<br>- PR with secret fails CI<br>- Dependabot PRs appear weekly | 8h | RB-03 |
| **RB-15** | TAD-QA-016 | **Configure Dependabot**<br>Add `.github/dependabot.yml` for npm, GitHub Actions, Docker | - Weekly grouped PRs for dependencies<br>- Auto-merge for patch/minor with passing CI | 2h | RB-14 |

### Sprint 4+ (Longer-term)

| ID | Finding | Task | Acceptance Criteria | Effort |
|----|---------|------|---------------------|--------|
| **RB-16** | TR-05 | **Adopt Turborepo** for incremental builds, remote caching | Monorepo build < 5 min; cache hit rate > 80% | 40h |
| **RB-17** | TR-14 | **Supabase capacity planning** — migrate to Pro tier, archive old telemetry | DB < 80% capacity; retention policy automated | 16h |
| **RB-18** | BR-07 | **Load testing with tad-simulator** — 10× baseline | Identify bottlenecks; optimize batch sync; document limits | 24h |
| **RB-19** | FR-03, FR-04 | **Migrate financial Float → Decimal/BigInt** | Payroll, Invoice use precise types; migration tested | 40h |
| **RB-20** | — | **API integration tests** with real DB (Testcontainers) | Critical paths covered; run in CI | 40h |

---

## Dependency Graph

```
RB-01 (secrets) ──────┬──→ RB-02 (gitignore)
                      ├──→ RB-06 (test DB)
                      └──→ RB-14 (security gate)

RB-03 (ESLint) ───────┬──→ RB-04 (API tests)
                      ├──→ RB-05 (impact-calculator)
                      └──→ RB-11 (API lint timeout)

RB-04 (API tests) ────┴──→ RB-12 (frontend unit tests)

RB-06 (test DB) ────────→ RB-07 (preview E2E) ──────→ RB-13 (Player E2E)

RB-08 (Docker) ─────────→ RB-10 (healthchecks)
RB-09 (Node 22) ────────┘
```

---

## Definition of Done (Per Task)

- [ ] Code changed and committed
- [ ] All relevant tests pass (unit, integration, E2E as applicable)
- [ ] CI pipeline passes (lint, typecheck, test, build, security)
- [ ] No secrets in diff
- [ ] Documentation updated if user-facing change
- [ ] Peer review approved (for P0/P1)
- [ ] Deployed to staging and verified

---

## Tracking

| Sprint | Committed | Completed | Carried Over |
|--------|-----------|-----------|--------------|
| 1 | 5 | 0 | 5 |
| 2 | 6 | 0 | 6 |
| 3 | 4 | 0 | 4 |
| 4+ | 5 | 0 | 5 |

**Total: 20 items**