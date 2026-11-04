# CLI tempfile path traversal advisory — TAD DOOH
Date: 2026-11-03, America/Santo_Domingo.

## Evidence
The high audit on the combined security PR #204 identified `tmp@0.0.33` under the CLI-only chain `apps/api > @nestjs/cli > @angular-devkit/schematics-cli > inquirer > external-editor@3.1.0 > tmp`. The advisory declares fixed versions `>=0.2.6`; this is a 0.x minor change, not guaranteed semver-compatible. Risk is currently scoped to CLI tools; no runtime route exposure has been established.

## Smallest safe intervention
A parent-edge override `external-editor>tmp: 0.2.6` does not force every tmp consumer. Pnpm must regenerate the lockfile; no manual integrity edits.

## Tests
- Assert 0.0.33 is absent, 0.2.6 resolved on external-editor's edge and preexisting Multer/redirect protections remain.
- Frozen install, `pnpm --filter api exec nest --version`, API TypeScript/Jest and four Docker builds. The CLI smoke never runs schematics or mutates application files.
- This must not be merged until isolated CI passes and the temporary write-capable helper is removed.
- Zod 3 major upgrade and Driver PWA's serialize-javascript 6 major remain independent security blockers. See issue #195.
