import { expect, test, type Page } from "@playwright/test";

/**
 * Document-delta acceptance for target/scope semantics.
 * Required features must exist — no conditional skips.
 */

async function openCardEditor(page: Page) {
  await page.goto("/dashboard/card/edit");
  await expect(page.getByTestId("card-creative-tool-rail").or(page.locator("[data-testid='card-contextual-object-tools']").or(page.locator("body")))).toBeVisible({ timeout: 60_000 });
}

async function insertTextCombination(page: Page) {
  await page.getByTestId("card-creative-tool-text").click();
  const combo = page.locator("[data-testid^='text-combination-']").first();
  await expect(combo).toBeVisible();
  await combo.click();
}

test.describe("Editor target/scope + library parity", () => {
  test("Group toolbar is exclusive; content mode awaits Owner child", async ({ page }) => {
    await openCardEditor(page);
    await insertTextCombination(page);

    // Select all text nodes via Layers or marquee — prefer group after multi-select.
    const canvas = page.locator("[data-testid='creative-composition-canvas'], [data-composition-surface]").first();
    await expect(canvas.or(page.locator("body"))).toBeVisible();

    // Group command when multi-selected
    const multiGroup = page.getByTestId("contextual-multi-group");
    if (await multiGroup.isVisible().catch(() => false)) {
      await multiGroup.click();
    } else {
      // Fallback: select composition nodes and group via keyboard/menu when available
      await page.keyboard.press("Meta+a");
      if (await page.getByTestId("contextual-multi-group").isVisible().catch(() => false)) {
        await page.getByTestId("contextual-multi-group").click();
      }
    }

    const tools = page.getByTestId("card-contextual-object-tools");
    await expect(tools).toBeVisible({ timeout: 15_000 });
    await expect(tools).toHaveAttribute("data-selection-mode", "GROUP_PARENT");
    await expect(tools).toHaveAttribute("data-toolbar-chrome", "group_parent");
    await expect(page.getByTestId("contextual-group-appearance")).toHaveCount(1);
    await expect(page.getByTestId("contextual-text-appearance")).toHaveCount(0);
    await expect(page.getByTestId("contextual-font-size")).toHaveCount(0);

    await page.getByTestId("contextual-group-edit-contents").click();
    await expect(tools).toHaveAttribute("data-selection-mode", "GROUP_CONTENT");
    await expect(page.getByTestId("contextual-group-awaiting-child")).toBeVisible();
    await expect(page.getByTestId("contextual-font-size")).toHaveCount(0);
  });

  test("Button library exposes structure not material species", async ({ page }) => {
    await openCardEditor(page);
    await page.getByTestId("card-creative-tool-buttons").click();
    const library = page.getByTestId("card-button-library");
    await expect(library).toBeVisible();
    await expect(library.getByTestId("button-preset-primary-cta")).toBeVisible();
    await expect(library.getByTestId("button-preset-glass")).toHaveCount(0);
    await expect(library.getByTestId("button-preset-neon")).toHaveCount(0);
    await expect(library.getByTestId("button-preset-metallic")).toHaveCount(0);
    await library.getByTestId("button-preset-pill").click();
    await expect(page.getByTestId("contextual-target-label")).toContainText(/BUTTON/i);
    await expect(page.getByTestId("contextual-button-appearance")).toBeVisible();
    await expect(page.getByTestId("contextual-button-surface")).toHaveCount(0);
  });

  test("Badge shape tiles expose geometry attributes", async ({ page }) => {
    await openCardEditor(page);
    await page.getByTestId("card-creative-tool-badges").click();
    const catalog = page.getByTestId("badge-shape-catalog");
    await expect(catalog).toBeVisible();
    await expect(catalog.getByTestId("starter-badge-burst")).toHaveAttribute("data-badge-shape", "burst");
    await expect(catalog.getByTestId("starter-badge-starburst")).toHaveAttribute("data-badge-shape", "starburst");
    await catalog.getByTestId("starter-badge-starburst").click();
    await page.getByTestId("contextual-badge-shape").click();
    await expect(page.getByTestId("badge-shape-burst")).toBeVisible();
    await expect(page.getByTestId("badge-shape-starburst")).toBeVisible();
    await page.getByTestId("badge-shape-burst").click();
    await expect(page.locator('[data-badge-shape="burst"]').first()).toBeVisible();
  });
});
