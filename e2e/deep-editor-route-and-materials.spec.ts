import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const enabled = process.env.DEEP_EDITOR_REPAIR_ACCEPTANCE === "1" || process.env.EDITOR_INTERACTION_HIERARCHY_ACCEPTANCE === "1";
const evidenceDir = path.join(process.cwd(), "tmp/deep-editor-repair-evidence");

async function openBlankStudio(page: Page) {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/dashboard/card/edit", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("card-edit-workspace-host")).toHaveAttribute("data-builder-ready", "true", { timeout: 60_000 });
  await page.getByTestId("card-creative-tool-templates").click();
  await page.getByTestId("card-template-library").getByRole("button", { name: "Blank Card" }).click();
}

test.describe("deep editor route, Iconify SVG, materials", () => {
  test.skip(!enabled, "Set DEEP_EDITOR_REPAIR_ACCEPTANCE=1 for the isolated development fixture");
  test.setTimeout(240_000);

  test.beforeAll(() => {
    fs.mkdirSync(evidenceDir, { recursive: true });
  });

  test("selection, nested routes, Iconify SVG, materials, Live Device", async ({ page }) => {
    await openBlankStudio(page);

    // No selection → no toolbar / no Card Root fallback.
    await page.getByTestId("card-pasteboard").click({ position: { x: 12, y: 12 } });
    await expect(page.getByTestId("card-contextual-object-tools")).toHaveCount(0);
    await page.screenshot({ path: path.join(evidenceDir, "02-no-selection.png"), fullPage: false });

    // Insert Icon → toolbar must say Icon, never Card Root.
    await page.getByTestId("card-creative-tool-icons").click();
    await expect(page.getByTestId("card-icon-library")).toBeVisible();
    await expect(page.getByTestId("icon-library-recommended").locator("[data-icon-svg='true']").first()).toBeVisible();
    await page.getByTestId("icon-recommended-phone").click();
    await expect(page.getByTestId("card-contextual-object-tools")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("contextual-target-label")).toHaveText(/Icon/i);
    await expect(page.getByTestId("contextual-target-label")).not.toHaveText(/Card root/i);
    await page.screenshot({ path: path.join(evidenceDir, "01-icon-selected-toolbar.png"), fullPage: false });

    // Iconify search via Change Icon (shared Icon authority) — library may close after insert.
    await page.getByTestId("contextual-icon-picker").click();
    const iconSearch = page.getByTestId("iconify-search").or(page.getByTestId("icon-library-search")).first();
    await expect(iconSearch).toBeVisible({ timeout: 15_000 });
    await iconSearch.fill("ticket");
    const iconifyResults = page.getByTestId("iconify-results").or(page.getByTestId("icon-library-iconify-results")).first();
    await expect(iconifyResults.locator("[data-icon-svg='true']").first()).toBeVisible({ timeout: 25_000 });
    await page.screenshot({ path: path.join(evidenceDir, "07-iconify-ticket.png"), fullPage: false });
    await iconifyResults.locator("button").first().click();
    await expect(page.locator("[data-icon-svg='true']").first()).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, "09-canvas-svg.png"), fullPage: false });

    // Re-open Change Icon (prior result click may close the drawer).
    if (!(await page.getByTestId("iconify-search").count())) {
      await page.getByTestId("contextual-icon-picker").click();
    }
    const iconSearchAgain = page.getByTestId("iconify-search").or(page.getByTestId("icon-library-search")).first();
    await expect(iconSearchAgain).toBeVisible({ timeout: 15_000 });
    await iconSearchAgain.fill("phone");
    const iconifyResultsAgain = page.getByTestId("iconify-results").or(page.getByTestId("icon-library-iconify-results")).first();
    await expect(iconifyResultsAgain.locator("[data-icon-svg='true']").first()).toBeVisible({ timeout: 25_000 });
    await page.screenshot({ path: path.join(evidenceDir, "08-iconify-phone.png"), fullPage: false });

    // Text → Color nested pages.
    await page.getByTestId("card-creative-tool-text").click();
    await page.getByRole("button", { name: /Add text box/i }).click();
    await expect(page.getByTestId("contextual-color")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("contextual-color").click();
    await expect(page.getByTestId("deep-left-edit-drawer")).toBeVisible();
    await expect(page.getByTestId("text-appearance-controls")).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, "03-text-color-overview.png"), fullPage: false });

    await page.getByTestId("see-all-solid-colors").click();
    await expect(page.getByTestId("default-solid-colors")).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, "04-solid-colors.png"), fullPage: false });
    await page.getByTestId("nested-back-color").click();
    await expect(page.getByTestId("text-appearance-controls")).toBeVisible();

    await page.getByTestId("see-all-gradient-colors").click();
    await expect(page.getByTestId("default-gradient-colors")).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, "05-gradient-colors.png"), fullPage: false });
    await page.getByTestId("nested-back-color").click();

    await page.getByTestId("see-photo-colors").click();
    await expect(page.getByTestId("photo-colors")).toBeVisible();
    await expect(page.getByTestId("photo-colors-empty")).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, "06-photo-colors.png"), fullPage: false });
    await page.getByTestId("nested-back-color").click();

    // Button material Gold → Glass.
    await page.getByTestId("card-creative-tool-buttons").click();
    await page.getByTestId("button-preset-pill").click().catch(async () => {
      await page.locator('[data-testid^="button-preset-"]').first().click();
    });
    await expect(page.getByTestId("card-contextual-object-tools")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("contextual-button-appearance").click();
    await expect(page.getByTestId("appearance-category-overview")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("appearance-category-material").click();
    await expect(page.getByTestId("material-engine-controls")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("material-gold").click();
    await page.screenshot({ path: path.join(evidenceDir, "11-button-gold.png"), fullPage: false });
    await page.getByTestId("material-glass").or(page.getByTestId("material-frosted_glass")).first().click();
    await page.screenshot({ path: path.join(evidenceDir, "12-button-glass.png"), fullPage: false });

    // Badge shape insert, then Material via Appearance (materials are not insertion species).
    await page.getByTestId("card-creative-tool-badges").click();
    await page.getByTestId("starter-badge-seal").or(page.getByRole("button", { name: /^Seal$|Award seal/i })).first().click().catch(async () => {
      await page.locator("button", { hasText: /Seal/i }).first().click();
    });
    await page.getByRole("button", { name: /Add editable Badge/i }).click();
    await expect(page.getByTestId("contextual-target-label")).toHaveText(/Badge/i);
    await page.getByTestId("contextual-badge-appearance").click();
    await expect(page.getByTestId("appearance-category-overview")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("appearance-category-material").click();
    await page.getByTestId("material-gold").click();
    await page.screenshot({ path: path.join(evidenceDir, "13-badge-gold-seal.png"), fullPage: false });
    await page.getByTestId("contextual-badge-shape").click();
    await page.getByTestId("badge-shape-ribbon").click();
    await page.getByTestId("contextual-badge-appearance").click();
    await expect(page.getByTestId("appearance-category-overview")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("appearance-category-material").click();
    await page.getByTestId("material-glass").or(page.getByTestId("material-frosted_glass")).first().click();
    await page.screenshot({ path: path.join(evidenceDir, "14-badge-glass-ribbon.png"), fullPage: false });

    // Super Fun text combination.
    await page.getByTestId("card-creative-tool-text").click();
    await page.getByTestId("text-combination-playful-offset").click();
    await page.screenshot({ path: path.join(evidenceDir, "17-super-fun.png"), fullPage: false });

    // Preview + Live Device required panel.
    await page.getByTestId("card-preview-as-customer").click();
    await page.screenshot({ path: path.join(evidenceDir, "18-clean-preview.png"), fullPage: false });
    await expect(page.getByTestId("preview-viewport-desktop")).toBeVisible();
    await expect(page.getByTestId("preview-viewport-tablet")).toBeVisible();
    await expect(page.getByTestId("preview-viewport-phone")).toBeVisible();
    await expect(page.getByTestId("preview-live-device")).toBeVisible();
    await page.getByTestId("preview-live-device").click();
    await expect(page.getByTestId("live-device-qr-panel")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("preview-url-text")).toBeVisible({ timeout: 30_000 });
    const url = await page.getByTestId("preview-url-text").innerText();
    expect(url).not.toMatch(/localhost|127\.0\.0\.1/);
    await page.screenshot({ path: path.join(evidenceDir, "20-live-device.png"), fullPage: false });

    await page.setViewportSize({ width: 390, height: 844 });
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = axe.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
});
