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
    document.querySelectorAll('[data-testid="card-exit-save-dialog"]').forEach((dialog) => {
      dialog.parentElement?.removeChild(dialog);
    });
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

    // Multi-select on canvas, then Group via contextual toolbar
    await textNodes.nth(0).click({ force: true });
    await textNodes.nth(1).click({ modifiers: ["Shift"], force: true });
    await expect(page.getByTestId("contextual-multi-group")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("contextual-multi-group").click();
    await expect(page.getByTestId("composition-group-selection-overlay")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("composition-group-label")).toHaveText(/Group/i);
    await expect(page.getByTestId("contextual-target-label")).toHaveText(/Group/i);
    await expect(page.getByTestId("contextual-group-ungroup")).toBeVisible();
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
    await page.getByTestId("button-preset-pill").click();
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
    await dismissBlockingChrome(page);
    // Keep Badge library open, then explicitly select Card Root and open Background once
    await page.getByTestId("card-creative-tool-badges").click();
    await expect(page.getByTestId("polished-badge-library")).toBeVisible();
    await page.getByTestId("card-creative-tool-layers").click();
    await page.getByTestId("card-layers-drawer").getByRole("button", { name: "Card", exact: true }).click();
    await expect(page.getByTestId("contextual-target-label")).toHaveText(/Card/i);
    await page.getByTestId("card-contextual-object-tools").getByRole("button", { name: "Background", exact: true }).click();
    await expect(page.getByTestId("root-background-editor").or(page.getByTestId("deep-left-edit-drawer"))).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, "13-badge-card-root-no-flicker.png") });
    await dismissBlockingChrome(page);

    // Coupons
    await page.getByTestId("card-creative-tool-coupons").click();
    await expect(page.getByTestId("card-coupon-library")).toBeVisible();
    await expect(page.getByTestId("coupon-preset-perforated-stub")).toHaveAttribute("data-thumbnail-regions", /perforation/);
    await expect(page.getByTestId("coupon-preset-split-image")).toHaveAttribute("data-thumbnail-regions", /image/);
    await page.screenshot({ path: path.join(evidenceDir, "14-coupon-library.png") });
    await page.getByTestId("coupon-preset-perforated-stub").click();
    await expect(page.locator('[data-component-kind="coupon"][data-coupon-perforation="true"]').first()).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, "15-coupon-perforated.png") });
    await page.getByTestId("contextual-content").or(page.getByRole("button", { name: /Edit contents/i }).first()).click();
    await expect(page.getByTestId("coupon-content-editor")).toBeVisible();
    await page.getByTestId("coupon-content-offer").fill("40% OFF");
    await page.screenshot({ path: path.join(evidenceDir, "17-coupon-edit-contents.png") });

    await page.getByTestId("card-creative-tool-coupons").click();
    await page.getByTestId("coupon-preset-split-image").click();
    await expect(page.locator('[data-component-kind="coupon"][data-coupon-split="true"]').first()).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, "16-coupon-split-image.png") });

    // Appearance on coupon — gradient / border via shared category overview (required)
    await page.locator('[data-component-kind="coupon"]').first().click({ force: true });
    await page.getByTestId("contextual-appearance").click();
    await expect(page.getByTestId("appearance-category-overview")).toBeVisible();
    await page.getByTestId("appearance-category-fill").click();
    await expect(page.getByTestId("appearance-fill-controls")).toBeVisible();
    await page.getByTestId("appearance-open-gradient").or(page.getByRole("button", { name: /^Gradient$/i })).first().click();
    await expect(page.getByTestId("appearance-gradient-controls")).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, "18-coupon-gradient.png") });
    // Gradient → Fill → Appearance overview
    await page.getByTestId("appearance-back").click();
    await expect(page.getByTestId("appearance-fill-controls")).toBeVisible();
    await page.getByTestId("appearance-back").click();
    await expect(page.getByTestId("appearance-category-overview")).toBeVisible();
    await page.getByTestId("appearance-category-border").click();
    await expect(page.getByTestId("appearance-border-controls")).toBeVisible();
    await page.getByTestId("border-style-solid").click();
    await page.screenshot({ path: path.join(evidenceDir, "19-coupon-border.png") });
    await page.getByTestId("border-style-none").click();

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
    await page.locator('[data-primitive="text"]').first().click({ force: true });
    await page.getByTestId("card-creative-tool-text").click();
    await page.getByTestId("magic-write-open").click();
    await expect(page.getByTestId("magic-write-panel")).toBeVisible();
    await page.getByTestId("magic-write-panel").locator("textarea").first().fill("Rewrite this for a coffee shop");
    await page.getByTestId("magic-write-submit").click();
    await expect(page.getByTestId("magic-write-result")).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, "20-magic-write.png") });
    await page.getByTestId("magic-write-apply").click();

    // Preview / reload / 390
    await page.getByRole("button", { name: /Preview draft/i }).click();
    await page.screenshot({ path: path.join(evidenceDir, "21-preview.png") });
    await page.goBack({ waitUntil: "domcontentloaded" }).catch(() => undefined);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("card-edit-workspace-host")).toHaveAttribute("data-builder-ready", "true", { timeout: 60_000 });
    await dismissBlockingChrome(page);
    await page.screenshot({ path: path.join(evidenceDir, "22-reload.png") });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(evidenceDir, "23-390px.png") });

    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter((v) => v.impact === "critical")).toEqual([]);
  });
});
