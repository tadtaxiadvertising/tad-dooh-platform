# Security: obsolete TypeScript ESLint parser removal (2026-11-03)

## Root cause
The security audit's high Semver ReDoS finding travels through `packages/permissions>typescript-eslint-parser@22.0.0>typescript-estree@18.0.0>semver@5.5.0`. The package's own `eslint.config.cjs` already uses the modern scoped `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin`, not the legacy parser. Keeping the legacy dev dependency adds a vulnerable transitive tree without providing lint functionality.

## Change
- Remove only the unused legacy dev package.
- Declare explicitly the modern parser and plugin already required by the existing ESLint configuration, compatible with ESLint 8.57.x.
- pnpm regenerates and prunes the lockfile; no manual integrity hashes.
- No changes to the permission matrix, RBAC behavior, API, database, browser, or offline operation.

## Verification
- Frozen install, permission parser regression and package's existing lint command, TypeScript and global CI.
- Confirm Semver 5.5.0 and obsolete parser absent in the lock.
- A temporary lock-generation workflow is restricted to the feature branch and must be deleted before merge.
- This PR is independent of #201, #202, #203 and the nonmergeable combined evidence PR #204. Changes to pnpm-lock.yaml must be reconciled by pnpm after any earlier dependency merge.

Remaining high findings after all proposed dependency patches are separate issues (#195); do not lower audit thresholds.

## Final lockfile evidence
Pnpm-generated lockfile commit `27d672f7` removes `typescript-eslint-parser@22.0.0`, `typescript-estree@18.0.0` and `semver@5.5.0`; the modern scoped parser/plugin are present in the permissions importer. The write-enabled generator was deleted in `5a2de703`; final CI must use read-only permissions. No change to permission-matrix behavior.
