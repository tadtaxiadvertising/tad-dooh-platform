# TAD DOOH Platform — Memory

## Project Overview
- **Repo**: `tadtaxiadvertising/tad-dooh-platform` (pnpm monorepo: `apps/*`, `packages/*`)
- **Stack**: Next.js/React + NestJS + Prisma + Supabase on Windows 11 (bash via git-bash/MSYS)
- **Path aliases**: `@tad/services` → `packages/services/index.ts` (*re-exports api.ts + others*); `@/*` → app root
- **Current work branch**: `feat/tad-cinematic-landing-20261108`

## Docker Build Gotchas (critical)
- **pnpm 9.15.9** fails with `reference.startsWith is not a function` in `refToRelative` when resolving workspace filters.
- **pnpm 10.34.9** fails with `ref.startsWith is not a function` in `parseDepRefs` when using `--filter api... --filter @tad/impact-calculator...` syntax.
- **Fix**: Never use the `...` suffix on `--filter` commands in Dockerfiles. Use explicit filters:
  - `RUN pnpm install --frozen-lockfile --filter api --filter @tad/impact-calculator`
- **All Dockerfiles** (api, admin, driver, player, advertiser) now use `pnpm@10.34.9`.
- **Always test the build locally** with `pnpm install --frozen-lockfile --filter api --filter @tad/impact-calculator` before pushing Docker changes.

## Environment
- Windows 11; bash via git-bash/MSYS; MSYS path conversion disabled (use forward-slash paths for native tools).
- `pnpm-lock.yaml` v9.0; pnpm 10.34.9 is the pinned version for all Docker builds.
- TypeScript full-project typecheck is slow here (tsc -p times out ~120s); use surgical node-based import/content checks instead.
