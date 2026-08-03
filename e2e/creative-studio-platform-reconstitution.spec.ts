import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

const enabled = process.env.CREATIVE_STUDIO_PLATFORM_ACCEPTANCE === "1";
const evidence = path.join("tmp", "creative-studio-platform");

test.describe.serial("Creative Studio platform reconstitution", () => {
  test.skip(!enabled, "Set CREATIVE_STUDIO_PLATFORM_ACCEPTANCE=1 with the isolated authenticated development fixture");
  test.setTimeout(300_000);

  test("excises the Inspector and proves themes, Buttons, nested content, AI, Adapt, Preview, and responsive shell", async ({ page }) => {
    mkdirSync(evidence, { recursive: true });
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto("/dashboard/card/edit", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("card-document-name")).toBeEnabled({ timeout: 60_000 });
    const sourceName = await page.getByTestId("card-document-name").inputValue();
    await expect(page.getByTestId("card-contextual-inspector")).toHaveCount(0);
    await expect(page.getByTestId("card-creative-tool-rail")).toBeVisible();
    await expect(page.getByTestId("card-creative-context-drawer")).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "01-dark-editor-no-right-inspector.png") });

    await page.getByTestId("editor-preferences-menu").locator("summary").click();
    await page.getByRole("group", { name: "Appearance" }).getByRole("radio", { name: "light", exact: true }).check();
    await expect(page.getByTestId("card-edit-workspace-host")).toHaveAttribute("data-resolved-appearance", "light");
    await page.getByRole("group", { name: "Pasteboard" }).getByRole("radio", { name: "checkerboard", exact: true }).check();
    await expect(page.getByTestId("card-edit-workspace-host")).toHaveAttribute("data-pasteboard-theme", "checkerboard");
    await page.screenshot({ path: path.join(evidence, "02-light-editor-checkerboard.png") });
    await page.getByTestId("editor-preferences-menu").locator("summary").click();

    const viewport = page.getByTestId("card-canvas-viewport");
    const widthWithDrawer = (await viewport.boundingBox())?.width || 0;
    await page.getByLabel("Close creative drawer").click();
    await expect(page.getByTestId("card-creative-context-drawer")).toHaveCount(0);
    await expect.poll(async () => (await viewport.boundingBox())?.width || 0).toBeGreaterThan(widthWithDrawer);
    await page.getByTestId("card-creative-tool-buttons").click();
    await expect(page.getByTestId("card-button-library")).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "03-button-visual-library.png") });

    await page.getByTestId("button-preset-call-round").click();
    const button = page.locator('[data-composition-node][data-primitive="button"][data-selected="true"]').last();
    await expect(button).toBeVisible();
    const buttonId = await button.getAttribute("data-composition-node");
    expect(buttonId).toBeTruthy();
    const persistedButton = page.locator(`[data-composition-node="${buttonId}"][data-primitive="button"]`).last();
    await expect(button.locator("[data-button-content-count]")).toHaveAttribute("data-button-content-count", "2");
    await page.getByTestId("contextual-button-content").click();
    await expect(page.getByTestId("button-content-controls")).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "04-button-content-mode.png") });
    await page.getByRole("button", { name: "More, Advanced settings" }).click();
    await expect(page.getByTestId("card-advanced-settings")).toBeVisible();
    await expect(page.getByTestId("card-contextual-inspector")).toHaveCount(0);
    await expect(page.getByTestId("card-advanced-settings")).toHaveAttribute("data-selection-object", buttonId || "");
    await page.screenshot({ path: path.join(evidence, "05-target-labelled-advanced-overlay.png") });
    await page.getByLabel("Close Advanced settings").click();
    await expect(page.getByTestId("card-advanced-settings")).toHaveCount(0);

    await page.getByTestId("card-creative-tool-ai").click();
    await expect(page.getByTestId("ai-active-scope")).toContainText("element");
    await page.getByPlaceholder("Describe a visual change").fill("Make this Button premium without changing its Action");
    await page.getByRole("button", { name: "Preview proposal" }).click();
    await expect(page.getByTestId("ai-proposal")).toContainText("Action, destination");
    await page.screenshot({ path: path.join(evidence, "06-ai-selected-button-proposal.png") });
    await page.getByTestId("ai-proposal").getByRole("button", { name: "Apply" }).click();
    await expect(page.getByTestId("ai-proposal")).toHaveCount(0);

    await page.getByTestId("card-resize-adapt").click();
    await expect(page.getByTestId("resize-adapt-panel")).toBeVisible();
    await expect(page.getByTestId("resize-adapt-panel").getByRole("button", { name: /Story \/ Reel/ })).toContainText("1080 × 1920");
    await expect(page.getByRole("button", { name: "Resize current document" })).toBeDisabled();
    await page.screenshot({ path: path.join(evidence, "07-resize-adapt-registry.png") });
    await page.getByTestId("copy-adapt-action").click();
    await expect(page.getByTestId("resize-adapt-panel")).toHaveCount(0);
    await expect(page.getByTestId("card-document-name")).toHaveValue(`${sourceName} — Story / Reel`);
    await expect(page.getByTestId("creative-document-tabs").getByRole("button", { name: new RegExp(`${sourceName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}, Card`) })).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "08-story-related-variation.png") });
    await page.getByTestId("creative-document-tabs").getByRole("button", { name: new RegExp(`${sourceName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}, Card`) }).click();
    await expect(page.getByTestId("card-document-name")).toHaveValue(sourceName);

    for (let cycle = 0; cycle < 5; cycle += 1) {
      await page.getByTestId("card-preview-as-customer").click();
      await expect(page.getByTestId("preview-toolbar")).toBeVisible();
      await expect(page.getByTestId("card-creative-tool-rail")).toHaveCount(0);
      await expect(page.getByTestId("card-contextual-object-tools")).toHaveCount(0);
      if (cycle === 0) await page.screenshot({ path: path.join(evidence, "09-clean-preview.png") });
      await page.getByTestId("preview-exit").click();
      await expect(page.getByTestId("card-creative-tool-rail")).toBeVisible();
      await expect(persistedButton).toBeVisible();
    }

    await expect(page.getByTestId("studio-save-state")).toHaveAttribute("data-saved", "true", { timeout: 45_000 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("card-edit-workspace-host")).toHaveAttribute("data-resolved-appearance", "light", { timeout: 60_000 });
    await expect(page.getByTestId("card-edit-workspace-host")).toHaveAttribute("data-pasteboard-theme", "checkerboard");

    await page.setViewportSize({ width: 820, height: 1180 });
    await expect(page.getByTestId("card-exit-edit-mode")).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "10-tablet-editor.png") });

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId("card-contextual-inspector")).toHaveCount(0);
    await expect(page.getByTestId("card-exit-edit-mode")).toBeVisible();
    await expect(page.getByText("Inspector", { exact: true })).toHaveCount(0);
    await page.keyboard.press("Tab");
    await expect.poll(async () => page.evaluate(() => document.activeElement?.tagName ?? "")).not.toBe("BODY");
    await page.screenshot({ path: path.join(evidence, "11-mobile-editor.png") });
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical")).toEqual([]);
  });
});
