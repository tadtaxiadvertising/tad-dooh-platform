# TAD UX/UI Autonomous Implementation — Phase 00 Baseline

Started: 2026-10-28
Verified: 2026-10-29

## Objective

Establish a reproducible, evidence-first baseline before changing the Driver or
Advertiser experience. The implementation must preserve authentication, RBAC,
financial contracts, API contracts, telemetry, and the Driver offline-first
runtime.

## Repository state

- Workspace: C:\tad-dooh-platform
- Branch: feat/tad-ux-conversion-v1
- Base: bac24190e41ecc0e1eb062128aed1d1dbfa32cdb
- Initial security commit: 37623b615cba916e43aac76af382b4aa66078fa2
- Node.js: v22.20.0
- pnpm: 11.7.0
- Install: pnpm install --frozen-lockfile completed successfully.

The starting worktree already contained user-owned generated and scratch
changes. They are excluded from UX commits:

- .worktrees/main1
- apps/admin/tsconfig.tsbuildinfo
- apps/advertiser/tsconfig.tsbuildinfo
- apps/driver/playwright-report/index.html
- apps/driver/public/sw.js
- apps/driver/public/sw.js.map
- apps/driver/scratch/test-route.js
- apps/driver/tsconfig.tsbuildinfo
- apps/agents-orchestrator/dist/
- apps/player/dist/

## Required sources reviewed

- AGENT_STATE.md
- 02_reglas_negocio_stack.md
- 12_current_state_v12_handover.md
- 14_testing_strategy_qa_protocol.md
- 15_api_endpoints_reference.md
- FINANCIAL_SYSTEM_MASTER.md
- apps/driver/next.config.ts
- apps/advertiser/next.config.js

## Application surfaces

Driver is a Pages Router PWA with canonical routes under /driver, plus legacy
aliases. Its service worker, cache policy, IndexedDB behavior, telemetry, and
offline fallbacks are protected surfaces.

Advertiser is primarily a Pages Router portal under /advertiser, with a small
App Router shell. The repository also contains public campaign routes under /p.

## Interface inventory

| Route | Role | Primary component | API or redirect | Current state | Risk |
| --- | --- | --- | --- | --- | --- |
| Driver / | Guest or Driver | middleware | /driver/login or /driver/dashboard | Redirect only | Low; route order must remain intact |
| Driver /driver/login | Public | PortalAuth | Supabase auth | Implemented | Auth/session compatibility |
| Driver /register | Public | DriverRegisterPage | POST /api/proxy/auth/driver/register | Single long form | Conversion and error clarity |
| Driver /driver/onboarding | Public | OnboardingWizard | Driver registration/pairing endpoints | Multi-step | Registration response exposure gate |
| Driver /driver/dashboard | DRIVER | driver dashboard | Portal, fleet and wallet services | Protected, offline-capable | Offline/RBAC/402 protected |
| Driver /driver/wallet | DRIVER | wallet page | Backend-derived balance | Protected | Financial integrity |
| Driver /p and /p/:id | Public | campaign display | Campaign content | Public playback | Player contract; no UX mutation |
| Advertiser / | Guest or Advertiser | redirect before middleware | /login | No public landing currently | Redirect precedence |
| Advertiser /advertiser/login | Public | PortalAuth | Supabase auth | Implemented | Auth/session compatibility |
| Advertiser /advertiser/onboarding | Public entry | AdvertiserOnboarding | POST /api/proxy/onboarding/advertiser | Four visual states | Completion authorization gate |
| Advertiser /advertiser/dashboard | ADVERTISER | AdvertiserDashboard | Advertiser portal data | Protected | Status/RBAC/local completion marker |
| Advertiser /advertiser/planner | ADVERTISER | CampaignPlanner | Impact calculator | Protected | Conflicting price sources |
| Advertiser /p and /p/:id | Public | campaign display | Campaign content | Public playback | Redirect and route ambiguity |

The Advertiser App Router root is not reachable as a commercial landing because
next.config.js redirects / to /login before middleware. It remains an
architectural placeholder rather than an active conversion surface.

## APIs and contracts in scope

- POST /api/proxy/auth/driver/register: retain name, phone, password,
  vehicleModel and licensePlate payload; never persist the password in browser
  storage; preserve pending-approval semantics.
- POST /drivers: public registration boundary used by a legacy onboarding
  surface; response must exclude all password material.
- POST /api/proxy/onboarding/advertiser: retain verified onboarding fields and
  current budget payload while financial source-of-truth remains unresolved.
- POST /onboarding/advertiser/:id/complete: must require authenticated ownership
  or equivalent server-side authorization before status mutation.
- Advertiser portal-data and Driver wallet/fleet endpoints remain read-only
  consumers during this branch; balances, payment state and 402 handling are
  not recalculated in UI.
- Supabase auth cookies and role claims remain governed by the existing
  middleware and server validation paths.

## Baseline verification

| Gate | Result | Classification |
| --- | --- | --- |
| Driver lint | PASS with 150 existing warnings | Baseline debt |
| Advertiser lint | PASS with 167 existing warnings | Baseline debt |
| Driver TypeScript | FAIL: two existing shared Supabase response-type errors | Pre-existing |
| Advertiser TypeScript | FAIL: same shared errors plus missing local Playwright types | Pre-existing |
| Driver build, sandboxed | INCOMPLETE: local spawn EPERM | Environment |
| Driver build, elevated | PASS | Fresh 2026-10-29 |
| Advertiser build, elevated | PASS | Fresh 2026-10-29 |
| API security regression | PASS: 8/8 | Fresh 2026-10-29 |
| Driver destructive-route regression | PASS: 1/1 | Fresh 2026-10-29 |
| Browser smoke | Not yet run | Scheduled after public route repair |

The shared TypeScript failures are currently located in
packages/ui/components/PortalAuth.tsx and
packages/ui/components/UpdatePassword.tsx. Advertiser additionally reports
missing @playwright/test types from its local Playwright configuration/spec.

## Security gates discovered before UX mutation

1. Committed E2E credentials and token fixtures were present. Current-tree
   values were removed, tests now require environment-provided credentials, and
   login-dependent suites skip when those credentials are absent. Historical
   Git exposure still requires external credential rotation.
2. A public Driver test API route exposed a destructive database-reset surface
   and embedded secrets. The route was removed and a regression test now
   asserts that it cannot ship.
3. Driver create/list/detail responses exposed password material. A shared
   service-boundary sanitizer now excludes it while preserving public fields
   and relationships.
4. Public advertiser onboarding completion could activate an arbitrary
   advertiser by identifier. It now requires ADMIN or ADVERTISER plus
   tenant ownership. Anonymous and cross-tenant requests are rejected.

No destructive endpoint was invoked during discovery.

Items 2–4 were verified and committed in
5a573ccd (fix(security): close onboarding and driver data leaks).

## Business-contract contradictions held for decision

Advertiser planning code contains a pricing mismatch between RD$2,500 and
RD$1,500 per screen/month. No financial value will be changed in the UX branch
until the authoritative contract is reconciled. UI work may improve explanation
and state handling, but must not invent or silently normalize pricing.

Advertiser route helpers also disagree between /p/ and /advertiser/dashboard.
Redirect behavior will be characterized before any navigation change.

## Recommended work cards

1. Make only /register public in Driver middleware and _app, point the login CTA
   to it, and prove that /driver/dashboard remains protected.
2. Add the smallest shared form primitives needed by both portals; reuse the
   existing StatusSemaphore instead of duplicating status UI.
3. Convert Driver registration to a three-step in-memory wizard while preserving
   its exact POST payload and pending-approval result.
4. Add a pure V12 informational estimator with a hard 15-slot cap and no wallet,
   API or storage side effects.
5. Reduce public Advertiser onboarding to three comprehensible states, remove
   the anonymous completion call and pending-ID storage, and preserve the create
   payload.
6. Enable the already-declared Advertiser Playwright harness using the workspace
   version, then run responsive, accessibility and console checks.

## Phase 00 exit criteria

- [x] All three active security gates have focused regression evidence.
- [x] Driver and Advertiser builds have a fresh result.
- [x] Existing failures are separated from regressions introduced by this branch.
- [x] Route inventory and UX work cards are recorded.
- [x] No user-owned generated/scratch changes are staged.
