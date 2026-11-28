const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const collapseLayout = (source) => source.replace(/\s+/g, " ");

test("advertiser creative reframe preserves the live estimate and explicit production opt-in", () => {
  const landing = read("apps/advertiser/components/landing/LandingPage.tsx");
  assert.doesNotMatch(landing, /estimateCampaign\(config\)/);
  assert.match(landing, /estimateCampaignDetailed\(config\)/);
  assert.match(landing, /setIncludeProduction\] = useState\(false\)/);
  assert.match(landing, /id="campaign-production"/);
  assert.match(landing, /checked=\{includeProduction\}/);
  assert.match(landing, /Subtotal ilustrativo · impuestos no incluidos/);
  assert.match(landing, /Añadir producción creativa opcional al ejemplo/);
  assert.match(collapseLayout(landing), /tarifas de esta simulación son ilustrativas y requieren confirmación comercial/);
  assert.doesNotMatch(landing, /@tad\/impact-calculator|Quiero contratar/);
  assert.doesNotMatch(landing, /RD\$1\.500\/mes · pantalla|Los tres sustratos que mueven el negocio/);
  assert.match(landing, /landing-hero-steps/);
  assert.match(landing, /ROLE_FAQS\.advertiser/);
});

test("driver creative reframe preserves three separate income streams and approval gates", () => {
  const landing = read("apps/driver/components/landing/DriverLandingPage.tsx");
  const lab = read("apps/driver/components/landing/DriverEarningsLab.tsx");
  assert.match(landing, /className=\{styles\.heroChannels\}/);
  for (const label of ["Pantalla", "Ventas", "Referidos"]) {
    assert.ok(landing.includes(label), "Missing path: " + label);
  }
  assert.match(landing, /signupEnabled \? "\/register" : "#como-participar"/);
  assert.match(lab, /previewDriverEarnings\(ads, sales, referrals\)/);
  assert.match(lab, /No son pagos recurrentes/);
  assert.match(lab, /Campañas elegibles · hasta 15 simultáneas/);
  assert.match(landing, /campañas elegibles en tu pantalla \(hasta 15 simultáneas\)/);
  assert.match(lab, /de 15 campañas simultáneas de ejemplo/);
  assert.doesNotMatch(lab, /15 anuncios \/ día/);
  assert.match(lab, /href=\{signupEnabled \? "\/register" : "#como-participar"\}/);
});

test("creative reframe remains responsive, reduced-motion friendly and asset-light", () => {
  const driver = read("apps/driver/components/landing/driver-landing.module.css");
  const advertiser = read("apps/advertiser/components/landing/landing.module.css");
  const earnings = read("apps/driver/components/landing/driver-earnings-lab.module.css");
  for (const css of [driver, advertiser, earnings]) {
    assert.ok(css.includes("Creative Reframe V4"), "Missing design layer");
    assert.match(css, /@media\s*\(max-width:\s*(?:380|400|580|760|800)px\)/);
  }
  for (const css of [driver, advertiser]) {
    assert.match(css, /@media\s*\(prefers-reduced-motion:\s*no-preference\)/);
    assert.match(css, /transform:\s*translate3d/);
    assert.doesNotMatch(css, /url\(\s*https?:/i, "Public landing must not add remote CSS assets");
  }
  assert.doesNotMatch(earnings, /\n\|\.rateTable\b/);
  assert.match(driver, /\.heroChannels/);
  assert.match(advertiser, /landing-hero-steps/);
  assert.match(advertiser, /landing-mobile-menu/);
  assert.match(driver, /\.mobileMenu/);
  assert.match(driver, /--yellow:\s*#ffd400/i);
  assert.match(advertiser, /--yellow:\s*#ffd400/i);
  assert.match(driver, /background:\s*#08090b/i);
  assert.match(advertiser, /background:\s*#08090b/i);
});

test("both public landings retain mobile navigation with working anchor destinations", () => {
  const advertiser = read("apps/advertiser/components/landing/LandingPage.tsx");
  const driver = read("apps/driver/components/landing/DriverLandingPage.tsx");
  assert.match(advertiser, /<details className="landing-mobile-menu">/);
  assert.match(advertiser, /aria-label="Secciones de anunciantes en móvil"/);
  assert.match(driver, /<details className=\{styles\.mobileMenu\}>/);
  for (const id of ["#como-funciona", "#experiencia", "#preguntas"]) {
    assert.ok(advertiser.includes(`href="${id}"`), "Advertiser anchor absent: " + id);
  }
  for (const id of ["#calculadora", "#como-participar", "#preguntas"]) {
    assert.ok(driver.includes(`href="${id}"`), "Driver anchor absent: " + id);
  }
  assert.match(collapseLayout(advertiser), /closest\("details"\)\s*\?\.\s*removeAttribute\("open"\)/);
  assert.match(collapseLayout(driver), /closest\("details"\)\s*\?\.\s*removeAttribute\("open"\)/);
});

test("financial outputs only animate after a changed amount, never on mount", () => {
  const advertiser = read("apps/advertiser/components/landing/LandingPage.tsx");
  const driver = read("apps/driver/components/landing/DriverEarningsLab.tsx");
  for (const [name, source] of [["advertiser", advertiser], ["driver", driver]]) {
    assert.doesNotMatch(source, /<motion\.output|key=\{(?:projection\.totalCost|result\.illustrativeTotalRD)\}/, name);
    assert.match(source, /\.animate\(/, name);
    assert.match(source, /duration:\s*180/, name);
    assert.match(source, /opacity:\s*0\.94/, name);
    assert.match(source, /typeof output\.animate !== "function"/, name);
    assert.match(source, /window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)\.matches/, name);
    assert.doesNotMatch(source, /from ["']framer-motion["']/, name);
    assert.match(source, /animation\.cancel\(\)/, name);
  }
  assert.match(advertiser, /<h1 id="hero-title">/);
  assert.match(advertiser, /ref=\{budgetOutputRef\}/);
  assert.match(driver, /ref=\{earningsOutputRef\}/);
  assert.doesNotMatch(driver, /<motion\.div|whileInView=|initial=\{false\}/);
  assert.match(driver, /<div key=\{id\} className=\{styles\.control\}>/);
});


test("driver range outputs expose numeric quantities and hide decorative rates from assistive tech", () => {
  const lab = read("apps/driver/components/landing/DriverEarningsLab.tsx");
  assert.match(collapseLayout(lab), /className=\{styles\.slots\} role="img" aria-label=/);
  assert.match(collapseLayout(lab), /className=\{styles\.value\}\s*>\s*\{value\}\s*<\/output>/);
  assert.match(collapseLayout(lab), /className=\{styles\.unit\} aria-hidden="true"\s*>\s*× RD\$500\s*<\/span>/);
  assert.doesNotMatch(lab, /<output[^>]+>[\s\S]{0,120}\$\{value\} × RD\$500/);
});

test("driver sales and referrals distinguish simulator display limits from commercial conditions", () => {
  const lab = read("apps/driver/components/landing/DriverEarningsLab.tsx");
  const css = read("apps/driver/components/landing/driver-earnings-lab.module.css");
  assert.doesNotMatch(lab, /subtitle:\s*"[^"]*sin límite"/);
  assert.match(lab, /hasta 100 en este simulador/);
  assert.match(lab, /hasta 100 simulados/);
  assert.match(collapseLayout(lab), /no define condiciones ni posibles límites contractuales/);
  assert.match(lab, /max:\s*100/);
  assert.match(css, /\.rangeNote/);
});


test("public landing financial disclosures stay readable on small screens", () => {
  const earnings = read("apps/driver/components/landing/driver-earnings-lab.module.css");
  const advertiser = read("apps/advertiser/components/landing/landing.module.css");

  // These are contract-critical labels and disclaimers, not decorative captions.
  assert.match(earnings, /\.controlTitle small \{[^}]*font-size:\s*13px/);
  assert.match(earnings, /\.control input\[type=range\] \{[^}]*min-height:\s*44px/);
  assert.match(earnings, /\.breakdown div \{[^}]*font-size:\s*13px; flex-wrap: wrap/);
  assert.match(earnings, /\.rateTable dd \{[^}]*font-size:\s*13px/);
  assert.match(earnings, /\.notice \{[^}]*font-size:\s*13px/);
  assert.match(earnings, /\.rangeNote \{[^}]*font-size:\s*13px; padding-inline: 2px/);

  assert.match(advertiser, /\.landing :global\(\.landing-preview label\) \{[^}]*font-size:\s*14px/);
  assert.match(advertiser, /\.landing :global\(\.landing-preview select\) \{[^}]*font-size:\s*14px; min-height:\s*48px/);
  assert.match(advertiser, /\.landing :global\(\.landing-preview input\[type=range\]\) \{[^}]*min-height:\s*44px/);
  assert.match(advertiser, /\.landing :global\(\.landing-production-option span\) \{[^}]*font-size:\s*14px/);
  assert.match(advertiser, /\.landing :global\(\.landing-estimate-detail\) \{[^}]*font-size:\s*13px/);
  assert.match(advertiser, /\.landing :global\(\.landing-warning-details\) \{[^}]*font-size:\s*13px/);
  assert.match(advertiser, /\.landing :global\(\.landing-disclaimer\) \{[^}]*font-size:\s*13px/);
});
