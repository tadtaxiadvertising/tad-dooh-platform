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
