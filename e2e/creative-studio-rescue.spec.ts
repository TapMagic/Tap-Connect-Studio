import { expect, test } from "@playwright/test";

/**
 * Creative Studio Rescue — targeted interaction proofs.
 * Full Owner walkthrough remains manual via tmp/creative-studio-rescue/OWNER_PUNCH_LIST.md
 */

test.describe("creative studio rescue", () => {
  test("edit workspace exposes preview-as-customer and undo chrome", async ({
    page,
  }) => {
    await page.goto("/dashboard/card/edit");
    await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByTestId("card-edit-workspace-host")).toHaveAttribute(
      "data-studio-mode",
      "edit"
    );
    await expect(page.getByTestId("card-undo")).toBeVisible();
    await expect(page.getByTestId("card-redo")).toBeVisible();
    await expect(page.getByTestId("studio-save-state")).toBeVisible();
    await expect(page.getByTestId("card-preview-as-customer")).toBeVisible();
    await expect(page.getByTestId("card-edit-done-link")).toContainText(
      "Back to Card overview"
    );

    await page.getByTestId("card-preview-as-customer").click();
    await expect(page.getByTestId("card-edit-workspace-host")).toHaveAttribute(
      "data-studio-mode",
      "preview"
    );
    await expect(page.getByTestId("preview-toolbar")).toBeVisible();
    await page.getByTestId("preview-viewport-tablet").click();
    await expect(page.getByTestId("card-canvas-viewport")).toHaveAttribute(
      "data-preview-viewport",
      "tablet"
    );
    await page.getByTestId("preview-exit").click();
    await expect(page.getByTestId("card-edit-workspace-host")).toHaveAttribute(
      "data-studio-mode",
      "edit"
    );
  });

  test("typography tool opens professional font panel", async ({ page }) => {
    await page.goto("/dashboard/card/edit");
    await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible({
      timeout: 60_000,
    });
    await page.getByTestId("card-tool-typography").click();
    await expect(page.getByTestId("professional-typography-panel")).toBeVisible({
      timeout: 15_000,
    });
    await page.getByTestId("text-panel-open-font").click();
    await expect(page.getByTestId("font-picker-panel")).toBeVisible();
    await page.getByTestId("font-search").fill("Inter");
    await expect(page.getByTestId("font-row-inter")).toBeVisible();
  });
});
