import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const enabled = process.env.EDITOR_INTERACTION_HIERARCHY_ACCEPTANCE === "1";
const evidenceDir = path.join(process.cwd(), "tmp/editor-interaction-hierarchy-evidence");

async function openBlankStudio(page: Page) {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/dashboard/card/edit", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("card-edit-workspace-host")).toHaveAttribute("data-builder-ready", "true", { timeout: 60_000 });
  await page.getByTestId("card-creative-tool-templates").click();
  await page.getByTestId("card-template-library").getByRole("button", { name: "Blank Card" }).click();
}

test.describe("editor interaction hierarchy and deep left editor", () => {
  test.skip(!enabled, "Set EDITOR_INTERACTION_HIERARCHY_ACCEPTANCE=1 for the isolated development fixture");
  test.setTimeout(180_000);

  test.beforeAll(() => {
    fs.mkdirSync(evidenceDir, { recursive: true });
  });

  test("no-selection, explicit root, toolbar→deep-left, handles, Build consolidation", async ({ page }) => {
    await openBlankStudio(page);

    // Pasteboard clears selection — no contextual toolbar.
    await page.getByTestId("card-pasteboard").click({ position: { x: 12, y: 12 } });
    await expect(page.getByTestId("card-contextual-object-tools")).toHaveCount(0);
    await page.screenshot({ path: path.join(evidenceDir, "01-no-selection.png"), fullPage: false });

    // Explicit Card background selects Card Root.
    await page.getByTestId("creative-composition-canvas").click({ position: { x: 8, y: 8 } });
    await expect(page.locator('[data-contextual-object="card-root"]')).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, "02-explicit-root.png"), fullPage: false });

    // Pasteboard again clears Root.
    await page.getByTestId("card-pasteboard").click({ position: { x: 16, y: 16 } });
    await expect(page.getByTestId("card-contextual-object-tools")).toHaveCount(0);

    // Build/Guide must not duplicate Templates preset catalog.
    await page.getByTestId("card-creative-tool-build").click();
    await expect(page.getByTestId("build-no-duplicate-catalog")).toBeVisible();
    await expect(page.getByTestId("composer-section-library")).toHaveCount(0);
    await page.getByTestId("card-creative-tool-templates").click();
    await expect(page.getByRole("button", { name: /Premium Offer/ })).toBeVisible();

    // Text → Color opens deep left editor (not a Card overlay form).
    await page.getByTestId("card-creative-tool-text").click();
    await page.getByRole("button", { name: /Add text box/i }).click();
    await expect(page.getByTestId("card-contextual-object-tools")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("contextual-color").click();
    await expect(page.getByTestId("deep-left-edit-drawer")).toBeVisible();
    await expect(page.getByTestId("card-creative-context-drawer")).toHaveAttribute("data-drawer-mode", "edit");
    await expect(page.getByTestId("contextual-color-drawer")).toBeVisible();
    await expect(page.getByTestId("text-appearance-controls")).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, "03-text-color-deep-left.png"), fullPage: false });

    await page.getByTestId("deep-left-back").click();
    await expect(page.getByTestId("card-creative-context-drawer")).toHaveAttribute("data-drawer-mode", "library");

    // Zoom-independent handle chrome.
    for (const zoom of [25, 100, 200] as const) {
      await page.getByRole("button", { name: `${zoom}%`, exact: true }).click();
      const handle = page.locator('[data-testid^="composition-resize-"][data-testid$="-se"]').first();
      await expect(handle).toBeVisible();
      const overlay = page.locator('[data-testid^="composition-selection-overlay-"]').first();
      const scale = Number(await overlay.getAttribute("data-chrome-scale"));
      expect(scale).toBeCloseTo(100 / zoom, 1);
      await page.screenshot({ path: path.join(evidenceDir, `04-handles-${zoom}.png`), fullPage: false });
    }

    // Iconify visual results required — opening Icons must not auto-place.
    const beforeIcons = await page.locator("[data-composition-node]").count();
    await page.getByTestId("card-creative-tool-icons").click();
    await expect(page.getByTestId("card-icon-library")).toBeVisible();
    await expect(page.locator("[data-composition-node]")).toHaveCount(beforeIcons);
    await page.getByTestId("icon-library-search").fill("ticket");
    await expect(page.getByTestId("icon-library-iconify-results").locator("button").first()).toBeVisible({ timeout: 20_000 });
    await page.screenshot({ path: path.join(evidenceDir, "05-iconify-visual.png"), fullPage: false });

    // Live Device is required from Preview.
    await page.getByTestId("card-preview-as-customer").click();
    await page.getByTestId("preview-live-device").click();
    await expect(page.getByTestId("live-device-qr-panel")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("preview-url-text")).toBeVisible({ timeout: 30_000 });
    const url = await page.getByTestId("preview-url-text").innerText();
    expect(url).not.toMatch(/localhost|127\.0\.0\.1/);
    expect(url).toMatch(/\/preview\/live\//);
    await page.screenshot({ path: path.join(evidenceDir, "06-live-device-required.png"), fullPage: false });

    await page.setViewportSize({ width: 390, height: 844 });
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = axe.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
});
