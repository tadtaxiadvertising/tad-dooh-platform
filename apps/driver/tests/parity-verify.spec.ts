import { test, expect } from "@playwright/test";

const BASE = {
  advertiser: "http://127.0.0.1:3000/",
  driver: "http://127.0.0.1:3001/",
};

test("advertiser landing: cinematic parity + calculator", async ({ page }) => {
  await page.goto(BASE.advertiser, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  // title
  const title = await page.title();
  console.log("AD TITLE:", title);
  // budget calculator output
  const budget = await page.locator('output[id="budget-total"]').textContent();
  console.log("AD BUDGET:", budget?.trim());
  // expected parity
  await expect(page.locator('output[id="budget-total"]')).toBeVisible();
  await expect(page.locator('[data-slot="driver-earnings-lab"]')).toBeVisible();
});

test("driver landing: calculator present + headings", async ({ page }) => {
  await page.goto(BASE.driver, { waitUntil: "networkidle", timeout: 30000 });
  const title = await page.title();
  console.log("DR TITLE:", title);
  const calc = await page
    .locator('[data-slot="driver-earnings-lab"]')
    .isVisible();
  console.log("DR CALCULATOR VISIBLE:", calc);
  await expect(page.locator('[data-slot="driver-earnings-lab"]')).toBeVisible();
});
