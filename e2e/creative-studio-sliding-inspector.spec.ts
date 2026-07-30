import { expect, test } from "@playwright/test";

/**
 * Route-level proof: /dashboard/card/edit Contextual Inspector
 * uses a visibly horizontal Sliding Panel Stack (NestedPanelShell).
 */
test.describe("creative studio sliding inspector", () => {
  test("Appearance hub slides L0 → L1 and Back reverses", async ({ page }) => {
    await page.goto("/dashboard/card/edit", { waitUntil: "networkidle" });
    await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByTestId("card-tool-appearance")).toBeVisible();
    // Closed until a left-rail tool is selected
    await expect(page.getByTestId("card-contextual-drawer")).toHaveCount(0);

    await page.getByTestId("card-tool-appearance").click();
    const stack = page.getByTestId("appearance-panel-stack");
    await expect(stack).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("card-contextual-drawer")).toHaveAttribute(
      "data-drawer-entered",
      "true",
      { timeout: 3_000 }
    );
    await expect(stack).toHaveAttribute("data-sliding-panel-stack", "true");
    await expect(stack).toHaveAttribute("data-panel-depth", "0");
    await expect(stack).toHaveAttribute("data-panel-slide-ms", "560");
    await expect(page.getByTestId("appearance-panel-hub")).toBeVisible();
    await expect(page.locator("[data-panel-slide-track]")).toHaveCount(1);

    // Fragmented Colors / Brand / Layout tools are not on the primary rail
    await expect(page.getByTestId("card-tool-colors")).toHaveCount(0);
    await expect(page.getByTestId("card-tool-brand")).toHaveCount(0);
    await expect(page.getByTestId("card-tool-layout")).toHaveCount(0);

    await expect(
      page.getByTestId("adaptive-drawer-header-suppressed")
    ).toBeAttached();

    await page.getByTestId("appearance-open-colors").click();
    await expect(stack).toHaveAttribute("data-panel-depth", "1");
    // Dual-pane track briefly mounts both panes during the horizontal slide
    await expect(
      page.locator('[data-panel-slide-pane="incoming"]')
    ).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId("appearance-panel-colors")).toBeVisible({
      timeout: 8_000,
    });
    await expect(page.getByTestId("panel-stack-back")).toBeVisible();

    await page.getByTestId("panel-stack-back").click();
    await expect(stack).toHaveAttribute("data-panel-depth", "0");
    await expect(page.getByTestId("appearance-panel-hub")).toBeVisible({
      timeout: 8_000,
    });
  });

  test("Inspector Selection Hub opens and Close collapses drawer", async ({
    page,
  }) => {
    await page.goto("/dashboard/card/edit", { waitUntil: "networkidle" });
    await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible({
      timeout: 60_000,
    });

    await page.getByTestId("card-tool-content").click();
    const stack = page.getByTestId("selection-panel-stack");
    await expect(stack).toBeVisible({ timeout: 20_000 });
    await expect(stack).toHaveAttribute("data-sliding-panel-stack", "true");
    await expect(page.getByTestId("selection-panel-hub")).toBeVisible();

    await page.getByTestId("panel-stack-close").click();
    await expect(page.getByTestId("card-contextual-drawer")).toHaveCount(0);
  });

  test("Composition stack slides to L1 and L2 with Back", async ({ page }) => {
    await page.goto("/dashboard/card/edit", { waitUntil: "networkidle" });
    await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible({
      timeout: 60_000,
    });

    await page.getByTestId("card-tool-composition").click();
    const add = page.getByTestId("composition-drawer-add");
    if (await add.isVisible().catch(() => false)) {
      await add.click();
    }
    const stack = page.getByTestId("composition-panel-stack");
    await expect(stack).toBeVisible({ timeout: 20_000 });
    await expect(stack).toHaveAttribute("data-sliding-panel-stack", "true");
    await expect(stack).toHaveAttribute("data-panel-depth", "0");

    await page.getByTestId("composition-open-layering").click();
    await expect(stack).toHaveAttribute("data-panel-depth", "1");
    await expect(page.getByTestId("composition-panel-layering")).toBeVisible();
    await expect(stack).toHaveAttribute("data-panel-slide-direction", "forward");

    await page.getByTestId("panel-stack-back").click();
    await expect(stack).toHaveAttribute("data-panel-depth", "0");
    await expect(stack).toHaveAttribute("data-panel-slide-direction", "back");
  });
});
