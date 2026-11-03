# Runtime dependency hardening — Multer / follow-redirects

CI `main@c5f48ff` reported multiple high-severity Multer DoS advisories and a follow-redirects sensitive-header forwarding advisory.

## Code-level changes
- Root `pnpm.overrides` fixes Multer to **2.5.0** across direct NestJS/Express and API consumers, and `follow-redirects` to **1.16.2** for Axios consumers.
- API direct dependency now declares `multer ^2.5.0` (same major).
- A temporary branch-only workflow generated `pnpm-lock.yaml` through pnpm. This workflow is absent from the final PR.
- The regression test checks effective lock resolution and rejects an oversized multipart payload using the actual installed Multer middleware, with no HTTP server/network.

## Regression / deployment gates
- Frozen install; targeted tests and 132 API suites; strict API TypeScript; image rebuild before publishing.
- Audit at least critical and high severity; the overall high audit is **not** expected to pass until the remaining advisories in issue #195 are corrected.
- Confirm production deploy uses an image containing patched dependencies; no automatic deploy or production traffic.
- Device offline, finance, auth, data schema and credentials are unchanged. Do not infer all NestJS interceptors are regression-tested from this one test.

## Rollback
Revert this dependency PR as one unit (manifest, lock and test). Requires security approval because rollback would reintroduce vulnerable code.