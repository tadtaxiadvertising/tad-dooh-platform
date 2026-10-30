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

  test("preserves values while moving through the three registration steps", async ({
    page,
  }) => {
    await page.goto("/register");

    await page.getByLabel("Nombre completo").fill("María Conductora");
    await page.getByLabel("Teléfono").fill("8095550101");
    await page.getByRole("button", { name: "Continuar" }).click();

    await page.getByLabel("Modelo del vehículo").fill("Toyota Prius");
    await page.getByLabel("Placa").fill("A123456");
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("button", { name: "Atrás" }).click();

    await expect(page.getByLabel("Modelo del vehículo")).toHaveValue("Toyota Prius");
    await expect(page.getByLabel("Placa")).toHaveValue("A123456");
    await page.getByRole("button", { name: "Atrás" }).click();
    await expect(page.getByLabel("Nombre completo")).toHaveValue("María Conductora");
    await expect(page.getByLabel("Teléfono")).toHaveValue("8095550101");
  });

  test("rejects mismatched passwords without sending a request", async ({
    page,
  }) => {
    let requestCount = 0;
    await page.route("**/api/proxy/auth/driver/register", async (route) => {
      requestCount += 1;
      await route.fulfill({ status: 201, body: "{}" });
    });

    await page.goto("/register");
    await page.getByLabel("Nombre completo").fill("María Conductora");
    await page.getByLabel("Teléfono").fill("8095550101");
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByLabel("Modelo del vehículo").fill("Toyota Prius");
    await page.getByLabel("Placa").fill("A123456");
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.locator('input[name="password"]').fill("SafePass123");
    await page.getByLabel("Confirmar contraseña").fill("Different123");
    await page.getByRole("button", { name: "Crear cuenta" }).click();

    await expect(page.locator('p[role="alert"]')).toContainText(
      "Las contraseñas no coinciden",
    );
    expect(requestCount).toBe(0);
  });

  test("sends the existing payload once and reports a pending approval", async ({
    page,
  }) => {
    const requests: Record<string, unknown>[] = [];
    await page.route("**/api/proxy/auth/driver/register", async (route) => {
      requests.push(route.request().postDataJSON());
      await route.fulfill({ status: 201, body: "{}" });
    });

    await page.goto("/register");
    await page.getByLabel("Nombre completo").fill("María Conductora");
    await page.getByLabel("Teléfono").fill("8095550101");
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByLabel("Modelo del vehículo").fill("Toyota Prius");
    await page.getByLabel("Placa").fill("A123456");
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.locator('input[name="password"]').fill("SafePass123");
    await page.getByLabel("Confirmar contraseña").fill("SafePass123");
    await page.getByRole("button", { name: "Crear cuenta" }).click();

    await expect(page.getByRole("status")).toContainText("pendiente");
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0]).toEqual({
      name: "María Conductora",
      phone: "8095550101",
      password: "SafePass123",
      vehicleModel: "Toyota Prius",
      licensePlate: "A123456",
    });
  });

  test("shows a backend error and remains recoverable", async ({ page }) => {
    await page.route("**/api/proxy/auth/driver/register", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ message: "El teléfono ya está registrado." }),
      });
    });

    await page.goto("/register");
    await page.getByLabel("Nombre completo").fill("María Conductora");
    await page.getByLabel("Teléfono").fill("8095550101");
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByLabel("Modelo del vehículo").fill("Toyota Prius");
    await page.getByLabel("Placa").fill("A123456");
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.locator('input[name="password"]').fill("SafePass123");
    await page.getByLabel("Confirmar contraseña").fill("SafePass123");
    await page.getByRole("button", { name: "Crear cuenta" }).click();

    await expect(page.locator('p[role="alert"]')).toContainText(
      "El teléfono ya está registrado",
    );
    await expect(page.getByRole("button", { name: "Crear cuenta" })).toBeEnabled();
  });
});
