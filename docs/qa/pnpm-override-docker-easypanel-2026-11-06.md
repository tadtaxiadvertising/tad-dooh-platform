# TAD — EasyPanel Advertiser pnpm frozen-lockfile recovery (2026-11-06)

## GOAL
Resolve the failed `Dockerfile.advertiser:18` build after merge `ed85c4d92068b6f1b2a01d1000582a7f3a5de06a` (PR #212), without relaxing frozen-lockfile verification, changing dependency resolutions, touching credentials, deploying or merging automatically.

## OBSERVE — original failure
At 2026-11-06 21:50 UTC, EasyPanel reported:
- `Dockerfile.advertiser` installed unpinned `pnpm` globally with `npm install -g pnpm`.
- pnpm warned it did not read `package.json#pnpm.overrides`.
- `pnpm install --frozen-lockfile` failed with `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`, exit code 1, before the Next.js build.
- The committed `pnpm-lock.yaml` contains 14 pinned security overrides, including Multer and redirect-dependency guards. Moving or deleting pins without verifying parity would risk security regressions.
- The existing security tests `runtime-upload-security`, `tmp-cli-security` and `security-compatible-transitives` read the old manifest location directly.

Do not copy build arguments (even public client configuration) into issue comments or test fixtures; avoid storing real keys in build logs.

## PLAN / CHANGE
1. Move the **same 14 key/value overrides** to the supported root `pnpm-workspace.yaml#overrides`, leaving `allowBuilds` and workspace patterns untouched.
2. Remove only the obsolete `package.json#pnpm` object. Keep `pnpm-lock.yaml` **byte-for-byte unchanged**; no dependency upgrades, `--no-frozen-lockfile`, audit bypass or force-install.
3. Pin advertiser builder to the verified release `pnpm@10.34.9` on Node 22; Docker's `RUN pnpm install --frozen-lockfile` remains.
4. Adapt the security regression tests to read effective workspace settings, not stale manifest metadata; add `scripts/pnpm-overrides-contract.test.cjs` and its small fail-closed reader.
5. Align `CI Quality Gates` and `Landing V5 Focused Gates` to pnpm 10.34.9 and execute the override-contract preflight before the frozen install in the corresponding jobs. Add root config paths to the landing workflow filter.

## EVIDENCE — isolated GitHub source inspection
- BASE: `main@ed85c4d92068b6f1b2a01d1000582a7f3a5de06a`.
- Repository snapshot verified using GitHub connector; read `package.json`, `pnpm-workspace.yaml`, lockfile overrides, all relevant tests and Dockerfile before writing.
- Exact override keys **14/14** preserved. Workspace config values match the unchanged lockfile (checked on the branch).
- Three affected security tests were migrated to consume `readOverrides()`.
- **19/19 source and syntax assertions** passed on the branch, including parsing all modified CommonJS tests as JavaScript source. This is a static check, NOT `node --test` and NOT `pnpm install`.
- No production container rebuild or deployment performed from this chat.

## VERIFICATION — required before merging
| Gate / command | Status at PR preparation | Exit code / evidence |
| --- | --- | --- |
| GitHub source invariants, all 14 pinned overrides equal to lockfile | PASS (static) | 19 assertions; no process exit code |
| `node --test scripts/pnpm-overrides-contract.test.cjs` | NOT RUN locally | CI preflight pending |
| `node --test scripts/runtime-upload-security.test.cjs scripts/tmp-cli-security.test.cjs scripts/security-compatible-transitives.test.cjs` | NOT RUN locally | Requires installed dependencies |
| `pnpm install --frozen-lockfile` with pnpm 10.34.9 | NOT RUN locally | CI / clean Docker build pending |
| `docker build --file Dockerfile.advertiser --tag tad-advertiser:verify .` | NOT RUN locally | Build verification pending |
| Advertiser Next production build / public landing smoke | NOT RUN locally | CI landing browser job pending |

If a CI runner exits before showing any real steps, mark BLOCKED and investigate runner/account, not application code. On first actionable failure, preserve the full sanitized step log and fix only reproducible issues.

## RISK / SECURITY / ROLLBACK
- No changes to JavaScript app, pricing, auth, wallets, migrations, databases, Supabase, RLS, or secrets. This is deployment tooling and static regression coverage.
- Security guards remain **14 pinned values**. The Docker build still rejects drift via `--frozen-lockfile`.
- Residual risk: unexecuted `pnpm`/Docker runtime; other failures may emerge **after** dependencies install. The current log proves only the first blocking error.
- Rollback: close unmerged PR, or revert the PR commit(s) after review. If reverted post-merge, old EasyPanel failure returns; no DB rollback is needed.
- No merge, no EasyPanel redeploy, no forced ref update from this intervention.

**STATE:** IMPLEMENTED — VERIFICATION PENDING.
