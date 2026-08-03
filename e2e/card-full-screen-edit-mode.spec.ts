import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import path from "node:path";

const enabled = process.env.FULL_SCREEN_CARD_EDIT_ACCEPTANCE === "1";
const evidence = path.join("tmp", "card-full-screen-edit-mode");

test.describe("full-screen Card creative Edit Mode", () => {
  test.skip(!enabled, "Set FULL_SCREEN_CARD_EDIT_ACCEPTANCE=1 with the authenticated local fixture");
  test.setTimeout(300_000);

  test("separates Operations, autosaves direct manipulation, previews cleanly, and protects exit", async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto("/dashboard/card", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("card-assembly-workspace")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("card-contextual-inspector")).toHaveCount(0);
    await page.screenshot({ path: path.join(evidence, "01-card-operations.png"), fullPage: true });

    await page.getByTestId("card-edit-open").click();
    await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("card-edit-mode-topbar")).toBeVisible();
    await expect(page.getByTestId("card-pasteboard")).toBeVisible();
    await expect(page.getByTestId("card-contextual-inspector")).toHaveCount(0);
    await page.screenshot({ path: path.join(evidence, "02-full-screen-edit-mode.png") });

    const name = page.getByTestId("card-document-name");
    const originalName = await name.inputValue();
    const acceptanceName = `${originalName.replace(/ · Acceptance$/u, "")} · Acceptance`;
    await name.fill(acceptanceName);
    await name.press("Enter");
    await expect(page.getByTestId("studio-save-state")).toContainText(/Saving|Unsaved|Saved/, { timeout: 10_000 });
    await expect(page.getByTestId("studio-save-state")).toHaveAttribute("data-saved", "true", { timeout: 30_000 });
    await page.screenshot({ path: path.join(evidence, "03-autosave-saved.png") });

    await page.getByTestId("card-creative-tool-text").click();
    await page.getByRole("button", { name: "Add heading" }).click();
    const selected = page.locator('[data-composition-node][data-selected="true"]').last();
    await expect(selected).toBeVisible();
    await expect(page.getByTestId("card-contextual-object-tools")).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "04-selected-text-toolbar.png") });

    for (const tool of ["font", "color", "effects", "animate", "position"] as const) {
      await page.getByTestId(`contextual-${tool}`).click();
      await expect(page.getByTestId(`contextual-${tool}-drawer`)).toBeVisible();
      await page.screenshot({ path: path.join(evidence, `05-${tool}-drawer.png`) });
      await page.getByLabel(`Close ${tool}`).click();
    }

    await page.getByTestId("contextual-font").click();
    const fontChoices = page.getByTestId("contextual-font-drawer").getByRole("button").filter({ hasNot: page.locator('[aria-label^="Close"]') });
    expect(await fontChoices.count()).toBeGreaterThan(50);
    await fontChoices.nth(10).click();
    await expect(page.getByTestId("studio-save-state")).toHaveAttribute("data-saved", "true", { timeout: 30_000 });
    await page.getByLabel("Close font").click();

    const selectedNodeId = await selected.getAttribute("data-composition-node");
    expect(selectedNodeId).toBeTruthy();
    const inlineText = selected.locator('[data-testid^="composition-inline-text-"]');
    const fontSizeBeforeCorner = await inlineText.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    const cornerHandle = page.getByTestId(`composition-resize-${selectedNodeId}-se`);
    const cornerBox = await cornerHandle.boundingBox();
    expect(cornerBox).toBeTruthy();
    await page.mouse.move(cornerBox!.x + cornerBox!.width / 2, cornerBox!.y + cornerBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(cornerBox!.x + 54, cornerBox!.y + 40, { steps: 6 });
    await page.mouse.up();
    await expect.poll(() => inlineText.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThan(fontSizeBeforeCorner);
    await page.screenshot({ path: path.join(evidence, "13-text-corner-scale.png") });

    const fontSizeBeforeSide = await inlineText.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    const sideHandle = page.getByTestId(`composition-resize-${selectedNodeId}-e`);
    const sideBox = await sideHandle.boundingBox();
    expect(sideBox).toBeTruthy();
    await page.mouse.move(sideBox!.x + sideBox!.width / 2, sideBox!.y + sideBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(sideBox!.x + 60, sideBox!.y + sideBox!.height / 2, { steps: 6 });
    await page.mouse.up();
    await expect.poll(() => inlineText.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))).toBe(fontSizeBeforeSide);
    await page.screenshot({ path: path.join(evidence, "14-text-side-reflow.png") });

    await page.getByTestId("contextual-effects").click();
    await page.getByRole("button", { name: "Neon tube" }).click();
    await expect(selected.locator('[data-glyph-effect="neon_tube"]')).toHaveAttribute("data-text-box-background", "transparent");
    await page.getByLabel("Close effects").click();
    await page.screenshot({ path: path.join(evidence, "15-neon-transparent-glyph.png") });

    await page.getByTestId("contextual-position").click();
    await page.getByTestId("contextual-position-drawer").getByLabel("x").fill("-15");
    await page.getByLabel("Close position").click();
    await expect(selected).toHaveCSS("left", /-/);
    await page.screenshot({ path: path.join(evidence, "16-off-card-object-pasteboard.png") });

    await page.getByTestId("card-zoom-200").click();
    await expect(page.getByTestId("card-preview-phone")).toHaveAttribute("data-zoom", "2");
    await page.getByTestId("card-zoom-25").click();
    await expect(page.getByTestId("card-preview-phone")).toHaveAttribute("data-zoom", "0.25");
    await page.getByTestId("card-pan-tool").click();
    await expect(page.getByTestId("card-pasteboard")).toHaveAttribute("data-pan-active", "true");
    await page.screenshot({ path: path.join(evidence, "06-zoomed-pasteboard.png") });

    await page.getByTestId("card-preview-as-customer").click();
    await expect(page.getByTestId("preview-toolbar")).toBeVisible();
    await expect(page.getByTestId("card-preview-phone")).toHaveAttribute("data-zoom", "fit");
    await expect(page.getByTestId("card-creative-tool-rail")).toHaveCount(0);
    await expect(page.getByTestId("card-contextual-object-tools")).toHaveCount(0);
    await expect(page.locator('[data-edit-selects="true"]')).toHaveCount(0);
    await page.screenshot({ path: path.join(evidence, "07-clean-preview-draft.png") });
    await page.getByTestId("preview-exit").click();

    await page.getByTestId("contextual-position").click();
    await page.getByTestId("contextual-position-drawer").getByLabel("x").fill("12");
    await page.getByLabel("Close position").click();
    await page.getByTestId("card-creative-tool-text").click();
    await page.getByRole("button", { name: "Curved text" }).click();
    const curved = page.locator('[data-composition-node][data-selected="true"]').last();
    await expect(curved.locator('[data-text-curve="arch_up"]')).toBeVisible();
    await page.getByTestId("card-contextual-object-tools").getByRole("button", { name: "More" }).click();
    await expect(page.getByLabel("Curve radius")).toBeVisible();
    await page.getByLabel("Curve radius").fill("24");
    await page.getByLabel("Arc width").fill("68");
    await page.screenshot({ path: path.join(evidence, "17-curved-text-radius-and-bounds.png") });

    const documentTabs = page.locator('[data-testid^="creative-document-tab-"]');
    const tabsBeforeFirstClone = await documentTabs.count();
    await page.getByTestId("card-clone").click();
    await expect(documentTabs).toHaveCount(tabsBeforeFirstClone + 1, { timeout: 30_000 });
    await expect(name).toHaveValue(/^Copy of /);
    await name.fill("Acceptance Card Variation A");
    await name.press("Enter");
    await expect(page.getByTestId("studio-save-state")).toHaveAttribute("data-saved", "true", { timeout: 30_000 });
    await page.screenshot({ path: path.join(evidence, "08-clone-renamed-tabs.png") });

    const collapseAdvanced = page.getByTestId("card-drawer-collapse");
    if (await collapseAdvanced.isVisible()) await collapseAdvanced.click();
    const metallicText = page.getByRole("button", { name: "Metallic text" });
    if (!(await metallicText.isVisible())) await page.getByTestId("card-creative-tool-text").click();
    if (!(await metallicText.isVisible())) await page.getByTestId("card-creative-tool-text").click();
    await metallicText.click();
    const source = page.locator('[data-composition-node][data-selected="true"]').last();
    await source.press(process.platform === "darwin" ? "Meta+c" : "Control+c");
    const tabsBeforeSecondClone = await documentTabs.count();
    await page.getByTestId("card-clone").click();
    await expect(documentTabs).toHaveCount(tabsBeforeSecondClone + 1, { timeout: 30_000 });
    await page.keyboard.press(process.platform === "darwin" ? "Meta+v" : "Control+v");
    await expect(page.locator('[data-composition-node][data-selected="true"]').last()).toHaveAttribute("data-primitive", "text");
    await page.screenshot({ path: path.join(evidence, "09-cross-tab-copy-paste.png") });

    await name.fill("Acceptance Card Variation B");
    await name.press("Enter");
    await page.getByTestId("card-exit-edit-mode").click();
    await expect(page.getByTestId("card-exit-save-dialog")).toContainText("All changes saved", { timeout: 30_000 });
    await page.screenshot({ path: path.join(evidence, "10-exit-save-confirmation.png") });
    await page.getByTestId("card-exit-confirm").click();
    await expect(page.getByTestId("card-assembly-workspace")).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: path.join(evidence, "11-returned-card-operations.png"), fullPage: true });

    const a11y = await new AxeBuilder({ page }).analyze();
    expect(a11y.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical")).toEqual([]);
  });

  test("keeps the editor usable at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard/card/edit", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("card-edit-mode-topbar")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("card-preview-as-customer")).toBeVisible();
    await expect(page.getByTestId("card-pasteboard")).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "12-phone-390px.png"), fullPage: true });
  });

  test("keeps recovery and blocks exit when the server cannot acknowledge a save", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/dashboard/card/edit", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("card-edit-mode-topbar")).toBeVisible({ timeout: 60_000 });
    const name = page.getByTestId("card-document-name");
    const originalName = await name.inputValue();
    const recoveryName = `${originalName.replace(/ · Recovery(?: \d+)?$/u, "")} · Recovery ${Date.now()}`;

    await page.route("**/api/card/draft", (route) => route.abort("failed"));
    await name.fill(recoveryName);
    await name.press("Enter");
    await expect(page.getByTestId("studio-save-state")).toContainText("Save failed", { timeout: 30_000 });
    await expect.poll(() => page.evaluate(() => Object.keys(localStorage).some((key) => key.startsWith("tapconnect:card-recovery:")))).toBe(true);
    await page.getByTestId("card-exit-edit-mode").click();
    await expect(page.getByTestId("card-exit-save-dialog")).toContainText("exit blocked", { timeout: 30_000 });
    await page.screenshot({ path: path.join(evidence, "18-save-failure-blocked-exit.png") });

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("card-recovery-prompt")).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: path.join(evidence, "19-recovery-prompt.png") });
    await page.getByRole("button", { name: "Restore recovered version" }).click();
    await expect(name).toHaveValue(recoveryName);
    await page.screenshot({ path: path.join(evidence, "20-recovered-state.png") });

    await page.unroute("**/api/card/draft");
    await page.getByTestId("card-save").click();
    await expect(page.getByTestId("studio-save-state")).toHaveAttribute("data-saved", "true", { timeout: 30_000 });
    await name.fill(originalName);
    await name.press("Enter");
    await page.goBack();
    await expect(page.getByTestId("card-exit-save-dialog")).toBeVisible({ timeout: 30_000 });
  });

  test("keeps the editor usable at tablet width", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/dashboard/card/edit", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("card-edit-mode-topbar")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("card-pasteboard")).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "21-tablet-768px.png"), fullPage: true });
  });
});
