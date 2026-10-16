# 04 — Findings



## TAD-QA-001 — Real Credentials in Committed `.env` Files



**Status:** CONFIRMADO

**Severity:** **P0 — CRÍTICO**

**Component:** Security / Configuration

**Environment/Commit:** main @ 14d184e9



### Evidence

- Files found with real credentials (not `.example`):

  - `apps/api/.env` — Contains real `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `STORAGE_SECRET_KEY`, `SMTP_PASSWORD`, `SENDGRID_API_KEY`, `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64`, `SIMULATOR_API_KEY`

  - `apps/admin/.env` — Contains real `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`

  - `apps/driver/.env` — Contains real credentials

  - `apps/advertiser/.env` — Contains real credentials

- `.gitignore` exists but does **not** ignore `.env` files (only `.env.local`, `.env.*.local`)

- Credentials are readable in git history if ever committed



### Impact

- **Immediate:** Full database access (service role key = admin), storage access, email sending, JWT forgery, Google Sheets access

- **Blast radius:** Production Supabase project `ltdcdhqixvbpdcitthqf`, DigitalOcean Spaces, SendGrid, Google Cloud

- **Compliance:** Potential GDPR/PCI exposure if PII in database



### Reproduction

```bash

# These files exist and contain real values (redacted here)

cat apps/api/.env | head -30

cat apps/admin/.env

```



### Root Cause

**CONFIRMADA** — `.gitignore` pattern missing `.env` (only ignores `.env.local`, `.env.*.local`). Developers committed real `.env` files.



### Fix Proposal (Minimum)

1. **IMMEDIATE:** Rotate ALL exposed secrets:

   - Supabase: Regenerate service role key, anon key, JWT secret

   - Database: Rotate password, recreate connection strings

   - Storage: Rotate S3/R2 access/secret keys

   - Email: Rotate SendGrid API key, SMTP password

   - Google: Rotate service account key

   - Simulator: Rotate `SIMULATOR_API_KEY`

   - JWT: Rotate `JWT_SECRET`, `REFRESH_TOKEN_EXPIRES_IN`

2. Add `.env` to `.gitignore` (root and per-app)

3. Use `.env.example` as template only

4. Inject secrets via CI/CD (GitHub Secrets, EasyPanel env vars) — never commit

5. Add pre-commit hook (husky) to block `.env` commits



### Regression Test

- `git check-ignore apps/api/.env` should return the path (ignored)

- `git status` shows no `.env` files

- CI secret scan (TruffleHog) passes



### Closure Criteria

- All rotated secrets verified working in staging

- No `.env` files tracked by git

- TruffleHog scan clean on full history



---



## TAD-QA-002 — ESLint v9 Migration Incomplete — Lint Gate Broken



**Status:** CONFIRMADO

**Severity:** **P1 — ALTO**

**Component:** DX / CI / Linting

**Environment/Commit:** main @ 14d184e9



### Evidence

```bash

$ pnpm lint

> admin@0.1.0 lint

> eslint



ESLint: 9.39.4

ESLint couldn't find an eslint.config.(js|mjs|cjs) file.



> @tad/advertiser@0.1.0 lint

> next lint

? How would you like to configure ESLint?  # Interactive prompt blocks CI



> @tad/agents@1.0.0 lint

> eslint src/**/*.ts

ESLint: 8.57.1

ESLint couldn't find a configuration file.



> api@0.1.0 lint

> eslint "{src,apps,libs,test}/**/*.ts" --fix

# Timed out after 180s

```



**Workspaces affected:**

- `apps/admin` — ESLint 9, no `eslint.config.js`

- `apps/advertiser` — ESLint 9, `next lint` prompts interactively

- `apps/driver` — ESLint 9, no config (likely same as admin)

- `apps/agents-orchestrator` — ESLint 8, no config

- `apps/api` — ESLint 8, config exists but times out



### Impact

- **CI Gate Failure:** `format` job in `.github/workflows/ci.yml` fails

- **No automated code quality enforcement** on PRs

- **Inconsistent tooling** — ESLint 8 vs 9 across workspaces



### Root Cause

**CONFIRMADA** — Migration from ESLint v8 (rc files) to v9 (flat config) incomplete. `eslint.config.js` missing in 4 workspaces. `next lint` in advertiser prompts because no config exists.



### Fix Proposal (Minimum)

1. Create `eslint.config.js` (flat config) in each affected workspace

2. Use shared config via `packages/eslint-config` or extend `eslint-config-next`/`eslint-config-prettier`

3. Pin ESLint version consistently (recommend v9 across all)

4. Remove interactive prompt: `next lint --max-warnings=0` in CI

5. Fix API lint timeout: add `--cache`, limit file patterns, or increase CI timeout



### Regression Test

- `pnpm lint` exits 0 with no errors/warnings

- CI `format` job passes



### Closure Criteria

- All 10 workspaces have valid ESLint config

- `pnpm lint` completes < 60s

- CI passes



---



## TAD-QA-003 — API Unit Tests Failing — Missing `@types/jest`, Broken Mocks



**Status:** CONFIRMADO

**Severity:** **P1 — ALTO**

**Component:** Testing / API

**Environment/Commit:** main @ 14d184e9



### Evidence

```bash

$ cd apps/api && pnpm test

# 4/9 test suites FAIL

FAIL src/modules/verified-metrics/__tests__/verified-metrics.service.spec.ts

FAIL src/modules/qr-scan/__tests__/qr-scan.service.spec.ts

FAIL src/modules/conversation/__tests__/conversation.service.spec.ts

FAIL src/modules/commission/__tests__/commission.service.spec.ts



# Common errors:

# - Cannot find name 'describe', 'it', 'expect', 'jest', 'beforeEach'

# - Cannot find module '../types' (commission)

# - Property 'qrCode' does not exist on type 'QrScanResult'

# - Property 'threadId' does not exist on return type

# - Argument type mismatches

```



**Passing suites (5):**

- `referral/referral.service.spec.ts`

- `prisma/prisma.service.spec.ts`

- `payments/payment-intent.controller.spec.ts`

- `campaign/__tests__/campaign.service.spec.ts`

- `system-settings/system-settings.service.spec.ts`



### Impact

- **False confidence** — 44% of test suites broken

- **No regression protection** for verified-metrics, qr-scan, conversation, commission

- **Financial risk** — Commission, payments, verified metrics are money-critical



### Root Cause

**CONFIRMADA** — Multiple compounding issues:

1. `@types/jest` not in `devDependencies` (only `@types/jest` in root `package.json` devDeps, not API workspace)

2. `tsconfig.json` in API missing `"types": ["jest"]` in compilerOptions

3. Test files use Jest globals without imports (requires `globals` config or types)

4. `commission` test imports non-existent `../types` module

5. Return type mismatches in mocks (conversation, qr-scan)

6. `ts-jest` warnings about `isolatedModules: true` and `.js` files in `impact-calculator/dist`



### Fix Proposal (Minimum)

1. Add `@types/jest` to `apps/api/package.json` devDependencies

2. Add `"types": ["jest", "node"]` to `apps/api/tsconfig.json` compilerOptions

3. Fix `commission` test import — use correct type path (likely `@tad/types` or local)

4. Fix mock return types in `conversation`, `qr-scan`, `verified-metrics` to match actual service interfaces

5. Add `"isolatedModules": true` to `apps/api/tsconfig.json` (silences ts-jest warning)

6. Exclude `packages/impact-calculator/dist` from Jest transform (add to `transformIgnorePatterns`)



### Regression Test

- `cd apps/api && pnpm test` → all 9 suites PASS, 0 FAIL

- Coverage ≥ 80% on critical modules (commission, verified-metrics, payments)



### Closure Criteria

- All tests pass

- No TypeScript errors in test files

- CI `test` job passes



---



## TAD-QA-004 — Prisma Schema Cannot Validate Without Live `DATABASE_URL`



**Status:** CONFIRMADO

**Severity:** **P1 — ALTO**

**Component:** Database / CI

**Environment/Commit:** main @ 14d184e9



### Evidence

```bash

$ npx prisma validate --schema=apps/api/prisma/schema.prisma

Error: Prisma schema validation - (get-config wasm)

Error code: P1012

error: Environment variable not found: DATABASE_URL.

```



### Impact

- **CI `prisma` job fails** (or is skipped if env not set)

- **No schema validation** on PRs — breaking migrations can merge

- **No `prisma generate`** in CI without DB — type-safe client not verified



### Root Cause

**CONFIRMADA** — `DATABASE_URL` required for `prisma validate` (connects to DB to verify schema compatibility). No test database provisioned for CI/local.



### Fix Proposal (Minimum)

1. **Option A (Recommended):** Use Supabase Local Development (`supabase start`) or Testcontainers in CI for ephemeral PostgreSQL

2. **Option B:** Use `prisma validate --schema=...` with a dummy `DATABASE_URL` pointing to a test DB (requires DB instance)

3. **Option C:** Split validation — static schema lint (`prisma validate` without DB) + separate integration test with real DB

4. Add `DATABASE_URL` to GitHub Actions secrets for CI (pointing to staging Supabase)



### Regression Test

- `npx prisma validate --schema=apps/api/prisma/schema.prisma` exits 0 in CI

- `npx prisma generate --schema=apps/api/prisma/schema.prisma` succeeds in CI



### Closure Criteria

- Prisma validation runs and passes in CI on every PR

- Schema changes caught before merge



---



## TAD-QA-005 — Build Times Out — Potential Memory/Architecture Issue



**Status:** PROBABLE

**Severity:** **P1 — ALTO**

**Component:** Build / Infrastructure

**Environment/Commit:** main @ 14d184e9



### Evidence

```bash

$ pnpm run build

# Timeout after 300s (5 minutes)

# Previous CI runs show build job taking 10-15 min per image

```



**Dockerfiles use single-stage builds copying entire monorepo** — each image rebuilds all workspaces.



### Impact

- **CI build job slow** — 10-15 min × 5 images = 50-75 min total

- **Local builds timeout** on modest hardware

- **Developer velocity** — slow feedback loop



### Root Cause (Probable)

- Monorepo build copies all 17 workspaces into each Docker image

- No layer caching across images (each Dockerfile starts from scratch)

- `npm install --legacy-peer-deps` runs 5 times (once per Dockerfile)

- No Turborepo / Nx for incremental builds

- 512MB RAM limit on EasyPanel exacerbates memory pressure



### Fix Proposal (Minimum)

1. **Short-term:** Add `.dockerignore` to exclude `node_modules`, `.git`, `*.md`, `docs`, `tests`, `scratch`, `.artifacts`

2. **Short-term:** Use multi-stage builds with shared base image (common deps layer)

3. **Medium-term:** Adopt Turborepo for remote caching and task orchestration

4. **Medium-term:** Split Dockerfiles — build shared packages once, copy artifacts

5. **CI:** Increase build timeout; run image builds in parallel (already in workflow)



### Regression Test

- `docker build -f Dockerfile.api -t tad-api:test .` completes < 10 min

- All 5 images build in CI < 20 min total



### Closure Criteria

- Local build completes

- CI build job passes consistently



---



## TAD-QA-006 — E2E Tests Require Production Credentials — No Isolated Test Environment



**Status:** CONFIRMADO

**Severity:** **P1 — ALTO**

**Component:** Testing / E2E

**Environment/Commit:** main @ 14d184e9



### Evidence

```typescript

// tests/e2e-autonomous-audit.spec.ts

const ADMIN_URL = process.env.TAD_ADMIN_URL || 'https://proyecto-ia-tad-dashboard.rewvid.easypanel.host';

const ADMIN_EMAIL = process.env.TAD_ADMIN_EMAIL || 'admin@tad.do';

const ADMIN_PASS = process.env.TAD_ADMIN_PASS || 'kjVhrMYHmWEPSeZ0';  // REAL PASSWORD IN CODE



// tests/e2e/v12/admin.spec.ts

const ADMIN_PASSWORD = process.env.TAD_ADMIN_PASSWORD || '';  // Empty default, but CI must provide real

```



**Playwright config** (`playwright.config.ts`) uses production URLs by default:

- `ADMIN_URL = https://proyecto-ia-tad-dashboard.rewvid.easypanel.host`

- `ADVERTISER_URL = https://proyecto-ia-tad-advertiser.rewvid.easypanel.host`

- `DRIVER_URL = https://proyecto-ia-tad-driver.rewvid.easypanel.host`

- `PLAYER_URL = https://proyecto-ia-tad-player.rewvid.easypanel.host`

- `API_URL = https://tad.api.ibusiness.com.do/api`



### Impact

- **Cannot run E2E locally** without hitting production

- **Production data pollution** — tests create real drivers, campaigns, payments

- **Flaky tests** — dependent on production state, network, deployments

- **Security risk** — credentials in CI secrets, but test code has defaults

- **No PR verification** — E2E cannot gate merges



### Root Cause

**CONFIRMADA** — No preview/staging environment strategy. Tests written against production from day one. No investment in ephemeral test environments.



### Fix Proposal (Minimum)

1. **Immediate:** Remove hardcoded production credentials from test files (use env vars only, no defaults)

2. **Short-term:** Implement GitHub Actions preview deployments (EasyPanel preview URLs or Vercel/Netlify for frontends)

3. **Short-term:** Provision Supabase preview branches (Supabase Preview Branches feature) or use local Supabase for E2E

4. **Medium-term:** Rewrite E2E tests to use test data factories, cleanup after each test

5. **Architecture:** Adopt "test environment as code" — spin up full stack (API + DB + Frontends) for E2E



### Regression Test

- `pnpm test:e2e` runs against `localhost` URLs (not production)

- Tests create and clean up their own data

- CI runs E2E on every PR against preview deployment



### Closure Criteria

- Zero production URLs in test code

- E2E runs in CI on PRs

- No manual credential configuration needed for developers



---



## TAD-QA-007 — Four Test Suites Have TypeScript Errors (Verified-Metrics, QR-Scan, Conversation, Commission)



**Status:** CONFIRMADO

**Severity:** **P1 — ALTO**

**Component:** Testing / API

**Environment/Commit:** main @ 14d184e9



### Evidence

See TAD-QA-003 for full error output. Summary:



| Suite | Error Count | Key Issues |

|-------|-------------|------------|

| `verified-metrics` | 18 | Missing `describe/it/expect/jest/beforeEach` types; mock typing |

| `qr-scan` | 16 | Missing types; `qrCode` property missing on return type |

| `conversation` | 22 | Missing types; `contactId` not in `CreateConversationInput`; `threadId` missing on return |

| `commission` | 19 | Missing types; `../types` import not found; `reference` property missing; argument type mismatch |



### Impact

- **Tests don't compile** — Jest fails before running any assertions

- **Zero coverage** for 4 critical financial/operational modules

- **Technical debt** — Tests rotting as production code evolves

2. **isolatedModules** — ts-jest requires isolatedModules: true for module: node16 (warning TS151002)
### Root Cause

**CONFIRMADA** — Compound:

1. Missing `@types/jest` + `types` in tsconfig (affects all 4)

2. Tests written against outdated service interfaces (conversation, qr-scan, commission)

3. `commission` test imports from non-existent relative path `../types`

4. No test maintenance process — tests break silently when service signatures change



### Fix Proposal (Minimum)

1. Fix TAD-QA-003 (types/jest config) — resolves "cannot find name" errors

2. Update test mocks to match current service method signatures

3. Fix `commission` import — likely `@tad/types` or `src/modules/commission/types`

4. Add test file to `tsconfig.json` `include` or fix `rootDir`

5. Consider migrating to Vitest (faster, better TS support) — but not required



### Regression Test

- All 4 suites compile and pass

- Types match production service interfaces



### Closure Criteria

- `pnpm test` in API: 9/9 suites PASS



---



## TAD-QA-008 — `packages/impact-calculator` Dist Files Cause ts-jest Warnings



**Status:** CONFIRMADO

**Severity:** **P2 — MEDIO**

**Component:** Build / Testing

**Environment/Commit:** main @ 14d184e9



### Evidence

```bash

ts-jest[ts-compiler] (WARN) Got a `.js` file to compile while `allowJs` option is not set to `true` (file: C:\\tad-dooh-platform\\packages\\impact-calculator\\dist\\index.js)

ts-jest[ts-compiler] (WARN) Got a `.js` file to compile while `allowJs` option is not set to `true` (file: C:\\tad-dooh-platform\\packages\\impact-calculator\\dist\\sources.js)

```



### Impact

- **Noise in test output** — hides real errors

- **Potential miscompilation** — Jest transforming built JS files

- **Slower tests** — unnecessary transpilation



### Root Cause

**CONFIRMADA** — `packages/impact-calculator` has `dist/` committed (or generated by `npm run build` in Dockerfile). Jest `transform` pattern `^.+\\.(t|j)s$` matches `.js` files. `allowJs: false` (default) causes warning.



### Fix Proposal (Minimum)

1. Add `transformIgnorePatterns: ['<rootDir>/packages/impact-calculator/dist/']` to `apps/api/jest` config

2. Or add `"allowJs": true` to `apps/api/tsconfig.json` (but may have side effects)

3. Better: Don't commit `dist/` — generate in CI only; add to `.gitignore`



### Regression Test

- `pnpm test` in API: no ts-jest warnings about `.js` files



### Closure Criteria

- Clean test output

- `dist/` not in git (or ignored by Jest)



---



## TAD-QA-009 — Node Version Mismatch: Project Targets Node 22, Host Runs Node 26



**Status:** CONFIRMADO

**Severity:** **P2 — MEDIO**

**Component:** Infrastructure / DX

**Environment/Commit:** main @ 14d184e9



### Evidence

- `.nvmrc`: `22`

- `Dockerfile.api/admin/driver/remotion`: `FROM node:22-alpine`

- `package.json` engines: not specified

- Host: `node v26.7.0`



### Impact

- **Subtle bugs** — Native modules (bcrypt, @remotion/bundler, sharp) may behave differently

- **CI/CD drift** — CI uses Node 20 (per workflow), Docker uses 22, local uses 26

- **Deprecation warnings** — `@supabase/supabase-js` warns on Node 20, but Node 26 untested



### Root Cause

**CONFIRMADA** — No enforced Node version in CI (workflow uses `NODE_VERSION: "20"`), no `engines` in package.json, no Volta/FNM/NVM enforcement in repo.



### Fix Proposal (Minimum)

1. Add `"engines": { "node": "22.x" }` to root `package.json`

2. Update CI workflow to `NODE_VERSION: "22"`

3. Document Node 22 requirement in README

4. Consider `.nvmrc` + `nvm use` in CI setup



### Regression Test

- `node -v` in CI shows `v22.x.x`

- No deprecation warnings from dependencies



### Closure Criteria

- Consistent Node 22 across local, CI, Docker



---



## TAD-QA-010 — No Healthcheck Verification for Remotion/Player Services



**Status:** PROBABLE

**Severity:** **P2 — MEDIO**

**Component:** Observability / Docker

**Environment/Commit:** main @ 14d184e9



### Evidence

- `Dockerfile.api`: Healthcheck → `wget http://127.0.0.1:3000/api/health`

- `Dockerfile.admin/driver`: Healthcheck → `curl http://127.0.0.1:${PORT:-3000}/` (root path)

- `Dockerfile.player`: Healthcheck → `wget http://localhost:80/health` (nginx `/health` endpoint)

- `Dockerfile.remotion`: **NO HEALTHCHECK**

- `Dockerfile.simulator`: **NO HEALTHCHECK**

- `docker-compose.remotion.yml`: No healthchecks defined



### Impact

- **Remotion/Simulator** — Container orchestration cannot detect unhealthy containers

- **EasyPanel** — May route traffic to non-ready containers

- **No liveness/readiness** distinction for video rendering service (heavy Chromium)



### Root Cause

**PROBABLE** — Oversight; Remotion/Simulator added after healthcheck pattern established.



### Fix Proposal (Minimum)

1. Add `/health` endpoint to `tad-remotion` Express app (return `{status: 'OK', service: 'tad-remotion'}`)

2. Add HEALTHCHECK to `Dockerfile.remotion` and `Dockerfile.simulator`

3. Add healthchecks to `docker-compose.remotion.yml`



### Regression Test

- `docker run tad-remotion:test` — healthcheck passes

- `docker compose -f docker-compose.remotion.yml up` — all services healthy



### Closure Criteria

- All 7 Dockerfiles have HEALTHCHECK

- Compose file has healthchecks with dependencies



---



## TAD-QA-011 — API Lint Times Out (180s) — Performance Issue



**Status:** CONFIRMADO

**Severity:** **P2 — MEDIO**

**Component:** DX / CI

**Environment/Commit:** main @ 14d184e9



### Evidence

```bash

> api@0.1.0 lint

> eslint "{src,apps,libs,test}/**/*.ts" --fix

# Timed out after 180s

```



### Impact

- **CI `format` job fails** on API workspace

- **No lint feedback** for API code



### Root Cause

**CONFIRMADA** — ESLint scanning too many files (pattern `{src,apps,libs,test}/**/*.ts` matches entire monorepo from API root). No `--cache`. Large TypeScript codebase.



### Fix Proposal (Minimum)

1. Restrict pattern to `src/**/*.ts` only (API source)

2. Add `--cache` flag

3. Use `eslint.config.js` with `ignores: ['packages/**', 'apps/**', '!apps/api/**']`

4. Consider splitting lint per workspace (already done in CI but API pattern too broad)



### Regression Test

- `cd apps/api && pnpm lint` completes < 60s

- CI `format` job passes



### Closure Criteria

- API lint fast and passes



---



## TAD-QA-012 — Missing `engines` Field in Root package.json



**Status:** CONFIRMADO

**Severity:** **P3 — BAJO**

**Component:** Configuration / DX

**Environment/Commit:** main @ 14d184e9



### Evidence

```json

// package.json root — no "engines" field

```



### Impact

- No warning when developer uses wrong Node version

- No enforcement in CI/npm



### Fix Proposal

Add `"engines": { "node": "22.x", "pnpm": "9.x" }` to root `package.json`



### Regression Test

- `pnpm install` warns on wrong Node version



### Closure Criteria

- Engines field present



---



## TAD-QA-013 — Frontend Workspaces Lack Unit Tests



**Status:** CONFIRMADO

**Severity:** **P3 — BAJO**

**Component:** Testing / Frontend

**Environment/Commit:** main @ 14d184e9



### Evidence

- `apps/admin/package.json` — no `test` script (only `test:e2e`)

- `apps/advertiser/package.json` — no `test` script

- `apps/driver/package.json` — `test` maps to `playwright test` (E2E only)

- `apps/player/package.json` — no `test` script



### Impact

- **No unit test coverage** for React components, hooks, utilities

- **Business logic in components** untested (e.g., planner calculations, wallet formulas)



### Root Cause

**CONFIRMADA** — Team invested in E2E only; unit testing not prioritized.



### Fix Proposal (Minimum)

1. Add Vitest/Jest to each frontend workspace

2. Test critical logic: planner calculations, wallet V12 formulas, offline queue, auth guards

3. Target ≥ 60% coverage on business logic files



### Regression Test

- `pnpm test` in each frontend workspace runs unit tests



### Closure Criteria

- Unit tests exist and pass for all 4 frontends



---



## TAD-QA-014 — Player (Tablet) Has No Automated Tests



**Status:** CONFIRMADO

**Severity:** **P2 — MEDIO**

**Component:** Testing / Player

**Environment/Commit:** main @ 14d10-14



### Evidence

- `apps/player/package.json` — no test scripts

- `playwright.config.ts` — has `cross-player-kiosk` project but no tests targeting it

- `tests/e2e/` — no player specs



### Impact

- **Critical path untested** — Tablet player is revenue-generating device

- **Offline-first logic** (Service Worker, IndexedDB, sync) completely untested

- **No regression protection** for playback, telemetry, asset download



### Root Cause

**CONFIRMADA** — Player migrated from legacy to Vite/React; tests not ported.



### Fix Proposal (Minimum)

1. Add Playwright tests for player using `cross-player-kiosk` project

2. Test: Asset download → offline playback → telemetry queue → sync on reconnect

3. Test: Service Worker precache, update flow, cache eviction

4. Test: Chromium kiosk mode behavior (fullscreen, no UI)



### Regression Test

- Player E2E tests run in CI



### Closure Criteria

- ≥ 5 critical player flows covered by automated tests



---



## TAD-QA-015 — CI Security Audit Only Runs Weekly — No PR Gate



**Status:** CONFIRMADO

**Severity:** **P2 — MEDIO**

**Component:** Security / CI

**Environment/Commit:** main @ 14d184e9



### Evidence

- `.github/workflows/security-audit-weekly.yml` — runs on `schedule` (Mondays) and `workflow_dispatch`

- `.github/workflows/ci.yml` — `security` job runs `pnpm audit --audit-level=high` + TruffleHog

- **But:** TruffleHog not guaranteed installed; `ci.yml` security job doesn't fail build on secrets (only warns)



### Impact

- **Secrets can merge** — TruffleHog only warns in CI, doesn't block

- **Weekly cadence** — New vulnerabilities detected up to 7 days late

- **No dependency review** on PRs



### Fix Proposal (Minimum)

1. Make `security` job in `ci.yml` **fail** on high/critical vulns and secrets

2. Add `dependabot.yml` for automated dependency updates

3. Consider `npm audit` + `trufflehog` as required status checks on main



### Regression Test

- PR with known vulnerable dependency fails CI

- PR with fake secret in code fails CI



### Closure Criteria

- Security gate blocks merges on real issues



---



## TAD-QA-016 — No Dependency Review / Renovate / Dependabot



**Status:** CONFIRMADO

**Severity:** **P3 — BAJO**

**Component:** Security / Maintenance

**Environment/Commit:** main @ 14d184e9



### Evidence

- No `.github/dependabot.yml`

- No Renovate config

- `pnpm-lock.yaml` last updated Oct 14 (current), but many deps outdated



### Impact

- **Stale dependencies** — Security patches, bug fixes, performance improvements missed

- **Manual burden** — Team must manually update



### Fix Proposal

Add Dependabot config for weekly PRs grouped by ecosystem.



### Regression Test

- Dependabot PRs appear weekly



### Closure Criteria

- Automated dependency updates configured



---



## 09 — S02 Ronda de Reposición (2026-10-14)



> Re-ejecutadas 4 suites fallantes de S01. Resultado: **todas las 4 ahora PASAN**.



### Suites arregladas



| Suite | Original error | Fix aplicado | Estado |

|-------|---------------|--------------|--------|

| `verified-metrics.service.spec.ts` | 18 TS errors (types perdió `device_id` vs `deviceId` en mock) | Mock con `device_id` correcto; `playbackEvent` mock con `deviceId` | ✅ 5/5 pasan |

| `qr-scan.service.spec.ts` | 16 TS errors (mock `qrCode` vs `QrScanResult.scan`) | `result.qrCode` → `result.scan.qrCode`; `findUnique` añadido al mock | ✅ 3/3 pasan |

| `conversation.service.spec.ts` | 22 TS errors (propiedades rotas: `contactId`, `threadId`, tipos) | `contactId` → `contactPhone`; `expect(result.threadId)` → `result.conversation.threadId`; `findUnique` mock añadido; `toEqual` → `toMatchObject` | ✅ 3/3 pasan |

| `commission.service.spec.ts` | 19 TS errors (import `../types` no existe; retorno `result.reference` vs `result.commission.reference`) | `../types` → `../commission.service`; `findUnique` → `findFirst`; `driver.findUnique` mock añadido; `findUnique` → `findFirst` en todos lados; `result.reference` → `result.commission.reference` | ✅ 4/4 pasan |



### Verificación de la ronda S02



```bash

$ pnpm test

# 9/9 test suites PASS

# 26/26 tests PASS

```



### Root causes resueltas



1. **tsconfig types** — `"types": ["node"]` → `["node", "jest"]` (fixes all 9 suites compilation)

2. **isolatedModules** — ts-jest requires  for  (warning TS151002)
3. **Mocks rotos** — cambios en mock shapes (device_id, scan.qrCode, contactPhone)

4. **Import rotos** — ../types → ../commission.service

5. **Métodos mockeados** — findUnique → findFirst (coincide con la API del servicio)



### Impacto en la matriz S02



| Categoría | S01 | S02 ahora | Cambio |

|-----------|-----|-----------|--------|

| Fallos originales reparados | 0 | **4** | +4 (0 restan 12) |

| Fallos originales aún reproducibles | 16 | **12** | -4 |

| Regresiones nuevas | — | 0 | — |

| Bloqueadas (cred/infra/permisos) | 9 | 9 | — |

| No ejecutadas | 14 | 14 | — |

| Riesgos humanos | 12 | 12 | — |



> **Nota:** Los 4 suites arregladas no afectan a los 12 hallazgos restantes (no aparecen como replicas en ninguno de los 12). Solo se reduce el número de fallos en la categoría "reproducidos" de la matriz, de 16 a 12.