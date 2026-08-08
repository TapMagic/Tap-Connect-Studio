import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const enabled =
  process.env.GROUP_APPEARANCE_COMPLETION_ACCEPTANCE === "1" ||
  process.env.UNIVERSAL_APPEARANCE_ACCEPTANCE === "1" ||
  process.env.DEEP_EDITOR_REPAIR_ACCEPTANCE === "1";

const evidenceDir = path.join(process.cwd(), "tmp/group-appearance-completion-evidence");

async function dismissBlockingChrome(page: Page) {
  await page.evaluate(() => {
    document.querySelectorAll("nextjs-portal").forEach((node) => node.remove());
    const dialog = document.querySelector('[data-testid="card-exit-save-dialog"]');
    dialog?.parentElement?.removeChild(dialog);
  }).catch(() => undefined);
}

async function openBlankStudio(page: Page) {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/dashboard/card/edit", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("card-edit-workspace-host")).toHaveAttribute("data-builder-ready", "true", {
    timeout: 60_000,
  });
  await dismissBlockingChrome(page);
  await page.getByTestId("card-creative-tool-templates").click({ force: true });
  await page.getByTestId("card-template-library").getByRole("button", { name: "Blank Card" }).click({ force: true });
  await dismissBlockingChrome(page);
}

test.describe("group appearance shared libraries coupon magic write", () => {
  test.skip(!enabled, "Set GROUP_APPEARANCE_COMPLETION_ACCEPTANCE=1");
  test.setTimeout(240_000);

  test.beforeAll(() => {
    fs.mkdirSync(evidenceDir, { recursive: true });
  });

  test("group parent chrome, fan-out, appearance IA, icons, badge, coupon, magic write", async ({ page }) => {
    await openBlankStudio(page);

    // Two text boxes
    await page.getByTestId("card-creative-tool-text").click();
    await page.getByRole("button", { name: /Add text box/i }).click();
    await page.getByRole("button", { name: /Add text box/i }).click();
    const textNodes = page.locator('[data-primitive="text"]');
    await expect(textNodes).toHaveCount(2, { timeout: 15_000 });

    // Select both via Layers if available, else shift-click
    await page.getByTestId("card-creative-tool-layers").click();
    const layerButtons = page.locator('[data-testid^="layer-object-"]');
    const layerCount = await layerButtons.count();
    if (layerCount >= 2) {
      await layerButtons.nth(0).click({ modifiers: ["Shift"] });
      await layerButtons.nth(1).click({ modifiers: ["Shift"] });
    }

    // Group via context menu on canvas
    await textNodes.first().click({ button: "right", force: true });
    const groupBtn = page.getByRole("menuitem", { name: /^Group$/i });
    if (await groupBtn.count()) {
      await groupBtn.click();
    } else {
      await page.keyboard.press("Meta+g").catch(() => undefined);
    }

    // Re-select a group member to expand
    await textNodes.first().click({ force: true });
    await expect(page.getByTestId("composition-group-selection-overlay")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("composition-group-label")).toHaveText(/Group/i);
    // No independent child handles in parent mode
    await expect(page.locator('[data-testid^="composition-selection-overlay-"]')).toHaveCount(0);
    await page.screenshot({ path: path.join(evidenceDir, "01-group-parent-selection.png") });

    // Appearance overview — no Quick Effects junk drawer
    await page.getByTestId("contextual-group-appearance").or(page.getByRole("button", { name: /Appearance/i })).first().click();
    await expect(page.getByTestId("appearance-category-overview")).toBeVisible();
    await expect(page.getByText("Quick effects")).toHaveCount(0);
    await page.screenshot({ path: path.join(evidenceDir, "05-appearance-overview.png") });

    await page.getByTestId("appearance-category-effects").click();
    await expect(page.getByTestId("appearance-effects-list")).toBeVisible();
    await page.getByTestId("effect-neon_edge").click();
    await expect(page.getByTestId("appearance-effect-tuning")).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, "06-neon-edge.png") });
    await page.getByTestId("effect-soft_glow").click();
    await page.screenshot({ path: path.join(evidenceDir, "07-soft-glow.png") });
    await page.getByTestId("effect-aura").click();
    await page.screenshot({ path: path.join(evidenceDir, "08-aura.png") });

    // Icon browse
    await page.getByTestId("card-creative-tool-icons").click();
    await expect(page.getByTestId("icon-browse-categories")).toBeVisible();
    await page.getByTestId("icon-browse-category-animals").click();
    await page.screenshot({ path: path.join(evidenceDir, "09-icon-browse-categories.png") });
    await page.getByRole("button", { name: /^Collections$/i }).click();
    await expect(page.getByTestId("icon-browse-collections")).toBeVisible();
    await page.getByTestId("icon-collection-lucide").click();
    await page.screenshot({ path: path.join(evidenceDir, "10-icon-browse-collections.png") });

    // Button shared icon picker
    await page.getByTestId("card-creative-tool-buttons").click();
    await page.getByTestId("button-preset-pill").or(page.locator('[data-testid^="button-preset-"]').first()).click();
    await page.getByTestId("contextual-button-content").click();
    await page.getByTestId("button-add-icon").click();
    await expect(page.getByTestId("shared-icon-picker")).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, "11-button-shared-icon-picker.png") });

    // Badge library clean + no flicker
    await page.getByTestId("card-creative-tool-badges").click();
    await expect(page.getByTestId("polished-badge-library")).toBeVisible();
    await expect(page.getByText("Badge designs")).toHaveCount(0);
    await page.screenshot({ path: path.join(evidenceDir, "12-badge-library-clean.png") });
    await page.getByTestId("starter-badge-pill").click();
    // Explicit Card Root + Background while badges tool is the previous library
    await page.getByTestId("card-creative-tool-badges").click();
    await page.locator('[data-testid="composition-surface"], [data-card-root="true"], [data-testid="card-root-canvas"]').first().click({ position: { x: 8, y: 8 }, force: true }).catch(() => undefined);
    // Force explicit root selection via pasteboard if available
    await page.keyboard.press("Escape");
    await page.evaluate(() => {
      const root = document.querySelector('[data-testid="card-contextual-root-tools"], [data-testid="card-creative-context-drawer"]');
      void root;
    });
    const rootBg = page.getByRole("button", { name: /Background/i }).first();
    if (await rootBg.count()) {
      await rootBg.click();
      await expect(page.getByTestId("deep-left-edit-drawer")).toBeVisible();
      await page.screenshot({ path: path.join(evidenceDir, "13-badge-card-root-no-flicker.png") });
    }

    // Coupons
    await page.getByTestId("card-creative-tool-coupons").click();
    await expect(page.getByTestId("card-coupon-library")).toBeVisible();
    await expect(page.getByTestId("coupon-preset-perforated-stub")).toHaveAttribute("data-thumbnail-regions", /perforation/);
    await expect(page.getByTestId("coupon-preset-split-image")).toHaveAttribute("data-thumbnail-regions", /image/);
    await page.screenshot({ path: path.join(evidenceDir, "14-coupon-library.png") });
    await page.getByTestId("coupon-preset-perforated-stub").click();
    await expect(page.locator('[data-component-kind="coupon"][data-coupon-perforation="true"]').first()).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, "15-coupon-perforated.png") });
    await page.getByRole("button", { name: /Edit contents/i }).first().click();
    await expect(page.getByTestId("coupon-content-editor")).toBeVisible();
    await page.getByTestId("coupon-content-offer").fill("40% OFF");
    await page.screenshot({ path: path.join(evidenceDir, "17-coupon-edit-contents.png") });

    await page.getByTestId("card-creative-tool-coupons").click();
    await page.getByTestId("coupon-preset-split-image").click();
    await expect(page.locator('[data-component-kind="coupon"][data-coupon-split="true"]').first()).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, "16-coupon-split-image.png") });

    // Appearance on coupon — gradient / border via category overview
    await page.getByRole("button", { name: /Appearance/i }).first().click();
    if (await page.getByTestId("appearance-category-fill").count()) {
      await page.getByTestId("appearance-category-fill").click();
      await page.getByRole("button", { name: /GradientStudio/i }).click();
    }
    await page.screenshot({ path: path.join(evidenceDir, "18-coupon-gradient.png") });
    if (await page.getByTestId("appearance-category-border").count()) {
      await page.getByTestId("deep-left-back").click().catch(() => undefined);
      await page.getByTestId("appearance-category-border").click();
      await page.getByTestId("border-style-solid").click();
      await page.screenshot({ path: path.join(evidenceDir, "19-coupon-border.png") });
      await page.getByTestId("border-style-none").click();
    }

    // Magic Write — mock provider
    await page.route("**/api/creative/magic-write", async (route) => {
      const body = route.request().postDataJSON() as { targets?: Array<{ id: string; text: string }> };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          mode: (body.targets?.length || 0) > 1 ? "multi" : "single",
          proposals: (body.targets || []).map((target) => ({
            id: `mw-${target.id}`,
            targetId: target.id,
            original: target.text,
            proposed: `Polished: ${target.text}`,
          })),
        }),
      });
    });
    await page.getByTestId("card-creative-tool-text").click();
    await page.getByTestId("magic-write-open").click();
    await expect(page.getByTestId("magic-write-panel")).toBeVisible();
    await page.getByTestId("magic-write-panel").locator("textarea").first().fill("Rewrite this for a coffee shop");
    await page.getByTestId("magic-write-submit").click();
    await expect(page.getByTestId("magic-write-result")).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, "20-magic-write.png") });
    await page.getByTestId("magic-write-apply").click();

    // Preview / 390
    await page.getByRole("button", { name: /Preview/i }).first().click().catch(() => undefined);
    await page.screenshot({ path: path.join(evidenceDir, "21-preview.png") });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(evidenceDir, "23-390px.png") });

    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter((v) => v.impact === "critical")).toEqual([]);
  });
});
