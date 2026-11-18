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
