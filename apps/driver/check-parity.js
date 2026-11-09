const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const [name, url] of [
    ["AD", "http://127.0.0.1:3000/"],
    ["DR", "http://127.0.0.1:3001/"],
  ]) {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    const title = await page.title();
    const budget = await page
      .locator('output[id="budget-total"]')
      .textContent()
      .catch(() => "NA");
    const calc = await page
      .locator('[data-slot="driver-earnings-lab"]')
      .isVisible()
      .catch(() => false);
    console.log(`${name} TITLE: ${title}`);
    console.log(`${name} BUDGET: ${budget}`);
    console.log(`${name} DRIVER_CALC: ${calc}`);
    await page.close();
  }
  await browser.close();
})();
