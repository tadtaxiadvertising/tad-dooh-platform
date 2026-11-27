# Advertiser V6 — performance baseline contract

Date: 2026-11-27. Base: b70f2e4a. No measured values are claimed at authoring time.

The existing landing-v3-measure.cjs already collects a Next build manifest gzip snapshot and initial-navigation Chromium lab samples. It was not called by the focused landing workflow. Run it after the functional smokes, with the same isolated advertiser server and fixture configuration. Preserve the JSON artifact for 14 days. No new dependency or production request.

## Measurement protocol

- Three fresh Chromium contexts, 390 × 844, reduced motion, CPU 4x slowdown, 150 ms simulated latency, 200 KiB/s down and 75 KiB/s up.
- Manifest-listed initial JS and CSS gzip sizes (each file compressed separately). Compare only equivalent build scope and config.
- Initial-navigation LCP, CLS and FCP, navigation timings and resource bytes. CLS uses maximum session-window sum, starting from first eligible shift, ignoring recent input, with <1 s between shifts and <5 s duration.
- Null metrics mean unavailable, not zero. Median uses finite samples; review all raw samples. The report includes source SHA, build ID and runtime asset matching evidence.
- The JSON is not a Lighthouse report, not a complete visit, not real hardware or field p75. No INP claim.

## Release use

Collect a first successful clean main report and compare subsequent equivalent builds before setting stable thresholds. Proposed product goals (not CI pass claims): field p75 LCP <= 2.5 s, CLS <= 0.1, INP <= 200 ms. A lab median does not establish these field goals. The existing optional baseline comparison uses a 60 KiB initial JS gzip delta target; no baseline is automatically selected by this PR. Timing is initially observational; an execution/identity/safety failure is still a CI failure.

Local reproduction against an isolated existing production build:

```bash
LANDING_BASE_URL=http://127.0.0.1:3003/ LANDING_MEASURE_SAMPLES=3 node scripts/landing-v3-measure.cjs
node --test scripts/landing-v3-measure.test.cjs
```

No production deployment, tariff changes or Player modifications. Review the first CI report before claiming any performance improvement.


## Post-integration incident — build identity

PRs #589 and #590 merged although the focused workflow failed. Browser logs 140371028012 and 140376099555 show both functional smokes completed, followed by "Running root does not match the measured build". Build log explicitly lists the advertiser App Router root as static (○ /). No lab report was produced. The old identity rule required every route-exclusive manifest JavaScript asset to appear in a DOM script tag; it logged neither missing assets nor response identity. A real mismatch versus an over-restrictive manifest assumption could not be distinguished from those logs alone.

For a static App Router root declared non-revalidating in prerender-manifest.json, verify SHA-256 of the actual decoded navigation response against server/app/index.html. Missing expected artifact fails rather than silently falling back. Record both digests and missing manifest script paths. Retain strict nonempty manifest matching for non-static routes. A different root HTML must fail even if its script tags match. No development override is enabled by CI. This checks exact root HTML, not every served asset byte. Bundle manifest sizing remains separate from actual browser resource measurements.

The revised implementation and three identity regression cases require exact-head CI verification. Until a successful run, do not assert that the failure was a false positive or that a performance baseline exists. Separately verify repository rulesets/required checks: the observed merges with failed focused CI demonstrate a release control gap, but do not establish which rule or bypass permitted the merges.


## First successful lab baseline — 27 November 2026, 16:28 UTC

PR #592 head `7e1b00867332c91c7f51a5a1a2a5888936d8a4b3`, run [46033243250](https://github.com/tadtaxiadvertising/tad-dooh-platform/actions/runs/46033243250), job 140622092101. All three workflows succeeded. [JSON artifact 15216140592](https://github.com/tadtaxiadvertising/tad-dooh-platform/actions/runs/46033243250/artifacts/15216140592), expiry 11 December 2026. Values below transcribed from job logs, not an inferred improvement.

| Sample | LCP ms | FCP ms | CLS | Load ms |
|---|---:|---:|---:|---:|
| 1 | 1008 | 1008 | 0 | 1655.8 |
| 2 | 1000 | 1000 | 0 | 1655.4 |
| 3 | 1000 | 1000 | 0 | 1646.9 |
| Median | 1000 | 1000 | 0 | 1655.4 |

Initial JS gzip 175853 bytes; route-exclusive JS gzip 72396 bytes; initial CSS gzip 40064 bytes. Each browser sample recorded 220086 transferred resource bytes and 217386 encoded resource bytes (resource entries exclude navigation HTML). All three HTML digests matched `b9a4cd714cf2d2d919896932dcaa7d5f9ec572645ad3a4d52436be346f3150ec`. Missing manifest script `static/chunks/3779-4310908786337cce.js` was consistently reported; this validates the former rule's false-negative assumption for this build, not the precise missing chunks of the older runs.

Baseline is local reduced-motion initial navigation only. No field p75, INP, Lighthouse, actual production, or relative improvement claim.

## Required release gate integration

The incident #313 showed that the historical mandatory Summary only aggregated format, types, tests, Prisma, security and Docker builds. It did not depend on the separate path-filtered landing workflow. Convert that workflow into a reusable workflow called from CI Quality Gates, and require its result to equal success in Summary. Retain manual workflow_dispatch, remove duplicate automatic entrypoints. No changes to branch protection or independent review requirements.

Trade-off: fixture-only landing QA now runs for every PR/push covered by CI Quality Gates, including unrelated changes. This deliberately avoids path-filter omissions and a permanently pending required check. It runs in parallel with existing checks, reuses the existing workflow, and requires no new privileged token or production access. Revisit cost only after measuring. No skipped or cancelled landing result is accepted. Verify the exact-head nested jobs and Summary before integration; effective repository settings and deployment promotion remain separately auditable.
