# Docker pnpm reproducibility gate — 2026-11-07

## Evidence and cause
Base: `main@32222da25ddb535703870942edb6d9c971691b1e` (merge #213). CI pins pnpm `10.34.9`; advertiser Docker was pinned in #213. API, Admin, Driver and Player Dockerfiles still installed floating `pnpm@10`. The API Dockerfile additionally used `pnpm install --filter ...` without `--frozen-lockfile`. This allows Docker dependency behavior to drift from the committed lockfile, particularly with the 14 security overrides in `pnpm-workspace.yaml`.

## Scope
Pin the other four Docker builders to `pnpm@10.34.9` and require `--frozen-lockfile` on the API's filtered install. Add a Node contract test covering all five Dockerfiles. No lockfile, application source, migrations, credentials, RBAC, ledger or offline-first logic changed.

## Gates
- Source inspection: **PASS** — all five Dockerfiles now contain the exact pnpm pin and frozen install instruction.
- Test source: **ADDED**, `node --test scripts/pnpm-overrides-contract.test.cjs`; **NOT EXECUTED** here.
- `pnpm install --frozen-lockfile`, API tests, TypeScript, Docker builds, `pnpm audit --audit-level=high`: **NOT EXECUTED** here. Run on the PR head SHA and retain CI logs.
- A Railway combined status of SUCCESS on base SHA only covers its own context; **not** the full GitHub Actions release gates.
- GitHub workflow runs for base SHA were not returned by the connector's PR-only workflow-run query; do not infer green CI.

## Review, rollback and intervention
Review filtered pnpm install behavior in `Dockerfile.api`, especially the workspace manifest copies and package selection. If frozen installation fails, inspect `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` and `pnpm-lock.yaml` against `pnpm-workspace.yaml`; regenerate lockfile only with approved pnpm 10.34.9 in a separate reviewed commit. Do not bypass frozen lockfile. To rollback, revert this PR's Dockerfile and test commits; no DB rollback is required. Never deploy or merge until tests, audit, image builds and staging smoke gates pass.

Related: #195 tracks remaining high advisories; #196/#197/#198 are closed. This change addresses reproducibility, **not** vulnerability count.
