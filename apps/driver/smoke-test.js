const { chromium } = require("playwright");
(async () => {
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  console.log("Browser launched!");
  const page = await browser.newPage();
  console.log("Navigating to advertiser...");
  await page.goto("http://127.0.0.1:3000/", { waitUntil: "domcontentloaded", timeout: 30000 });
  console.log("Title:", await page.title());
  await page.screenshot({ path: "C:/tad-dooh-platform/scripts/ad-home.png" });
  await browser.close();
  console.log("DONE");
})();
