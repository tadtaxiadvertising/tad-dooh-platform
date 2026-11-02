---
name: tad-autonomous-recovery
description: TAD DOOH autonomous recovery and remediation loop.
version: 0.1.0
author: Arismendy (arismendy), Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [tad, autonomous-recovery, qa, security, remediation]
    related_skills: [driver-portal-onboarding]
---

# TAD Autonomous Recovery OS

Autonomous recovery, diagnosis, and remediation for the TAD DOOH platform. Runs a closed-loop cycle (Observe → Reproduce → Diagnose → Prioritize → Plan → Implement → Verify → Document → Re-evaluate) over the real repository, with persistent state between sessions and hard P0/P1/P2 priorities.

This skill does NOT invent results. Every claim of success requires the command run and its real output recorded. Where Docker, PostgreSQL, or external services are unavailable, mark the check BLOCKED with a local alternative.

## Always-on rules (every instance of this task)

1. **Evidence before change** — never fix code without understanding the problem and verifying with the real output of a command.
2. **Root cause before symptom** — fix the defect class, not the symptom.
3. **Security and data integrity first** — never expose secrets; never break financial integrity. Wallets/payouts use an immutable ledger + derived balance; idempotency keys; dedup webhooks.
4. **Simple architecture** — prefer the smallest safe change over a large refactor.
5. **Measured performance** — baseline before optimising; only claim faster with evidence.
6. **Automate verification** — "verified" requires real command output; never claim success without a result.
7. **Offline-first** — treat every device as offline-capable; preserve ONLINE → OFFLINE → LOCAL QUEUE → RECONNECT → SYNC → RECONCILIATION; never delete local queues.
8. **Financial integrity** — never mutate historical ledger records to pass a test; every correction needs a regression test proving idempotency and invariant conservation.
9. **Response format (user preference)** — after executing tool calls, always summarise the results concisely and continue; never return an empty response. A report must cite real command output, not narration. Omit boilerplate, history, and repeated state; lead with the finding and the evidence.
10. **Final classification** — only declare completion when all relevant gates are recorded.

## When to Use

- The user asks to recover, audit, or repair the TAD DOOH platform.
- A P0/P1/P2 failure is suspected (secret exposure, data corruption, finance, API down, tests failing, build failing).
- After any regression so a fix becomes a repeatable, verifiable loop.

**Don't use for:** cosmetic UI polish while a P0/P1 is open; guessing at results without running commands.

## Prerequisites

- Node.js >= 20, pnpm 9, Corepack available (verified on this host).
- pnpm lockfile present (`pnpm-lock.yaml`) and `node_modules` populated.
- Git working tree must be clean (or confined to this skill's own files).
- No Docker required; if present, `docker build` results are recorded as optional.
- No production credentials required for local build/lint/test.

## How to Run

1. Place this SKILL.md in `skills/tad-autonomous-recovery/SKILL.md`.
2. Place the persistent state at `skills/tad-autonomous-recovery/STATE.md`.
3. Start the loop with `bash skills/tad-autonomous-recovery/run.sh` (or invoke the numbered procedure directly via `terminal`).

## Quick Reference

| Action | Command |
|---|---|
| Read persistent state | `read_file` → `skills/tad-autonomous-recovery/STATE.md` |
| Repo current HEAD | `git rev-parse HEAD` |
| Uncommitted diff summary | `git status --porcelain` |
| Install from lockfile | `pnpm install` (root) |
| Root typecheck | `npx tsc -p tsconfig.base.json --noEmit` |
| Root lint + format check | `pnpm lint` |
| Unit tests (all workspaces) | `pnpm test` |
| Prisma validate + generate | `npx prisma validate && npx prisma generate` |
| Per-workspace build | `pnpm run build --workspaces --if-present` |
| Docker build (optional) | `docker build -f Dockerfile.api .` |

## Procedure

Each iteration of the loop performs 13 ordered sub-steps. Steps that depend on previous steps must run in sequence. Mark every completed step with a real command output in STATE.md.

1. **Read state** — load `STATE.md`; identify current phase, last verified SHA, and next action.
2. **Survey changes** — `git fetch`, compare with `origin/main`; list new commits, modified files, untracked files. Record SHA of `main` being benchmarked.
3. **Pick the blocking item** — select highest-P item that is safe to change and has no dependency on unavailable credentials/secrets.
4. **Gather evidence** — read the relevant code, logs, tests, schema; reproduce the failure if possible.
5. **Hypothesis** — state a single, falsifiable hypothesis (`if X then Y`).
6. **Minimal test** — run the smallest command that confirms or rejects the hypothesis. Record `EXIT=`.
7. **Root cause** — trace input → transformation → state → output; identify the class of defect (code/data/config/deploy/infra/security/architecture/process/observability).
8. **Implement change** — smallest safe fix. Add regression test where a class is hit. Keep scope ≤ the defect.
9. **Regression check** — re-run the minimal test, then the affected gates (typecheck/lint/test/build).
10. **Security/integrity scan** — search the diff for secrets, IDOR, injection, broken RBAC, data loss. Read every diff before commit.
11. **Document** — write the finding, root cause, fix, test, and evidence into STATE.md; add a dated note to the repo's `AUDIT_*` docs if warranted.
12. **Re-evaluate** — if the same operation fails twice with the same cause, change the diagnosis or record BLOCKED. Do not retry blindly.
13. **Continue** — advance to the next highest-P open item, or finish with the final classification.

## Pitfalls

- **Do not retry the same failing operation.** Two identical failures mean the diagnosis is wrong — change it.
- **Do not exceed retry budget** (3 identical attempts per cause, 2 external retries after a clear error).
- **Do not mark a check PASS when something is BLOCKED.** Record the blocker and the local alternative.
- **Do not commit secrets or `.env`.** Rotate anything exposed and record the rotation.
- **Do not run destructive DB migrations** — use EXPAND → MIGRATE → CONTRACT and verify backups.
- **Do not claim "verified" without output.** "Checked" without a command result is not evidence.
- **Do not treat a Prisma model comment as evidence of a DB constraint.** Prisma stores only the literal columns; if the migration creates a *computed* constraint (e.g. `date_trunc('second', timestamp)` inside `ON CONFLICT`), the Prisma comment must state that the enforcement is runtime SQL (raw `ON CONFLICT (...)`), not a native Prisma unique index. A stale or wrong comment invites a refactor that silently duplicates or voids the constraint.
- **`next-pwa` v10+: `buildExcludes` deprecated; use `exclude`.** Never exclude `middleware-manifest.json` — Next.js 15 requires it. A stale `.next` directory causes `EEXIST` `copyfile` errors; clean (`rm -rf .next`) before any `pnpm build` on `driver`.
- **Landing rate data must reference `business-rules.ts`.** The frontend simulation (`DriverEarningsLab`, `LandingPage`) and the pricing wrapper (`simulatorPricing.ts`) must reference the single source of truth (`ADVERTISER_COST_PER_CAMPAIGN_RD: 1500`, `DRIVER_RATE_PER_CAMPAIGN_RD: 500`, `DRIVER_RATE_PER_AD_PLAY_RD: 1.25`, `DRIVER_REFERRAL_BONUS_RD: 500`). When fixing landing/financial motion conflicts, remove leftover `/* RESUELTO: conflictos merge ... */` artifacts — they hide unresolved drift and confuse future audits.
- **Concise response format.** Lead with the finding and real command output (e.g. `Compiled successfully in 97s`, `TSC_EXIT=0`); omit boilerplate, history, and repeated state. A report must cite real output, not narration.

## Verification

1. `skill_view(name='tad-autonomous-recovery')` loads without error.
2. The SKILL.md frontmatter parses (name, description ≤60 chars, platforms present).
3. Running the procedure from `## Procedure` produces a STATE.md with a completed loop iteration and a real command result.
4. The final classification is one of: `COMPLETADO Y VERIFICADO`, `FUNCIONAL LOCALMENTE, PRODUCCIÓN BLOQUEADA`, `PARCIAL, BLOQUEOS IDENTIFICADOS`, or `DETENIDO POR RIESGO DE SEGURIDAD O INTEGRIDAD`.

## Files

- `SKILL.md` — this file.
- `STATE.md` — persistent execution state (read/write each iteration).
- `run.sh` — optional single-command loop entry point.
- `references/`
  - `gate-classification.md` — P0/P1/P2/P3 + PASS/FAIL/BLOCKED/NOT RUN + final classification.
  - `recovery-patterns.md` — idempotent retry, batching, offline-queue, reconciliation.
  - `landing-rate-sync.md` — sync rules for landing/simulator pricing against `business-rules.ts` (1500rd campaign, 500rd driver rates, conflict-artifact cleanup, duplicate-file prevention after rebase).
