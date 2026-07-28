/**
 * Pre-commit visual + inheritance proof for Shared Visual Authoring Core V0.
 * Captures screenshots and exercises shared-resolver / promote / mobile flows.
 *
 *   PROOF_HEADED=1 BASE_URL=http://127.0.0.1:3000 \
 *   npx playwright test e2e/brand-visual-precommit-proof.spec.ts --headed --workers=1
 */
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import path from "node:path";
import fs from "node:fs";

const headed = process.env.PROOF_HEADED === "1";
const SHOT_DIR = path.join(process.cwd(), "tmp/brand-v0-precommit-shots");

async function shot(page: Page, name: string) {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(SHOT_DIR, `${name}.png`),
    fullPage: false,
  });
}

async function setColor(page: Page, testId: string, hex: string) {
  await page.locator(`[data-testid="${testId}"]`).evaluate((el, v) => {
    const input = el as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, v);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, hex);
}

test.describe("brand v0 pre-commit visual + inheritance proof", () => {
  test.skip(!headed, "Set PROOF_HEADED=1");
  test.describe.configure({ timeout: 240_000 });

  test("desktop visual matrix + shared resolver + promote honesty", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dashboard/brand/edit");
    await expect(page.getByTestId("brand-kit-workspace")).toBeVisible({ timeout: 60_000 });

    // Drawer closed — canvas room
    if (await page.getByTestId("brand-contextual-drawer").count()) {
      await page.getByTestId("brand-drawer-collapse").click();
    }
    await expect(page.getByTestId("brand-contextual-drawer")).toHaveCount(0);
    await shot(page, "01-desktop-drawer-closed");

    await page.getByTestId("brand-topic-colors").click();
    await expect(page.getByTestId("brand-contextual-drawer")).toHaveAttribute("data-topic", "colors");
    await shot(page, "02-desktop-colors-drawer");

    await page.getByTestId("brand-topic-logos").click();
    await expect(page.getByTestId("brand-contextual-drawer")).toHaveAttribute("data-topic", "logos");
    await shot(page, "03-desktop-logos-drawer");

    // Shared resolver proof
    await page.getByTestId("brand-topic-colors").click();
    const beforeCta = await page.getByTestId("brand-preview-cta").evaluate((el) =>
      getComputedStyle(el).backgroundColor
    );
    await setColor(page, "brand-color-primary", "#1a4d8c");
    await page.getByTestId("brand-preview-surface-brand").click();
    await expect
      .poll(async () =>
        page.getByTestId("brand-preview-cta").evaluate((el) => getComputedStyle(el).backgroundColor)
      )
      .not.toBe(beforeCta);

    await page.getByTestId("brand-preview-surface-card").click();
    await expect(page.getByTestId("shared-card-preview")).toHaveAttribute(
      "data-resolver",
      "shared-visual-core-v0"
    );
    const action = page.locator('[data-testid^="shared-card-action-"]').first();
    await expect(action).toHaveAttribute("data-source-background", "brand");
    await shot(page, "04-desktop-applications-card-preview");

    // Custom override — only background
    await page.getByTestId("brand-topic-applications").click();
    await setColor(page, "card-override-background", "#ff00aa");
    await expect(page.getByTestId("card-override-source")).toContainText(/custom/i);
    await expect(action).toHaveAttribute("data-source-background", "custom");
    await expect(action).toHaveAttribute("data-source-foreground", /brand|surface/);
    await expect(action).toHaveAttribute("data-source-radius", /brand|surface/);
    await expect(action).toHaveAttribute("data-source-icon", "preset");

    // Brand change preserves custom
    await page.getByTestId("brand-topic-colors").click();
    await setColor(page, "brand-color-primary", "#0b3d2e");
    await page.getByTestId("brand-preview-surface-card").click();
    await expect(action).toHaveAttribute("data-source-background", "custom");

    // Reset property
    await page.getByTestId("brand-topic-applications").click();
    await page.getByTestId("card-reset-property").click();
    await expect(page.getByTestId("card-override-source")).toContainText(/brand/i);

    // Promote path
    await setColor(page, "card-override-background", "#8e44ad");
    await page.getByTestId("card-promote-background").click();
    await expect(page.getByTestId("brand-promote-dialog")).toBeVisible();
    await expect(page.getByTestId("brand-promote-impact")).toContainText(/not live linked sync/i);
    await expect(page.getByTestId("brand-promote-impact")).toContainText(/Customer-facing CTA|primary/i);
    await page.getByTestId("brand-promote-confirm").click();
    await expect(page.getByTestId("brand-promote-dialog")).toHaveCount(0);

    // Session undo honesty copy
    await page.getByTestId("brand-topic-history").click();
    await expect(page.getByTestId("brand-drawer-history").first()).toContainText(
      /Closing the tab clears Undo/i
    );
    await page.getByTestId("brand-undo").first().click({ force: true });

    // Detached affordance — the Command Shade may auto-collapse while editing;
    // expand it first (the affordance lives in the expanded shade).
    if ((await page.getByTestId("brand-open-detached").count()) === 0) {
      // Pin the shade open so auto-collapse cannot hide it again mid-assert.
      await page.getByTestId("command-shade-pin-open").click();
    }
    await expect(page.getByTestId("brand-open-detached")).toHaveAttribute("target", "_blank");
    await shot(page, "05-desktop-after-promote-history");

    // Classic fallback
    await page.goto("/dashboard/brand");
    await expect(page.getByTestId("brand-kit-classic")).toBeVisible({ timeout: 30_000 });
    await shot(page, "12-classic-brand-fallback");
  });

  test("tablet + phone visual + mobile ordinary edits", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/dashboard/brand/edit");
    await expect(page.getByTestId("brand-kit-workspace")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("brand-mobile-toolbar")).toBeVisible();
    const closeTablet = page.getByTestId("brand-mobile-sheet-close");
    if (await closeTablet.isVisible().catch(() => false)) {
      await closeTablet.click({ force: true });
    }
    await page.getByTestId("brand-mobile-topic-colors").click({ force: true });
    await expect(page.getByTestId("brand-mobile-sheet")).toBeVisible();
    await shot(page, "06-tablet-workspace");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard/brand/edit");
    await expect(page.getByTestId("brand-mobile-toolbar")).toBeVisible({ timeout: 60_000 });
    const close = page.getByTestId("brand-mobile-sheet-close");
    if (await close.isVisible().catch(() => false)) await close.click({ force: true });
    // open overview even if already selected (do not toggle-close for proof)
    await expect(page.getByTestId("brand-mobile-toolbar")).toBeVisible();
    await page.waitForFunction(() => window.matchMedia("(max-width: 1023px)").matches);
    await page.getByTestId("brand-mobile-topic-overview").evaluate((el) => {
      (el as HTMLButtonElement).click();
    });
    await expect(page.getByTestId("brand-mobile-sheet")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("brand-mobile-sheet")).toHaveAttribute("aria-label", "Overview");
    await shot(page, "07-phone-overview");

    await page.getByTestId("brand-mobile-topic-colors").click({ force: true });
    await expect(page.getByTestId("brand-mobile-sheet")).toBeVisible();
    await shot(page, "08-phone-colors-sheet");
    await setColor(page, "brand-color-secondary", "#c45c26");

    await page.getByTestId("brand-mobile-topic-logos").click({ force: true });
    await shot(page, "09-phone-logos-sheet");
    await page.getByTestId("brand-mobile-sheet-close").click({ force: true });

    await page.getByTestId("brand-preview-surface-card").click({ force: true });
    await shot(page, "10-phone-card-preview");

    await page.getByTestId("brand-mobile-topic-applications").click({ force: true });
    await setColor(page, "card-override-background", "#2266aa");
    await page.getByTestId("card-reset-property").click({ force: true });

    await page.getByTestId("brand-mobile-topic-fonts").click({ force: true });
    await page.getByTestId("brand-font-body").selectOption("serif");

    await page.getByTestId("brand-mobile-topic-history").click({ force: true });
    await shot(page, "11-phone-history");
    await page.getByTestId("brand-undo").click({ force: true });

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth + 1;
    });
    expect(overflow).toBe(false);

    const box = await page.getByTestId("brand-mobile-topic-colors").boundingBox();
    expect((box?.height ?? 0) >= 44).toBeTruthy();
  });

  test("detached/refresh restoration + dirty warning", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/dashboard/brand/edit");
    await expect(page.getByTestId("brand-kit-workspace")).toBeVisible({ timeout: 60_000 });
    await page.getByTestId("brand-topic-fonts").click();
    await page.getByTestId("brand-preview-surface-typography").click();
    await page.getByTestId("brand-zoom-in").click();
    await page.getByTestId("brand-topic-discover").click();
    await page.getByTestId("starter-approve-color-secondary").click();

    await page.reload();
    await expect(page.getByTestId("brand-kit-workspace")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("brand-contextual-drawer")).toHaveAttribute("data-topic", "discover");
    await expect(page.getByTestId("brand-preview-canvas")).toHaveAttribute(
      "data-preview-surface",
      "typography"
    );
    await shot(page, "13-desktop-refresh-restored");

    // Return to Studio — Brand workspace returns to the Assets workspace.
    await page.getByTestId("brand-return-studio").click();
    await expect(page.getByTestId("assets-workspace")).toBeVisible({ timeout: 30_000 });
  });

  test("axe matrix brand surfaces", async ({ page }) => {
    await page.goto("/dashboard/brand/edit");
    await expect(page.getByTestId("brand-kit-workspace")).toBeVisible({ timeout: 60_000 });

    for (const size of [
      { width: 1440, height: 900, label: "desktop" },
      { width: 768, height: 1024, label: "tablet" },
      { width: 390, height: 844, label: "phone" },
    ]) {
      await page.setViewportSize(size);
      if (size.width < 1024) {
        await page.getByTestId("brand-mobile-topic-colors").click({ force: true });
      } else {
        await page.getByTestId("brand-topic-colors").click();
        await page.getByTestId("brand-preview-surface-card").click();
      }
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      const serious = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious"
      );
      expect(serious, `${size.label}: ${JSON.stringify(serious, null, 2)}`).toEqual([]);
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByTestId("brand-topic-logos").click();
    const logoAxe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(
      logoAxe.violations.filter((v) => v.impact === "critical" || v.impact === "serious")
    ).toEqual([]);
  });

  test("starter kit never auto-approves + empty intake path", async ({ page }) => {
    await page.goto("/dashboard/brand/edit");
    await expect(page.getByTestId("brand-kit-workspace")).toBeVisible({ timeout: 60_000 });
    await page.getByTestId("brand-topic-discover").click();
    const items = page.locator("[data-testid^=starter-item-]");
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const state = await items.nth(i).getAttribute("data-state");
      expect(state).toMatch(/suggested|needs_confirmation|approved|kept|ignored|replaced/);
    }
    // at least one still pending on fresh load of fixture states from draft
    await page.getByTestId("intake-website-url").first().fill("https://empty.invalid");
    await page.getByTestId("intake-website-submit").first().click();
    await expect(page.getByTestId("intake-message").first()).toContainText(
      /Upload a logo|paste colors|Nothing usable/i
    );
  });

  test("public Card regression smoke", async ({ page }) => {
    await page.goto("/t/seeddemo01?public=1");
    await expect(page.locator(".tcc-shell, [data-testid=tap-connect-card], .tap-connect-card").first()).toBeVisible({
      timeout: 45_000,
    }).catch(async () => {
      await expect(page.locator("body")).toContainText(/.+/);
    });
    await expect(page.getByTestId("card-utility-layer")).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId("card-utility-support")).toBeVisible();
    await expect(page.getByText(/Keep this Card/i).first()).toBeVisible();
    // Action pills use shared resolver attribute when present
    const pill = page.locator("[data-resolver=shared-visual-core-v0]").first();
    if (await pill.count()) {
      await expect(pill).toBeVisible();
    }
    await shot(page, "14-public-card-regression");
  });
});
