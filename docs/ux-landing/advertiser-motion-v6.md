# TAD Advertiser — Motion Experience V6

**Scope:** public advertiser landing (`apps/advertiser/components/landing/`) only.

## Direction

White editorial canvas, near-black type, TAD yellow highlights. Motion explains the
service rather than obscuring commercial terms: city → tablet behind the front
passenger headrest → playback activity and later validation. The narrative is
illustrative and **must never be used as evidence of a real campaign, impressions,
unique people reached or revenue**.

The reference experience informed the creative brief; its animation source was
not copied. Artwork and scenes here use local CSS and the already declared
`framer-motion` package, without WebGL, externally fetched images or new
runtime dependencies.

## Components and ownership

- `LandingPage.tsx`: public page composition, navigation and existing finance demo.
- `TaxiScrollStory.tsx`: 3 educational chapters driven by `useScroll`
  and `useTransform` on desktop.
- `taxi-scroll-story.module.css`: sticky scroll stage, device/taxi/reports
  illustration, responsive mobile sequence and the no-JS fallback.
- `landing.module.css`: scoped white-page visual overrides; the private advertiser
  dashboard and onboarding keep their own theme.
- `CampaignJourney`, `CreativePreview`, `simulatorPricing`: unchanged
  computational contracts and local-first preview behavior.

Simple editorial entrances additionally use native CSS view timelines only where supported; otherwise their text remains visible.

## Motion behavior

| Context | Intended outcome |
|---|---|
| Desktop >900px, height >690px, ordinary motion | Three chapters scrubbed in both scroll directions |
| Mobile, narrow viewport or short landscape | Three visible cards; no pinned stage |
| `prefers-reduced-motion: reduce` | Three readable static chapters and all CTAs |
| JavaScript unavailable/not yet hydrated | Three readable static chapters instead of a frozen scene |
| Reversing scroll | The displayed taxi/tablet/report state reverses without business writes |

## Non-negotiable checks

- Contrast of headline, labels, legal/financial disclaimers and interactive controls
  against the new light surfaces.
- 320, 360, 390, 430, 768, 1024 and 1440px; no horizontal overflow or sticky
  trapping. Check zoom at 200%.
- Desktop scroll both ways: taxi → screen → activity; CTA from the story reaches
  the local creative-preview section.
- Reduced motion and no-JS: three chapters and the CTA visible; no required
  content depends on opacity animations.
- Studio: JPG/PNG/WebP/MP4/WebM stays in browser, errors remain visible; no uploads.
- Simulator: `includeProduction=false` initially, amounts and source warnings
  unchanged; no wallet, payout, pricing or backend edits.
- Legal links, login, focus, keyboard and consent analytics still behave as before.

## Quality gates

`scripts/advertiser-motion-v6.test.cjs` checks editorial scope, motion access,
render contracts and non-misleading data. The isolated Chromium smoke in
`scripts/landing-v3-smoke.cjs` checks the white narrative and the reduced-motion
fallback. The focused CI workflow includes both.

**Merge gate:** production-equivalent build, TypeScript, lint, browser screenshots,
accessibility and mobile manual review must pass. Do not merge from screenshots
or static source checks alone.
