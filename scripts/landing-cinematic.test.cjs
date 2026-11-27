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

  assert.match(landing, /<CityScene\s+city=\{city\}\s+objective=\{objective\}/);
  assert.match(landing, /className="landing-hero-cities"/);
  assert.match(landing, /aria-pressed=\{city === choice\}/);
  assert.match(landing, /setCity\(choice\)/);
  assert.match(scene, /data-city=\{city\}/);
  assert.match(styles, /landing-hero-cities button:focus-visible/);
  assert.match(styles, /min-height: 46px/);
  assert.match(landing, /setIncludeProduction\] = useState\(false\)/);
  assert.match(landing, /estimateCampaign\(config\)/);
});

test("Advertiser hero illustrates a mounted passenger display without external assets", () => {
  const scene = read("apps/advertiser/components/landing/CityScene.tsx");
  const css = read("apps/advertiser/components/landing/cabin-hero.module.css");
  assert.match(scene, /data-cabin-illustration/);
  assert.match(scene, /tablet detrás del reposacabezas del copiloto/);
  assert.match(scene, /className=\{styles\.seat\}/);
  assert.match(scene, /className=\{styles\.passenger\}/);
  assert.match(css, /animation: none;/);
  assert.match(css, /overflow-wrap: anywhere;/);
  assert.doesNotMatch(css, /url\(/i);
  assert.doesNotMatch(scene, /fetch\(|localStorage|dangerouslySetInnerHTML/);
});

test("Driver chapters are reversible and do not change the earnings helper", () => {
  const landing = read("apps/driver/components/landing/DriverLandingPage.tsx");
  const lab = read("apps/driver/components/landing/DriverEarningsLab.tsx");
  const styles = read("apps/driver/components/landing/driver-landing.module.css");

  assert.match(landing, /const \[channel, setChannel\] = useState<DriverChannel>\("screen"\)/);
  assert.match(landing, /aria-pressed=\{channel === item\.id\}/);
  assert.match(landing, /onClick=\{\(\) => setChannel\(item\.id\)\}/);
  assert.match(landing, /<DriverChannelJourney channel=\{channel\}/);
  assert.match(landing, /<DriverHeroVisual \/>/);
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


test("hero previews illustrate meaningful selections without changing commercial contracts", () => {
  const advertiser = read("apps/advertiser/components/landing/LandingPage.tsx");
  const scene = read("apps/advertiser/components/landing/CityScene.tsx");
  const content = read("apps/advertiser/lib/landing/content.ts");
  const advertiserCss = read("apps/advertiser/components/landing/landing.module.css");
  const driver = read("apps/driver/components/landing/DriverLandingPage.tsx");
  const driverCss = read("apps/driver/components/landing/driver-landing.module.css");

  assert.match(advertiser, /id="hero-campaign-objective"/);
  assert.match(advertiser, /setObjective\(nextObjective\)/);
  assert.match(advertiser, /recordPreview\(\{ objective: nextObjective \}\)/);
  assert.match(scene, /data-objective=\{role === "advertiser" \? objective : undefined\}/);
  assert.match(scene, /OBJECTIVES\[objective\]/);
  for (const objective of ["awareness", "launch", "local"]) {
    assert.match(scene, new RegExp(objective + ":"));
  }
  assert.match(content, /Va a su encuentro\./);
  assert.match(advertiserCss, /landing-stage-objective select:focus-visible/);
  assert.match(driver, /selected\.journey\.map/);
  for (const phrase of ["Campañas elegibles", "Venta aprobada", "Conductor activado"]) {
    assert.ok(driver.includes(phrase), "Missing visual milestone: " + phrase);
  }
  assert.match(driverCss, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(driverCss, /@media \(max-width: 580px\)/);
  assert.match(advertiser, /setIncludeProduction\] = useState\(false\)/);
  assert.match(driver, /<DriverEarningsLab signupEnabled=\{signupEnabled\} \/>/);
});


test("in-car brand preview stays local, bounded and understandable without changing payment rules", () => {
  const landing = read("apps/advertiser/components/landing/LandingPage.tsx");
  const scene = read("apps/advertiser/components/landing/CityScene.tsx");
  const css = read("apps/advertiser/components/landing/landing.module.css");
  assert.match(landing, /const \[brandName, setBrandName\] = useState\(""\)/);
  assert.match(landing, /<CityScene\s+city=\{city\}\s+objective=\{objective\}\s+brandName=\{brandName\}/);
  assert.match(landing, /id="hero-brand-name"/);
  assert.match(landing, /autoComplete="off"/);
  assert.match(landing, /maxLength=\{24\}/);
  assert.match(landing, /onChange=\{\(event\) => setBrandName\(event.target.value\)\}/);
  assert.match(scene, /displayBrand = brandName\.trim\(\)\.replace/);
  assert.match(scene, /displayBrand \|\| preview.first/);
  assert.match(css, /landing-stage-controls input:focus-visible/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\)/);
  assert.doesNotMatch(landing, /recordPreview\(\{[^}]*brandName/);
  assert.match(landing, /setIncludeProduction\] = useState\(false\)/);
});


test("Advertiser QR story uses a local image and reversible example previews without API writes", () => {
  const landing = read("apps/advertiser/components/landing/LandingPage.tsx");
  const story = read("apps/advertiser/components/landing/PassengerQrStory.tsx");
  const css = read("apps/advertiser/components/landing/passenger-qr-story.module.css");
  const image = read("apps/advertiser/public/qr-passenger-journey.svg");
  const copy = read("apps/advertiser/lib/landing/content.ts");

  assert.match(landing, /<PassengerQrStory brandName=\{brandName\} \/>/);
  assert.match(landing, /href="#interaccion-qr"/);
  assert.match(story, /useState<Example>\("restaurante"\)/);
  assert.match(story, /aria-pressed=\{selected === key\}/);
  assert.match(story, /setSelected\(key\);\s*setScanned\(false\);/);
  assert.match(story, /useState\(false\)/);
  assert.match(story, /setScanned\(\(current\) => !current\)/);
  assert.match(story, /aria-controls="qr-demo-destination"/);
  assert.match(story, /Simular escaneo del QR/);
  assert.match(story, /Reiniciar demostración/);
  assert.match(css, /\.scanButton:focus-visible/);
  assert.match(story, /aria-live="polite"/);
  assert.match(story, /loading="lazy"/);
  assert.match(story, /src="\/qr-passenger-journey\.svg"/);
  assert.match(story, /brandName\.trim\(\)\.replace/);
  for (const example of ["restaurante", "comercio", "evento", "inmobiliaria", "hotel", "servicios"]) {
    assert.ok(story.includes(example + ":"), "QR storyboard missing " + example);
  }
  assert.match(story, /no son escaneables/);
  assert.doesNotMatch(story, /fetch\(|trackAnalyticsEvent|localStorage|createObjectURL|href=\{example\./);
  assert.match(css, /@media \(max-width: 600px\)/);
  assert.match(css, /\.choices button:focus-visible/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(image, /^<svg[\s\S]+<\/svg>\s*$/);
  assert.doesNotMatch(image, /<script\b|<(?:image|use)\b[^>]*https?:\/\//i);
  assert.match(copy, /¿Cómo interactúan los pasajeros con una promoción mediante QR\?/);
});


test("mobile narrative has three original decorative vector scenes without external assets", () => {
  const story = read("apps/advertiser/components/landing/TaxiScrollStory.tsx");
  const art = read("apps/advertiser/components/landing/StoryChapterArt.tsx");
  const css = read("apps/advertiser/components/landing/taxi-scroll-story.module.css");
  assert.match(story, /<StoryChapterArt chapter=\{index\} \/>/);
  assert.match(story, /data-static-art=\{index\}/);
  assert.match(art, /viewBox="0 0 480 240"/);
  assert.match(art, /aria-hidden="true"/);
  assert.match(art, /chapter === 0/);
  assert.match(art, /chapter === 1/);
  assert.doesNotMatch(art, /https?:|<image\b|fetch\(|dangerouslySetInnerHTML/);
  assert.match(css, /staticPicture\[data-static-art\] svg/);
});
