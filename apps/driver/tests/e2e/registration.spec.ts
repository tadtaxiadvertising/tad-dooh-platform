import { expect, test } from "@playwright/test";

test.describe("Driver registration public routing", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("an anonymous visitor can open the canonical registration page", async ({
    page,
  }) => {
    const response = await page.goto("/register");

    expect(response?.ok()).toBeTruthy();
    await expect(page).toHaveURL(/\/register$/);
    await expect(
      page.getByRole("heading", { name: "Únete a la red TAD" }),
    ).toBeVisible();
  });

  test("the driver login CTA targets the canonical registration page", async ({
    page,
  }) => {
    await page.goto("/driver/login");

    await expect(page.getByRole("link", { name: "Crear cuenta" })).toHaveAttribute(
      "href",
      "/register",
    );
  });

  test("the driver dashboard remains protected for anonymous visitors", async ({
    page,
  }) => {
    await page.goto("/driver/dashboard");

    await expect(page).toHaveURL(/\/driver\/login(?:\?.*)?$/);
  });
});
