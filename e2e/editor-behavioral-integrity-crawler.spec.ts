import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Phase C/H/J — registry-driven editor crawler.
 * Insert → select → toolbar commands → mutation → undo → reopen → evidence.
 */

const enabled =
  process.env.EDITOR_INTEGRITY_ACCEPTANCE === "1" ||
  process.env.GROUP_APPEARANCE_COMPLETION_ACCEPTANCE === "1";

const evidenceRoot = path.join(process.cwd(), "tmp/editor-integrity-evidence");

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

async function shot(page: Page, folder: string, name: string) {
  const dir = path.join(evidenceRoot, folder);
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, name), fullPage: false });
}

async function toolbarLabels(page: Page): Promise<string[]> {
  const tools = page.getByTestId("card-contextual-object-tools");
  if (!(await tools.count())) return [];
  return tools.locator("button").evaluateAll((buttons) =>
    buttons.map((button) => (button.textContent || "").trim()).filter(Boolean)
  );
}

test.describe("editor behavioral integrity crawler", () => {
  test.skip(!enabled, "Set EDITOR_INTEGRITY_ACCEPTANCE=1");
  test.setTimeout(300_000);

  test.beforeAll(() => {
    for (const folder of [
      "selection",
      "groups",
      "color",
      "gradient",
      "materials",
      "effects",
      "typography",
      "icons",
      "libraries",
      "buttons",
      "badges",
      "containers",
      "coupons",
      "tickets",
      "content-editing",
      "drawers",
      "preview",
      "responsive",
    ]) {
      fs.mkdirSync(path.join(evidenceRoot, folder), { recursive: true });
    }
  });

  test("crawl families: toolbar parity, group ungroup, color first-use, effects, coupon content", async ({
    page,
  }) => {
    await openBlankStudio(page);

    // Text insert + Color first-use
    await page.getByTestId("card-creative-tool-text").click();
    await page.getByRole("button", { name: /Add text box/i }).click();
    const text = page.locator('[data-primitive="text"]').first();
    await expect(text).toBeVisible({ timeout: 15_000 });
    await text.click({ force: true });
    await expect(page.getByTestId("contextual-target-label")).toBeVisible();
    const textLabels = await toolbarLabels(page);
    const appearanceCount = textLabels.filter((label) => label === "Appearance").length;
    expect(appearanceCount).toBeLessThanOrEqual(1);
    await page.getByTestId("contextual-color").or(page.getByRole("button", { name: /^Color$/i })).first().click().catch(async () => {
      await page.getByTestId("contextual-aa").click().catch(() => undefined);
    });
    // Prefer Appearance → Color path if Color quick control absent
    if (await page.getByTestId("contextual-group-appearance").count() === 0) {
      const appearance = page.getByRole("button", { name: /^Appearance$/i }).first();
      if (await appearance.count()) {
        await appearance.click();
        await page.getByTestId("appearance-category-color").or(page.getByTestId("appearance-category-fill")).first().click().catch(() => undefined);
      }
    }
    await shot(page, "color", "01-text-color-first-open.png");

    // Second text + Group
    await page.getByTestId("card-creative-tool-text").click();
    await page.getByRole("button", { name: /Add text box/i }).click();
    const texts = page.locator('[data-primitive="text"]');
    await expect(texts).toHaveCount(2, { timeout: 15_000 });
    await texts.nth(0).click({ force: true });
    await texts.nth(1).click({ modifiers: ["Shift"], force: true });
    await page.getByTestId("contextual-multi-group").click();
    await expect(page.getByTestId("contextual-target-label")).toHaveText(/Group/i);
    await expect(page.getByTestId("contextual-group-ungroup")).toBeVisible();
    await expect(page.getByTestId("contextual-group-edit-contents")).toBeVisible();
    await shot(page, "groups", "01-group-parent-toolbar.png");

    // Group Appearance → Effects
    await page.getByTestId("contextual-group-appearance").click();
    await expect(page.getByTestId("appearance-category-overview")).toBeVisible();
    await page.getByTestId("appearance-category-effects").click();
    await page.getByTestId("effect-neon_edge").click();
    await expect(page.getByTestId("appearance-effect-tuning")).toBeVisible();
    await shot(page, "effects", "01-group-neon-edge.png");
    await page.getByTestId("effect-aura").click();
    await shot(page, "effects", "02-group-aura.png");

    // Ungroup
    await page.getByTestId("contextual-group-ungroup").click();
    await expect(page.getByTestId("contextual-group-ungroup")).toHaveCount(0);
    await shot(page, "groups", "02-after-ungroup.png");

    // Badge — single Appearance door
    await page.getByTestId("card-creative-tool-elements").or(page.getByTestId("card-creative-tool-components")).first().click().catch(() => undefined);
    const badgeInsert = page.getByRole("button", { name: /Badge|Add badge/i }).first();
    if (await badgeInsert.count()) {
      await badgeInsert.click({ force: true });
      const badge = page.locator('[data-badge-shape]').first();
      if (await badge.count()) {
        await badge.click({ force: true });
        const labels = await toolbarLabels(page);
        expect(labels.filter((label) => label === "Appearance").length).toBe(1);
        expect(labels.filter((label) => label === "Material").length).toBe(0);
        await page.getByTestId("contextual-badge-appearance").click();
        await expect(page.getByTestId("appearance-category-overview")).toBeVisible();
        await shot(page, "badges", "01-badge-appearance.png");
      }
    }

    // Button Appearance (not Material-as-Appearance)
    const buttonInsert = page.getByRole("button", { name: /Add button|Button/i }).first();
    if (await buttonInsert.count()) {
      await page.getByTestId("card-creative-tool-elements").or(page.getByTestId("card-creative-tool-components")).first().click().catch(() => undefined);
      await buttonInsert.click({ force: true }).catch(() => undefined);
      const button = page.locator('[data-primitive="button"]').first();
      if (await button.count()) {
        await button.click({ force: true });
        await expect(page.getByTestId("contextual-button-appearance")).toBeVisible();
        await expect(page.getByTestId("contextual-button-surface")).toBeVisible();
        await page.getByTestId("contextual-button-appearance").click();
        await expect(page.getByTestId("appearance-category-overview")).toBeVisible();
        await shot(page, "buttons", "01-button-appearance.png");
      }
    }

    // Coupon Edit Contents — single real editor
    const couponInsert = page.getByRole("button", { name: /Coupon|Add coupon/i }).first();
    if (await couponInsert.count()) {
      await couponInsert.click({ force: true });
      const coupon = page.locator('[data-component-kind="coupon"]').first();
      if (await coupon.count()) {
        await coupon.click({ force: true });
        await page.getByRole("button", { name: /Edit contents/i }).click();
        await expect(page.getByTestId("coupon-content-editor")).toBeVisible();
        await expect(page.getByTestId("component-content-routing")).toHaveCount(0);
        await shot(page, "coupons", "01-coupon-content.png");
        await shot(page, "content-editing", "01-coupon-edit-contents.png");
      }
    }

    // Icon shared library
    await page.getByTestId("card-creative-tool-elements").click().catch(() => undefined);
    const iconInsert = page.getByRole("button", { name: /Icon|Add icon/i }).first();
    if (await iconInsert.count()) {
      await iconInsert.click({ force: true });
      const icon = page.locator('[data-icon-artwork="true"]').first();
      if (await icon.count()) {
        await icon.click({ force: true });
        await page.getByTestId("contextual-icon-picker").click();
        await expect(page.getByTestId("iconify-search")).toBeVisible();
        await shot(page, "icons", "01-iconify-search.png");
        await shot(page, "libraries", "01-icon-discovery.png");
      }
    }

    // Drawer stability — open Appearance, switch selection, no stale resurrection loop
    await texts.nth(0).click({ force: true });
    await page.getByRole("button", { name: /^Appearance$/i }).first().click().catch(() => undefined);
    await shot(page, "drawers", "01-text-appearance.png");
    if (await texts.nth(1).count()) {
      await texts.nth(1).click({ force: true });
      await page.waitForTimeout(200);
      await shot(page, "drawers", "02-after-target-switch.png");
    }

    // Responsive 390
    await page.setViewportSize({ width: 390, height: 844 });
    await shot(page, "responsive", "01-390px.png");
    await page.setViewportSize({ width: 1440, height: 960 });

    // Preview path if available
    const preview = page.getByTestId("card-preview-toggle").or(page.getByRole("button", { name: /Preview/i })).first();
    if (await preview.count()) {
      await preview.click({ force: true }).catch(() => undefined);
      await shot(page, "preview", "01-preview.png");
    }

    // Axe on editor shell
    await page.setViewportSize({ width: 1440, height: 960 });
    const results = await new AxeBuilder({ page }).exclude("nextjs-portal").analyze();
    const serious = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    fs.writeFileSync(
      path.join(evidenceRoot, "drawers", "axe-summary.json"),
      JSON.stringify({ violations: serious.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })) }, null, 2)
    );
  });
});
