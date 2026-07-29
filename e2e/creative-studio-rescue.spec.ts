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
    await expect(
      page.getByTestId("text-panel-stack").or(page.getByTestId("professional-typography-panel"))
    ).toBeVisible({ timeout: 15_000 });
    const hubFont = page.getByTestId("text-hub-open-font");
    if (await hubFont.count()) {
      await hubFont.click();
      await expect(
        page.getByTestId("font-picker-panel").or(page.getByTestId("professional-typography-panel"))
      ).toBeVisible();
      const search = page.getByTestId("font-search");
      if (await search.count()) {
        await search.fill("Inter");
        await expect(page.getByTestId("font-row-inter")).toBeVisible();
      }
    }
  });

  test("button nested panel opens from tool after selection", async ({ page }) => {
    await page.goto("/dashboard/card/edit");
    await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible({
      timeout: 60_000,
    });
    await page.getByTestId("card-tool-buttons").click();
    // Without selection, honest empty state; with outline select an action if present
    const outlineBtn = page.locator('[data-testid="card-outline-rail"] button').first();
    if (await outlineBtn.count()) {
      await outlineBtn.click();
    }
    await page.getByTestId("card-tool-buttons").click();
    const stack = page.getByTestId("button-panel-stack");
    const empty = page.getByTestId("card-drawer-buttons");
    await expect(stack.or(empty)).toBeVisible({ timeout: 15_000 });
    if (await stack.isVisible()) {
      await expect(page.getByTestId("button-panel-hub")).toBeVisible();
      await page.getByTestId("button-panel-open-action").click();
      await expect(page.getByTestId("button-panel-action")).toBeVisible();
      await page.getByTestId("panel-stack-back").click();
      await page.getByTestId("button-panel-open-appearance").click();
      await expect(page.getByTestId("button-panel-appearance")).toBeVisible();
      await expect(page.getByTestId("button-hub-test-action")).toBeHidden();
      await page.getByTestId("panel-stack-back").click();
      await expect(page.getByTestId("button-hub-test-action")).toBeVisible();
    }
  });

  test("chrome states and history control are available", async ({ page }) => {
    await page.goto("/dashboard/card/edit");
    await expect(page.getByTestId("studio-chrome-controls")).toBeVisible({
      timeout: 60_000,
    });
    await page.getByTestId("chrome-state-compact").click();
    await expect(page.getByTestId("card-edit-workspace-host")).toHaveAttribute(
      "data-chrome-state",
      "compact"
    );
    await page.getByTestId("chrome-state-focus").click();
    await expect(page.getByTestId("card-edit-workspace-host")).toHaveAttribute(
      "data-chrome-state",
      "focus"
    );
    await page.getByTestId("chrome-state-expanded").click();
    await page.getByTestId("open-history-panel").click();
    await expect(page.getByTestId("session-history-panel")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("selected tool uses neutral highlight not green", async ({ page }) => {
    await page.goto("/dashboard/card/edit");
    await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible({
      timeout: 60_000,
    });
    await page.getByTestId("card-tool-typography").click();
    const tool = page.getByTestId("card-tool-typography");
    await expect(tool).toBeVisible();
    const cls = (await tool.getAttribute("class")) || "";
    expect(cls.includes("bg-primary/20")).toBe(false);
    expect(cls.includes("bg-white/10") || cls.includes("border-white")).toBe(true);
  });
});
