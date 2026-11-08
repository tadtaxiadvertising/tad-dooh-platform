const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");

test("Advertiser cinematic scene follows its existing campaign city, with real buttons", () => {
  const landing = read("apps/advertiser/components/landing/LandingPage.tsx");
  const scene = read("apps/advertiser/components/landing/CityScene.tsx");
  const styles = read("apps/advertiser/components/landing/landing.module.css");

  assert.match(landing, /<CityScene city=\{city\}/);
  assert.match(landing, /className="landing-hero-cities"/);
  assert.match(landing, /aria-pressed=\{city === choice\}/);
  assert.match(landing, /setCity\(choice\)/);
  assert.match(scene, /data-city=\{city\}/);
  assert.match(styles, /landing-hero-cities button:focus-visible/);
  assert.match(styles, /min-height: 46px/);
  assert.match(landing, /setIncludeProduction\] = useState\(false\)/);
  assert.match(landing, /estimateCampaign\(config\)/);
});

test("Driver chapters are reversible and do not change the earnings helper", () => {
  const landing = read("apps/driver/components/landing/DriverLandingPage.tsx");
  const lab = read("apps/driver/components/landing/DriverEarningsLab.tsx");
  const styles = read("apps/driver/components/landing/driver-landing.module.css");

  assert.match(landing, /const \[channel, setChannel\] = useState<DriverChannel>\("screen"\)/);
  assert.match(landing, /aria-pressed=\{channel === item\.id\}/);
  assert.match(landing, /onClick=\{\(\) => setChannel\(item\.id\)\}/);
  assert.match(landing, /<TaxiIllustration channel=\{channel\}/);
  assert.match(landing, /id="driver-channel-summary"/);
  assert.match(landing, /aria-live="polite"/);
  for (const label of ["Pantalla", "Ventas", "Referidos"]) {
    assert.ok(landing.includes(label), "Missing income chapter " + label);
  }
  assert.match(styles, /heroChannels button:focus-visible/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
  assert.match(lab, /previewDriverEarnings\(ads, sales, referrals\)/);
  assert.match(landing, /signupEnabled \? "\/register" : "#como-participar"/);
});


test("public landing skip links target a focusable main landmark", () => {
  const advertiser = read("apps/advertiser/components/landing/LandingPage.tsx");
  const driver = read("apps/driver/components/landing/DriverLandingPage.tsx");
  assert.match(advertiser, /href="#main-content"/);
  assert.match(advertiser, /<main id="main-content" tabIndex=\{-1\}>/);
  assert.match(driver, /href="#contenido"/);
  assert.match(driver, /<main id="contenido" tabIndex=\{-1\}>/);
});

test("public landing SEO and driver earnings test hook preserve the branch intent", () => {
  const layout = read("apps/advertiser/app/layout.tsx");
  const driver = read("apps/driver/components/landing/DriverLandingPage.tsx");
  const lab = read("apps/driver/components/landing/DriverEarningsLab.tsx");
  assert.match(layout, /robots: \{ index: true, follow: true \}/);
  assert.match(driver, /name="robots" content="index, follow"/);
  assert.match(driver, /rel="canonical" href="https:\/\/tad\.driver\.ibusiness\.com\.do\/"/);
  assert.match(lab, /data-slot="driver-earnings-lab"/);
  assert.match(lab, /previewDriverEarnings\(ads, sales, referrals\)/);
});

test("driver standalone build, start script and CI server location stay consistent", () => {
  const config = read("apps/driver/next.config.ts");
  const pkg = JSON.parse(read("apps/driver/package.json"));
  const workflow = read(".github/workflows/landing-v5-checks.yml");
  assert.match(config, /output: "standalone"/);
  assert.match(config, /outputFileTracingRoot: path\.join\(__dirname, "\.\.\/\.\."\)/);
  assert.equal(pkg.scripts.start, "node .next/standalone/server.js");
  assert.match(workflow, /apps\/driver\/server\.js/);
});
