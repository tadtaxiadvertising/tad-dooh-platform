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


## Stabilization — 2026-11-18

### Verified directly from repository source (not GitHub Actions)

- WCAG contrast calculation for five critical light-theme pairs:
  headline gold `#806300` on white **5.67:1**;
  small chapter gold `#765d00` on white **6.29:1**;
  static-card captions on `#f5f5f2` **5.76:1**;
  hero step labels on white **6.36:1**;
  studio body on `#f7f7f2` **6.08:1**.
- Source inspections establish three stage markers, the preserved
  financial simulator, local-only creative preview and no new network calls.
- Animation-only chapters are `aria-hidden` and have a separate screen-reader
  chapter list. Static chapters serve mobile, reduced motion and no-JS.
- Sticky section now reserves **90px** for the public desktop navbar; anchored
  creative preview reserves space and small viewports use static cards.
- Twenty-eight isolated source/contrast assertions passed in the connector
  execution environment. This is not a Next.js compilation result.

### Independent local QA (no GitHub plan/minutes)

From an authorized local checkout with dependencies already installed:

```bash
bash scripts/advertiser-motion-v6-local-qa.sh
```

It runs regression tests, strict landing TypeScript, scoped ESLint,
a synthetic-config production Next build, then a local-only Chromium
smoke with forward/reverse scroll and no-JS/mobile checks. Screenshots and
logs are written to an output directory outside the repo; no credentials
or production traffic are required.

**Caveat:** This session cannot clone the private repository or install
the workspace in its isolated container. Therefore the browser/build
gate has **not** been executed here. A passing script result from an
authorized checkout is required before calling the implementation verified.

### Remaining risks

- The app's existing Next configuration ignores build-time TypeScript/lint
  failures. The independent script runs those gates explicitly; do not infer
  type safety from `next build` alone.
- The long-standing landing CSS contains multiple override layers. Follow-up
  consolidation should be a separate small PR after screenshots and behavior
  are approved, not bundled with a time-sensitive UI release.


## QA local: reparación del montaje de assets standalone (2026-11-18)

Hallazgo: `ln -sfn SOURCE TARGET` **no sustituye** un directorio `TARGET` existente; crea un symlink *dentro* del directorio. En la salida Next standalone puede dejar `/_next/static` o `public` en una ruta equivocada y producir falsos errores de carga o imágenes durante el smoke.

Cambio mínimo: `scripts/advertiser-motion-v6-local-qa.sh` valida que existan assets compilados y copia contenidos con `cp -R SOURCE/. TARGET/` a los directorios efectivos. No toca producción, datos operativos ni repositorios de imágenes externos.

Regresión: `scripts/advertiser-standalone-assets.test.cjs` ejecuta el bloque de staging real contra archivos y carpetas temporales, incluso si los destinos ya existen, y prueba repetición e inexistencia de assets. En el entorno local aislado de esta revisión se ejecutaron **13/13 pruebas PASS** de los scripts del release gate y del montaje de assets, además de `bash -n` del bloque modificado. No se certificó un build de Next ni Chromium del monorepo completo.
