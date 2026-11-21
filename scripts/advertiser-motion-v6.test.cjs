const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");

const landing = read("apps/advertiser/components/landing/LandingPage.tsx");
const story = read("apps/advertiser/components/landing/TaxiScrollStory.tsx");
const storyCss = read("apps/advertiser/components/landing/taxi-scroll-story.module.css");
const css = read("apps/advertiser/components/landing/landing.module.css");

test("advertiser motion narrative is connected to its public landing without replacing campaign logic", () => {
  assert.match(landing, /<TaxiScrollStory city=\{city\} brandName=\{brandName\} \/>/);
  assert.match(landing, /<CreativePreview \/>/);
  assert.match(landing, /<CampaignJourney/);
  assert.match(landing, /href="#motion-story"/);
  assert.match(story, /id="motion-story"/);
  assert.match(story, /href="#creative-preview-title"/);
  assert.match(landing, /estimateCampaignDetailed\(config\)/);
  assert.match(landing, /setIncludeProduction\] = useState\(false\)/);
});

test("motion scrub includes reversible stages and a non-pinned reduced-motion fallback", () => {
  assert.match(story, /useScroll\(/);
  assert.match(story, /useTransform\(/);
  assert.match(story, /useReducedMotion\(/);
  assert.match(story, /offset: \["start start", "end end"\]/);
  assert.match(story, /data-reduced-motion=\{reducedMotion/);
  assert.match(story, /className=\{styles\.staticSequence\}/);
  assert.match(story, /data-motion-ready=\{ready/);
  assert.match(storyCss, /section:not\(\[data-motion-ready/);
  assert.match(storyCss, /position:sticky/);
  assert.match(storyCss, /@media\(max-width:900px\),\(max-height:690px\)/);
  assert.match(storyCss, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(storyCss, /\.sticky\{display:none\}/);
  assert.doesNotMatch(story, /preventDefault\(|onWheel=|window\.addEventListener/);
});

test("all cinematic stage/caption visual transforms derive from the same JS scroll value", () => {
  // A native ViewTimeline mapping previously painted taxi and report with
  // wrong opacities while the shared progress indicator showed 92%.
  assert.match(story, /function interpolateScrollProgress\(/);
  assert.match(story, /scrollYProgress\.get\(\)/);
  for (const name of [
    "taxiOpacity", "taxiX", "taxiScale", "tabletOpacity", "tabletScale",
    "reportOpacity", "reportY", "firstCaption", "secondCaption", "thirdCaption",
  ]) {
    assert.ok(
      story.includes("const " + name + " = useTransform(() =>"),
      name + " must be sampled with the function-based transform",
    );
  }
  assert.match(story, /interpolateScrollProgress\(\s*scrollYProgress\.get\(\),\s*\[0\.69,\s*0\.83\],\s*\[0,\s*1\],?\s*\)/);
  assert.match(story, /interpolateScrollProgress\(\s*scrollYProgress\.get\(\),\s*\[0,\s*0\.24,\s*0\.39\],\s*\[1,\s*1,\s*0\],?\s*\)/);
});

test("hero entrance keeps no-JS headings opaque from the first frame", () => {
  const entry = css.match(/@keyframes advertiserHeroIn\s*\{([\s\S]*?)\n\}/)?.[1];
  assert.ok(entry, "The cinematic hero entrance should remain defined.");
  assert.doesNotMatch(entry, /opacity\s*:/, "The entrance must not hide SSR/no-JS text.");
  assert.match(entry, /translate3d\(0, 24px, 0\)/);
  assert.match(entry, /translate3d\(0, 0, 0\)/);
});

test("white page style remains scoped to the landing, keeping CTA and legible form controls", () => {
  assert.match(css, /Advertiser Motion V6/);
  assert.match(css, /background: #ffffff;/);
  assert.match(css, /\.landing :global\(\.landing-campaign-panel\)/);
  assert.match(css, /\.landing :global\(\.landing-hero-cities button\[aria-pressed="true"\]\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(storyCss, /url\(\s*https?:\/\//);
  assert.doesNotMatch(story, /fetch\(|navigator\.sendBeacon\(|localStorage|sessionStorage/);
});

test("narrative does not convert illustrative telemetry into guaranteed exposure", () => {
  for (const exact of [
    "SIN DATOS OPERATIVOS NI MÉTRICAS REALES",
    "Reproducciones, impresiones estimadas y personas alcanzadas son conceptos distintos",
    "SIN DATOS OPERATIVOS",
  ]) {
    assert.ok(story.includes(exact), "Expected educational disclosure: " + exact);
  }
  assert.doesNotMatch(story, /retorno garantizado|impresiones verificadas|usuarios alcanzados: [0-9]/i);
});


test("animated opacity layers are not read as three simultaneous screen-reader chapters", () => {
  assert.match(story, /className=\{styles\.chapterWindow\}[\s\S]*?aria-hidden="true"/);
  assert.match(story, /className=\{styles\.accessibleSummary\}/);
  assert.match(story, /<li key=\{chapter\.number\}>/);
  assert.match(story, /aria-label="De tu idea a la ciudad: recorrido publicitario ilustrativo"/);
  for (const stage of ["taxi", "tablet", "report"]) {
    assert.ok(story.includes('data-tad-stage="' + stage + '"'), stage + " QA marker absent");
  }
});

function rgb(hex) {
  return hex.match(/[a-f0-9]{2}/ig).map(value => parseInt(value, 16) / 255);
}
function brightness(hex) {
  const [r, g, b] = rgb(hex).map(value =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(foreground, background) {
  const a = brightness(foreground);
  const b = brightness(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

test("white editorial text tones meet WCAG AA contrast", () => {
  const values = [
    ["motion headline accent", "#806300", "#ffffff", 3],
    ["motion chapter numbers", "#765d00", "#ffffff", 4.5],
    ["static cards' chapter labels", "#765d00", "#f5f5f2", 4.5],
    ["hero small-step counters", "#765c00", "#ffffff", 4.5],
    ["creative studio body", "#5e5e56", "#f7f7f2", 4.5],
  ];
  for (const [label, foreground, background, minimum] of values) {
    assert.ok(contrast(foreground, background) >= minimum,
      label + " must be at least " + minimum + ":1");
  }
  assert.match(storyCss, /\.sticky \{ top: 90px; height: calc\(100svh - 90px\); min-height: 0; \}/);
  assert.match(storyCss, /\.section \{ scroll-margin-top: 90px; \}/);
});
