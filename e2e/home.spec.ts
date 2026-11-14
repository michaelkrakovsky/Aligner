import { expect, test } from "@playwright/test";

// The API is intercepted in the browser, so these tests never call Claude.

test("home page renders", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: "Hello, World" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Say hello to Claude" }),
  ).toBeEnabled();
});

test("asking Claude shows the reply", async ({ page }) => {
  await page.route("**/api/hello", (route) =>
    route.fulfill({ json: { text: "Hello from a mocked Claude" } }),
  );
  await page.goto("/");

  await page.getByRole("button", { name: "Say hello to Claude" }).click();

  await expect(page.getByText("Hello from a mocked Claude")).toBeVisible();
});
