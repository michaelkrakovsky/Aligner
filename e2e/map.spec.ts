import { expect, test } from "@playwright/test";

// Each test gets a fresh browser context, so the map starts from the
// medical testing template every time.

test("opens the template map with swim lanes and the overview panel", async ({ page }) => {
  await page.goto("/map");

  await expect(page.getByLabel("Map name")).toHaveValue("Member journey");
  const canvas = page.getByTestId("map-canvas");
  for (const lane of ["Digital", "Physical", "Data"]) {
    await expect(canvas.getByText(lane, { exact: true }).first()).toBeVisible();
  }
  await expect(page.getByTestId("map-node-missing")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Map overview" })).toBeVisible();
  await expect(page.getByText("Issues (3)")).toBeVisible();
});

test("selecting a node opens its panel and edits show on the canvas", async ({ page }) => {
  await page.goto("/map");

  await page.getByTestId("map-node-missing").click();
  const title = page.getByLabel("Title");
  await expect(title).toHaveValue("Results never arrive");
  await expect(page.getByLabel("Trigger condition")).toHaveValue(
    "No result in the account 5 days after the test",
  );

  await title.fill("Results go missing");
  await expect(page.getByTestId("map-node-missing")).toContainText("Results go missing");

  await page.getByLabel("No SOP yet").check();
  await page.getByTestId("map-canvas").click({ position: { x: 300, y: 15 } });
  await expect(page.getByText("Issues (2)")).toBeVisible();
});

test("adds a variation branching from the selected node", async ({ page }) => {
  await page.goto("/map");

  await expect(page.getByRole("button", { name: "+ Variation" })).toBeDisabled();
  await page.getByTestId("map-node-test").click();
  await page.getByRole("button", { name: "+ Variation" }).click();

  await expect(page.getByLabel("Title")).toHaveValue("New variation");
  await expect(page.getByLabel("Type")).toHaveValue("variation");
  await expect(page.getByText("Needs a trigger condition")).toBeVisible();
});

test("keeps edits after a reload", async ({ page }) => {
  await page.goto("/map");

  await page.getByLabel("Map name").fill("Results delivery");
  await page.reload();

  await expect(page.getByLabel("Map name")).toHaveValue("Results delivery");
});
