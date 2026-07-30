import { expect, test, type Page } from "@playwright/test";

async function openComposition(page: Page) {
  await page.goto("/dashboard/card/edit", { waitUntil: "networkidle" });
  await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible({
    timeout: 60_000,
  });
  await page.getByTestId("card-tool-composition").click();
  const add = page.getByTestId("composition-drawer-add");
  if (await add.isVisible().catch(() => false)) await add.click();
  await expect(page.getByTestId("composition-panel-stack")).toBeVisible({
    timeout: 20_000,
  });
}

test.describe("Creative Studio capability completeness", () => {
  test("shared Media and Asset Browser is available in composition image workflow", async ({
    page,
  }) => {
    await openComposition(page);
    await page.getByTestId("composition-add-image").click();
    await expect(page.getByTestId("composition-panel-image")).toBeVisible();
    await page.getByTestId("open-shared-media-browser").click();

    const browser = page.getByTestId("shared-media-browser");
    await expect(browser).toBeVisible();
    for (const source of [
      "studio",
      "brand",
      "recent",
      "favorites",
      "pexels",
      "logo_dev",
      "upload",
      "url",
    ]) {
      await expect(page.getByTestId(`media-source-${source}`)).toBeVisible();
    }
    await page.getByRole("button", { name: "Close Media and Asset Browser" }).click();
    await expect(browser).toHaveCount(0);
  });

  test("typed Gradient Studio replaces raw CSS editing", async ({ page }) => {
    await openComposition(page);
    await page.getByTestId("composition-open-background").click();
    await page.getByTestId("composition-bg-gradient").click();
    await expect(page.getByTestId("gradient-studio")).toBeVisible();
    await expect(page.getByTestId("gradient-start-color")).toBeVisible();
    await expect(page.getByTestId("gradient-end-color")).toBeVisible();
    await expect(page.getByTestId("gradient-angle")).toBeVisible();
    await expect(page.getByTestId("gradient-reverse")).toBeVisible();
    await page.getByTestId("gradient-advanced-toggle").click();
    await expect(page.getByTestId("gradient-add-stop")).toBeVisible();
    await expect(page.getByTestId("gradient-kind-radial")).toBeVisible();
    await expect(page.locator('input[data-testid="composition-bg-gradient"]')).toHaveCount(
      0
    );
  });

  test("frame controls expose exact/scaled stroke and searchable masks", async ({
    page,
  }) => {
    await openComposition(page);
    await page.getByTestId("composition-add-frame").click();
    await expect(page.getByTestId("composition-panel-frame")).toBeVisible();
    const scaleStroke = page.getByTestId("composition-frame-scale-stroke");
    await expect(scaleStroke).toBeVisible();
    await scaleStroke.uncheck();
    await expect(scaleStroke).not.toBeChecked();
    await page.getByTestId("composition-open-masks").click();
    await expect(page.getByTestId("frame-mask-browser")).toBeVisible();
    await page.getByTestId("mask-search").fill("shirt");
    await expect(page.getByTestId("composition-mask-shirt")).toBeVisible();
    await page.getByTestId("mask-category").selectOption({ label: "Apparel" });
    await expect(page.getByTestId("composition-mask-shirt")).toBeVisible();
  });
});

