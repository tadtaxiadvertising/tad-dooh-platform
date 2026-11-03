# TAD Landing Creative Reframe V3 — QA handoff

## Scope and intent
Branch: \`feat/landing-creative-reframe-20261102\`. Base: \`main@af4ad38ad287a27f4e64bbc967388a62209f3c2f\`.

A visual and copywriting redesign of **two public landing pages only**:
- Advertiser (\`apps/advertiser/app/page.tsx\` → \`LandingPage\`): **Campaign Atelier**, editorial ivory, clay/orange accent, forest-green campaign theater and a light, accessible quote workbench.
- Driver (\`apps/driver/pages/index.tsx\` → \`DriverLandingPage\`): **Midnight Mobility**, deep petroleum-green, fluorescent lime accent and a legible mint financial summary.

These visual systems deliberately differ by audience. They continue using existing SVG/CSS scenery, preinstalled Framer Motion and CSS transforms; no new dependency, 3D runtime, remote font or asset is required.

## Conversion changes
- Advertiser: hero steps **Imagina → Configura → Solicita revisión**; the CTA still links to \`#experiencia\`. The example continues showing city, objective, screens, duration and production checkbox **OFF** by default. The projected impressions remain estimates with sources and caveats.
- Driver: hero presents three eligible streams—**Pantalla / Ventas / Referidos**—with a simulation CTA. Replace the ambiguous comparison table with clear separate descriptions of campaign-monthly and verified-play concepts, as well as one-time approved bonuses.

## Financial and security invariants
- The **mathematical sources and helpers were not edited** (\`earningsPreview.ts\`, \`simulatorPricing.ts\`, \`@tad/impact-calculator\`, API business-rules). Totals therefore remain *illustrative*, not contractual.
- Never collapse a campaign monthly rate and a per-play rate into one guaranteed payment; no automatic addition or fake balance.
- Displayed advertiser price is a **subtotal illustration excluding taxes**, not a final quote. A previous static table incorrectly claimed RD$1,500 while the simulation motor uses separate source data; it was removed, not silently recalculated.
- Referrals, registration flag, authorizations, login links, middleware, cookie consent, analytics, storage and offline-first routes have not been changed.
- No fake customer counts, unverified impressions, fabricated reach, guaranteed income or invented campaign availability.

## Validation commands
\`\`\`bash
pnpm install --frozen-lockfile
node --test scripts/landing.test.cjs scripts/landing-creative-reframe.test.cjs scripts/driver-landing.test.cjs scripts/driver-preview-arithmetic.test.cjs scripts/advertiser-onboarding-presentation.test.cjs scripts/cookie-management.test.cjs
pnpm exec tsc --noEmit --project apps/advertiser/tsconfig.landing.json
pnpm exec tsc --noEmit --project apps/driver/tsconfig.landing.json
pnpm --filter @tad/advertiser build
pnpm --filter driver build
\`\`\`

## Browser QA matrix — mandatory before merge
For **both portals**, test 320x568, 360x800, 390x844, 430x932, 768x1024, 1024x768, 1440x900 and 1920x1080:
1. Hero title visible without JS, no horizontal scroll at 200% zoom, CTA and login hit targets >=44 px.
2. Main navigation and anchor positions, keyboard focus indicators, FAQ, legal/footer links.
3. Reduced-motion preference and ordinary motion; no content hidden behind animation or CLS during loading.
4. Advertiser: slider and keyboard controls; production OFF→ON→OFF; subtotal returns to initial value; warnings and units clear.
5. Driver: 0/15 ad boundaries, multiple approved sales and activated referrals, arithmetic, no double count of plays; registration gated OFF/ON.
6. Consent decline/accept/revoke, referral allowlist, public/private routing, no private API fetch on a guest visit.
7. Run Lighthouse mobile + desktop and inspect LCP/CLS/INP where measurable. Do not invent scores.

## Integration and release risks
- The pre-existing draft PR #181 edits the same files. **Do not merge both without an explicit conflict-by-conflict comparison**; cherry-pick or select a single approach after CI and visual review. Avoid overwriting unrelated work.
- At review time, #181 documented global TypeScript, formatting, E2E runner and security audit failures. Those were not introduced or fixed by this visual PR, and passing landing-only tests does **not** certify production readiness.
- No direct main commit, no merge/release until CI and QA pass. If any checkpoint fails, leave as a draft PR with the blocker and exact failing evidence.
- Rollback: revert the single creative-reframe PR; no data migrations or persistent state changes.
