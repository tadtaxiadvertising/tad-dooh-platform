import { test, expect } from "@playwright/test";

const BASE = {
  advertiser: "http://127.0.0.1:3000/",
  driver: "http://127.0.0.1:3002/",
};

test("advertiser landing: static content + calculator visible", async ({
  page,
}) => {
  await page.goto(BASE.advertiser, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  const title = await page.title();
  console.log("AD TITLE:", title);
  const budget = await page.locator('output[id="budget-total"]').textContent();
  console.log("AD BUDGET:", budget?.trim());
  await expect(page.locator('output[id="budget-total"]')).toBeVisible();
});

test("driver landing: calculator present + headings", async ({ page }) => {
  await page.goto(BASE.driver, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  const title = await page.title();
  console.log("DR TITLE:", title);
  const calc = await page
    .locator('[data-slot="driver-earnings-lab"]')
    .isVisible();
  console.log("DR CALCULATOR VISIBLE:", calc);
  await expect(page.locator('[data-slot="driver-earnings-lab"]')).toBeVisible();
});
