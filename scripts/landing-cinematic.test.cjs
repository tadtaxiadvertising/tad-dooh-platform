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
