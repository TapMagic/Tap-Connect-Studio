import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import path from "node:path";

const enabled = process.env.UNIVERSAL_ELEMENT_KERNEL_ACCEPTANCE === "1";
const evidence = path.join("tmp", "universal-element-kernel");

test.describe("universal Element and composition kernel", () => {
  test.skip(!enabled, "Set UNIVERSAL_ELEMENT_KERNEL_ACCEPTANCE=1 with the authenticated isolated-development fixture");
  test.setTimeout(300_000);

  test("extends the phone page, routes media capabilities distinctly, attaches Text Action, and fully collapses view controls", async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto("/dashboard/card/edit", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("card-edit-workspace-host")).toHaveAttribute("data-builder-ready", "true", { timeout: 60_000 });
    await expect(page.getByText("Inspector", { exact: true })).toHaveCount(0);
    await page.getByTestId("card-creative-tool-templates").click();
    await page.getByTestId("card-template-library").getByRole("button", { name: "Blank Card" }).click();
    await expect(page.getByTestId("card-root-canvas").locator("[data-composition-node]")).toHaveCount(0);
    await page.getByTestId("card-zoom-toolbar-toggle").click();
    await expect(page.getByTestId("card-view-toolbar-collapsed")).toBeVisible();
    await page.getByRole("button", { name: "Show view controls" }).click();
    await expect(page.getByTestId("card-view-toolbar")).toBeVisible();

    const heightBefore = Number((await page.getByTestId("card-page-height").textContent())?.replace(/\D/g, ""));
    const handle = page.getByTestId("card-page-extension-handle");
    await page.screenshot({ path: path.join(evidence, "01-short-page-and-extension-handle.png") });
    await handle.click();
    await expect.poll(async () => Number((await page.getByTestId("card-page-height").textContent())?.replace(/\D/g, ""))).toBeGreaterThan(heightBefore + 80);
    await page.screenshot({ path: path.join(evidence, "02-extended-page.png") });
    await page.getByTestId("card-undo").first().click();
    await expect.poll(async () => Number((await page.getByTestId("card-page-height").textContent())?.replace(/\D/g, ""))).toBe(heightBefore);
    const handleBox = await handle.boundingBox();
    expect(handleBox).not.toBeNull();
    await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2 + 72, { steps: 6 });
    await page.mouse.up();
    await expect.poll(async () => Number((await page.getByTestId("card-page-height").textContent())?.replace(/\D/g, ""))).toBeGreaterThan(heightBefore + 40);
    await page.getByTestId("card-undo").first().click();
    await expect.poll(async () => Number((await page.getByTestId("card-page-height").textContent())?.replace(/\D/g, ""))).toBe(heightBefore);

    await page.getByTestId("card-zoom-toolbar-toggle").click();
    await expect(page.getByTestId("card-view-toolbar")).toHaveCount(0);
    await expect(page.getByTestId("card-view-toolbar-collapsed")).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "03-collapsed-toolbar-space-reclaimed.png") });
    await page.getByRole("button", { name: "Show view controls" }).click();
    await expect(page.getByTestId("card-view-toolbar")).toBeVisible();

    await page.getByTestId("card-creative-tool-text").click();
    await page.getByTestId("card-text-library").getByRole("button", { name: "Add text box", exact: true }).click();
    const text = page.locator('[data-composition-node][data-element-kind="text"][data-selected="true"]').last();
    await expect(text).toBeVisible();
    await page.getByTestId("contextual-action").click();
    await page.getByLabel("Element action type").selectOption("website");
    await page.getByLabel("Element action destination").fill("https://example.com/menu");
    await expect(page.getByTestId("element-action-controls")).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "04-text-with-action.png") });

    await page.getByTestId("card-creative-tool-elements").click();
    await page.getByTestId("card-elements-library").getByRole("button", { name: /^Image /i }).first().click();
    await expect(page.getByTestId("card-assets-library")).toBeVisible();
    await page.getByTestId("open-shared-media-browser").click();
    await expect(page.getByTestId("shared-media-browser")).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "05-shared-media-browser.png") });
    await page.getByTestId("media-browser-result").first().click();
    await page.getByTestId("media-browser-insert").click();
    await page.screenshot({ path: path.join(evidence, "06-selected-image.png") });
    await page.getByTestId("contextual-crop-fit").click();
    await expect(page.getByTestId("element-crop-fit-controls")).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "07-crop-fit-panel.png") });
    await page.getByTestId("contextual-adjust").click();
    await expect(page.getByTestId("element-adjust-controls")).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "08-adjust-panel.png") });
    await page.getByTestId("contextual-frame-appearance").click();
    await expect(page.getByTestId("element-frame-appearance-controls")).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "09-frame-appearance-panel.png") });

    await page.getByTestId("card-preview-as-customer").click();
    await expect(page.getByTestId("card-page-extension-controls")).toHaveCount(0);
    await expect(page.locator('[data-element-action="website"]:visible').first()).toHaveAttribute("href", "https://example.com/menu");
    await page.screenshot({ path: path.join(evidence, "10-clean-preview-desktop.png") });
    await page.setViewportSize({ width: 834, height: 1112 });
    await page.getByRole("button", { name: "Tablet", exact: true }).click();
    await page.screenshot({ path: path.join(evidence, "11-clean-preview-tablet.png") });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Phone", exact: true }).click();
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe("BODY");
    await page.screenshot({ path: path.join(evidence, "12-clean-preview-mobile-390.png") });
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical")).toEqual([]);
  });
});
