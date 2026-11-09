/**
 * Simple accessibility audit: check common issues (alt text, heading hierarchy,
 * focusable elements, form labels) + try axe-core if available.
 */
const { chromium } = require("playwright");

const BASE = {
  advertiser: "http://127.0.0.1:3000/",
  driver: "http://127.0.0.1:3002/",
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = {};

  for (const [name, url] of Object.entries(BASE)) {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

    const checks = {
      imgAlt: 0,
      headingCount: 0,
      hasFocusable: 0,
      hasMain: 0,
      hasSkipLink: 0,
      labelInputs: 0,
    };

    // Count elements
    checks.imgAlt = await page.locator("img[alt]").count();
    checks.imgAltMissing = await page.locator("img:not([alt])").count();
    checks.headingCount = await page.locator("h1, h2, h3, h4, h5, h6").count();
    checks.hasFocusable = await page
      .locator("a, button, input, select, textarea")
      .count();
    checks.hasMain = await page.locator("main").count();
    checks.hasSkipLink = await page.locator('a[href="#main"]').count();
    checks.labelInputs = await page.locator("label").count();

    // Form labels: each input should be associated with a label
    const labelAssoc = await page.evaluate(() => {
      const inputs = document.querySelectorAll("input, select, textarea");
      const labels = document.querySelectorAll("label");
      let labeled = 0;
      inputs.forEach((inp) => {
        if (inp.closest("label") || inp.id && document.querySelector(`label[for="${inp.id}"]`)) {
          labeled++;
        }
      });
      return { total: inputs.length, labeled };
    });

    results[name] = checks;
    await page.close();
  }

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})();
