import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import path from "node:path";

const enabled = process.env.CARD_CREATIVE_RECONCILIATION_ACCEPTANCE === "1";
const evidence = path.join("tmp", "card-creative-reconciliation");

test.describe("Card creative-system reconciliation", () => {
  test.skip(!enabled, "Set CARD_CREATIVE_RECONCILIATION_ACCEPTANCE=1 with the authenticated local fixture");
  test.setTimeout(240_000);

  test("authors Badge, Icon, text effects, backgrounds, Brand resources, motion, and reusable instances through visible UI", async ({ page }) => {
    page.setDefaultTimeout(12_000);
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto("/dashboard/card/edit", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("card-creative-tool-rail")).toBeVisible();
    await expect(page.getByTestId("card-contextual-inspector")).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "01-clean-editor-left-rail.png") });

    await page.getByTestId("composer-selection-breadcrumb").getByRole("button", { name: "Card", exact: true }).click();
    await page.getByTestId("composer-replace-blank").click();
    const root = page.getByTestId("card-root-canvas");

    await page.getByTestId("card-creative-tool-backgrounds").click();
    await expect(page.getByTestId("card-background-library")).toBeVisible();
    await page.getByRole("button", { name: "TapConnect Night" }).click();
    await expect(root.getByTestId("composition-background-renderer")).toHaveCSS("background-image", /linear-gradient/);
    await page.screenshot({ path: path.join(evidence, "02-gradient-card-background.png") });
    await page.getByRole("button", { name: "Dots" }).click();
    await expect(root.getByTestId("composition-background-renderer")).toHaveCSS("background-image", /radial-gradient/);
    await page.screenshot({ path: path.join(evidence, "03-pattern-background-library.png") });

    await page.getByTestId("card-creative-tool-brand").click();
    await expect(page.getByTestId("card-brand-drawer")).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "04-brand-logo-color-font-library.png") });
    await page.getByAltText("Primary logo preview").click();
    await expect(root.locator('[data-composition-node][data-primitive="image"]')).toHaveCount(1);

    await page.getByTestId("card-creative-tool-assets").click();
    await expect(page.getByTestId("card-assets-library")).toBeVisible();
    await page.getByRole("button", { name: "Place product thumbnail" }).click();
    await expect(root.locator('[data-composition-node][data-primitive="image"]')).toHaveCount(2);
    await page.screenshot({ path: path.join(evidence, "05-logo-and-product-thumbnail.png") });

    await page.getByTestId("card-creative-tool-elements").click();
    await expect(page.getByTestId("card-elements-library")).toBeVisible();
    await page.getByTestId("card-badge-library").getByRole("button", { name: "SALE", exact: true }).click();
    const badge = root.locator('[data-composition-node][data-primitive="shape"]').last();
    await expect(badge.locator('[data-badge-shape="pill"]')).toContainText("SALE");
    await expect(page.getByTestId("badge-wording-library")).toBeVisible();
    await page.getByTestId("card-contextual-inspector").locator("label").filter({ hasText: /^Shape/ }).locator("select").selectOption("burst");
    await expect(badge.locator('[data-badge-shape="burst"]')).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "06-editable-sale-badge.png") });

    await page.getByTestId("card-elements-library").getByRole("button", { name: /Map pin/ }).click();
    const iconId = await root.locator('[data-composition-node][data-primitive="shape"]').last().getAttribute("data-composition-node");
    expect(iconId).toBeTruthy();
    const icon = root.locator(`[data-composition-node="${iconId}"]`);
    await expect(icon.locator('[data-icon-id="map-pin"]')).toBeVisible();
    await page.getByTestId("visual-icon-browser").getByTestId("icon-option-heart").click();
    await expect(icon.locator('[data-icon-id="heart"]')).toBeVisible();
    await page.getByLabel("Icon color").fill("#ff33aa");
    await page.getByLabel("Motion preset").selectOption("glow_pulse");
    await page.screenshot({ path: path.join(evidence, "07-icon-browser-recolor-motion.png") });

    await page.getByTestId("card-creative-tool-text").click();
    await page.getByRole("button", { name: "Curved text" }).click();
    await expect(root.locator('[data-text-curve="arch_up"]')).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "08-curved-editable-text.png") });
    await page.getByRole("button", { name: "Metallic text" }).click();
    await expect(page.getByTestId("material-preset-library")).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "09-metallic-text-materials.png") });

    await page.getByTestId("card-creative-tool-layers").click();
    await page.getByTestId("card-layers-drawer").getByRole("button", { name: /Badge/ }).click();
    await page.getByTestId("card-layers-drawer").getByRole("button", { name: /Product thumbnail/ }).click({ modifiers: ["Shift"] });
    await expect(page.getByTestId("composer-multi-selection")).toContainText("2 Elements selected");
    await page.getByTestId("card-creative-tool-reusable").click();
    const initialResourceCount = await page.getByTestId("reusable-composition-resource").count();
    await page.getByLabel("Composition name").fill("Free Fries Tonight Acceptance");
    await page.getByRole("button", { name: "Save selection as reusable composition" }).click();
    const savedResource = page.getByTestId("reusable-composition-resource").last();
    await expect(savedResource).toContainText("Free Fries Tonight Acceptance");
    await expect(savedResource).toContainText("2 editable Elements");
    const beforeInstances = await root.locator("[data-composition-node]").count();
    await savedResource.getByRole("button", { name: "Place independent instance" }).click();
    await savedResource.getByRole("button", { name: "Place independent instance" }).click();
    await expect(root.locator("[data-composition-node]")).toHaveCount(beforeInstances + 4);
    const instanceIds = await root.locator("[data-composition-node][data-group]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-group")));
    expect(new Set(instanceIds.filter(Boolean)).size).toBeGreaterThanOrEqual(2);
    await page.screenshot({ path: path.join(evidence, "10-reusable-composition-instances.png") });

    await page.getByTestId("card-overflow-menu").locator("summary").click();
    await page.getByTestId("card-preview-motion").click();
    await expect(icon.locator('[data-motion-active="true"]')).toBeVisible();
    await page.getByTestId("card-restart-motion").click();
    await page.screenshot({ path: path.join(evidence, "11-motion-preview.png") });
    await page.getByTestId("card-reduced-motion-simulation").check();
    await expect(root.getByTestId("creative-composition-canvas")).toHaveAttribute("data-reduced-motion-simulation", "true");
    await page.screenshot({ path: path.join(evidence, "12-reduced-motion-preview.png") });

    await page.getByTestId("card-preview-as-customer").click();
    await expect(page.getByTestId("card-creative-tool-rail")).toHaveCount(0);
    await expect(page.getByTestId("card-contextual-inspector")).toHaveCount(0);
    await expect(page.locator('[data-edit-selects="true"]')).toHaveCount(0);
    await page.screenshot({ path: path.join(evidence, "13-clean-preview-draft.png") });
    await page.getByTestId("preview-exit").click();

    await page.getByTestId("card-save").first().click();
    await expect(page.getByTestId("studio-save-state")).toHaveAttribute("data-saved", "true", { timeout: 30_000 });
    const savedCount = await root.locator("[data-composition-node]").count();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("card-root-canvas").locator("[data-composition-node]")).toHaveCount(savedCount, { timeout: 60_000 });
    await expect(page.getByTestId("card-edit-workspace-host")).toHaveAttribute("data-reusable-composition-count", String(initialResourceCount + 1));
    await page.screenshot({ path: path.join(evidence, "14-saved-reloaded-state.png") });

    const a11y = await new AxeBuilder({ page }).analyze();
    expect(a11y.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical")).toEqual([]);
  });
});
