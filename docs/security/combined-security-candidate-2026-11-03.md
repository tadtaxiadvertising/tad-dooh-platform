# Security integration candidate — 2026-11-03

## Why this branch exists
- Base: main@e808358207140ed0f4d772fee6e73f24a1e3f58b (landings reflow PR #200 already merged).
- Combine draft PR #201 (compatible targeted transitive upgrades) and #202 (Nodemailer 10.3.1 with denied attachment file/URL reads).
- Both PRs alter pnpm-lock.yaml and cannot be merged by manually copying integrity data; pnpm regenerated the combined lock in a branch-restricted workflow.
- After the helper successfully committed the lock, the write-enabled workflow was **removed**, leaving readonly acceptance only.
- This candidate is for **testing, never merging or deploying**; final production changes must flow through independently reviewed PRs.

## Combined lock verification
Confirmed the absence of older audited package nodes: body-parser 1.20.4/1.20.8/2.3.0, postcss 8.4.31, glob 10.4.5, picomatch 4.0.1, lodash 4.17.21, js-yaml 4.1.0 and nodemailer 8.0.11. Patched package nodes are present for their respective same-major replacements and nodemailer 10.3.1.

## Required verification
- Frozen install, both security test scripts, API TypeScript/Jest, global TS, four Docker images.
- Add fixture-only landing browser smoke to this PR because updated Next PostCSS can affect CSS layouts and reduced motion.
- Critical audit and real high audit summary by the same commit SHA. Do **not** disable the high CI gate to report success.
- Staging-only SMTP delivery compatibility with an approved synthetic account must be reviewed separately; no production SMTP or secrets.
- Known outstanding audit packages: semver legacy parser, tmp CLI, Driver PWA serialize-javascript, Zod 3. Do not force major upgrades on the Player/offline path without regression evidence.
