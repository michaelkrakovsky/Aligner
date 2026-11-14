import { expect, test } from "@playwright/test";

// These run without a Supabase session, so they cover what a signed-out
// visitor sees. Signed-in flows are covered by component tests.

test("the sign in page offers Google and email", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { level: 1, name: "Aligner" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Sign in" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();

  await page.getByRole("tab", { name: "Create account" }).click();
  await expect(
    page.getByRole("button", { name: "Create account", exact: true }),
  ).toBeVisible();
});

for (const path of ["/", "/maps", "/maps/6f1c1d6e-6a52-4c37-9a39-4a1d0b8f6a11"]) {
  test(`signed-out visitors to ${path} go to sign in`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  });
}

test("a failed sign in link shows an error", async ({ page }) => {
  await page.goto("/login?error=callback");
  await expect(
    page.getByRole("alert").filter({ hasText: "didn't work" }),
  ).toBeVisible();
});
