# TAD DOOH Platform — Memory

## Project Overview
- **Repo**: `tadtaxiadvertising/tad-dooh-platform` (pnpm monorepo: `apps/*`, `packages/*`)
- **Stack**: Next.js/React + NestJS + Prisma + Supabase on Windows 11 (bash via git-bash/MSYS)
- **Path aliases**: `@tad/services` → `packages/services/index.ts` (*re-exports api.ts + others*); `@/*` → app root
- **Current work branch**: `feat/tad-cinematic-landing-20261108`

## Docker Build Gotchas (critical)
- Docker and CI pin `pnpm@10.34.9` for consistent lockfile behavior.
- The EasyPanel API build failed on 2026-11-10 at `parseDepRefs` with `ref.startsWith is not a function`. **Root cause:** two `pnpm-lock.yaml` snapshot dependencies under `eslint-config-next@15.2.6` had importer-style nested `specifier/version` mappings instead of scalar dependency refs.
- **Fix:** normalize those two snapshot values to their existing version strings; do not change workspace importer records or dependency versions. The error is **not caused by the presence or absence of the `...` filter suffix**.
- After dependency changes, regenerate the lockfile with the pinned pnpm version, review the diff, and check snapshot dependency reference types.
- Verify with `pnpm install --frozen-lockfile --filter api --filter @tad/impact-calculator` and a Docker build of `Dockerfile.api` before deploying.

## Environment
- Windows 11; bash via git-bash/MSYS; MSYS path conversion disabled (use forward-slash paths for native tools).
- `pnpm-lock.yaml` v9.0; pnpm 10.34.9 is the pinned version for all Docker builds.
- TypeScript full-project typecheck is slow here (tsc -p times out ~120s); use surgical node-based import/content checks instead.
