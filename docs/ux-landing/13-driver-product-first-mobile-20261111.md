# TAD Driver — Hero mobile product-first (2026-11-11)

## Objective / baseline

Mobile visitors should see the approved real taxi image **before** the interactive discussion of the three compensation channels. Previous source order in `DriverLandingPage.tsx` was intro, CTA, compensation selector + explanation + journey, then taxi image. At 320–390 px this delays visual understanding of where the tablet goes and what it looks like.

Base `main@5261218a568f2fa1b189dc55b2501ffa1f333dd1`. Branch `feat/driver-mobile-hero-product-first-20261111`. Only the Driver public landing plus its isolated smoke/unit tests. No data, server-side, image asset, finance, Player or offline changes.

## Decision

Keep the accessible source order aligned with the visual order, not CSS-only `order` tricks:

1. Intro (eyebrow, h1, explanation, CTA, eligibility note).
2. One `DriverHeroVisual` displaying the same approved static PNG via Next Image with intrinsic dimensions and priority. No replacement, overlay or duplicate image.
3. Interactive Pantalla / Ventas / Referidos controls, summary and steps.

Desktop uses grid areas: intro and channels in the left column, taxi occupying both rows at the right. At widths up to 800 px, grid rows follow source order, so the photo follows the primary CTA and comes before the channel controls. This preserves keyboard/screen-reader logical reading order; the original CTA destination, channel state and helper calculations remain unchanged.

## Files changed

- `apps/driver/components/landing/DriverLandingPage.tsx`: split interactive choices from intro, insert the original visual between sections.
- `apps/driver/components/landing/driver-landing.module.css`: explicit 2-column desktop / single-column mobile CSS grid, no new animations or dependencies.
- `scripts/driver-landing.test.cjs`: validate the 3 direct hero children and continue checking PNG source/dimensions/priority.
- `scripts/driver-landing-smoke.cjs`: during existing viewport loop, assert actual rendered positions for CTA, image and channels at widths ≤800 px.

## Verification conducted

13/13 static source contracts verified from the HEAD GitHub branch, including exactly one approved taxi image, position of DOM children, desktop/mobile CSS grid, original earnings helper and the smoke geometry assertions. These are code-contract checks only and **not** TypeScript, execution of the Node test suite, browser-layout results or Lighthouse scores.

## Required QA gate before merge

```bash
pnpm install --frozen-lockfile
node --test scripts/driver-landing.test.cjs scripts/landing-cinematic.test.cjs scripts/driver-preview-arithmetic.test.cjs
pnpm exec tsc --noEmit --project apps/driver/tsconfig.landing.json
pnpm --filter driver build
DRIVER_LANDING_BASE_URL=http://127.0.0.1:3004 node scripts/driver-landing-smoke.cjs
```

Capture hero at 320, 360, 390, 580, 800, 1024 and 1440 px. Check the taxi image does not crop, no horizontal overflow, CTA focus, 200% zoom, screen reader reading sequence, reduced motion, and visual continuity between desktop and mobile. Compare LCP and Lighthouse under equivalent conditions.

Existing GitHub Actions runs currently fail before any job step executes ([#147](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/147)), and `main` has no active branch protection ([#255](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/255)); do not merge based on static contracts alone.

## Rollback

Close this PR without merge; or revert its commits. All changes are source and CSS, with no migrations, external effects or financial persistence.

**STATUS: implemented, pending executable/browser verification.**
