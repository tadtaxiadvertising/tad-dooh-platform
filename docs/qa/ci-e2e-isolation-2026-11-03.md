# CI E2E isolation — 2026-11-03

## Evidence
- Main commit c5f48ffadfe55b54abe81714be7c1b6e6c70260e: API Jest 29 suites / 132 tests passed, then the root CI failed with `Command "playwright" not found`.
- Root Playwright configuration uses `tests/e2e` with production-audit specs that default to real EasyPanel URLs, and v12 Admin E2E that **creates a driver**. Running these unconditionally from CI would be unsafe even after fixing the Playwright executable path.
- A separate `landing-v5-checks.yml` job already executes browser smoke against locally built Next servers with synthetic Supabase settings and no production credentials.

## Decision
- The unprivileged CI runs API Jest, deterministic cross-portal integration contracts, simulator security and Next patch checks. It does **not** execute authenticated/mutating production E2E.
- The fixture-only browser smoke workflow runs on PRs and now also on main pushes.
- A regression test ensures the unprivileged workflow cannot regress to the unsafe command and confirms fixture browser coverage remains configured.

## Pending
- Design a dedicated isolated test environment with explicit allowlisted URLs, seeded synthetic users, rollback/cleanup, and a separate manual approval gate before enabling v12 authenticated/mutating E2E.
- Formatting and 27 high dependency advisories remain independent blockers; this change does not waive those gates.
