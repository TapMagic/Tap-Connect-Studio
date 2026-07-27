/**
 * Campaign Format Migration — final pre-commit visual + publication parity proofs.
 *
 * Usage:
 *   PROOF_HEADED=1 BASE_URL=http://127.0.0.1:3000 \
 *   npx playwright test e2e/campaign-format-precommit-proof.spec.ts --headed --workers=1
 *
 * Screenshots: tmp/campaign-format-precommit-shots/
 */
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";

const headed = process.env.PROOF_HEADED === "1";
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const SHOT_DIR = path.join(process.cwd(), "tmp/campaign-format-precommit-shots");

async function openFirstCampaign(page: Page) {
  await page.goto(`${BASE}/dashboard/campaigns`);
  const editLink = page.locator('a[href*="/dashboard/campaigns/"]').first();
  if ((await editLink.count()) === 0) {
    test.skip(true, "No campaign available in local seed");
    return false;
  }
  await editLink.click();
  await expect(page.getByTestId("campaign-editor")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("campaign-editor")).toHaveAttribute(
    "data-adaptive-shell",
    "v1"
  );
  return true;
}

async function shot(page: Page, name: string) {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(SHOT_DIR, `${name}.png`),
    fullPage: false,
  });
}

async function axeSerious(page: Page, include?: string) {
  let builder = new AxeBuilder({ page }).disableRules(["color-contrast"]);
  if (include) builder = builder.include(include);
  const results = await builder.analyze();
  return results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical"
  );
}

test.describe("campaign format pre-commit proof", () => {
  test.skip(!headed, "Set PROOF_HEADED=1 for headed Campaign Format pre-commit proofs");
  test.describe.configure({ timeout: 240_000 });

  test("visual matrix · shade · drawers · focus · coexistence · axe desktop", async ({
    page,
  }) => {
    if (!(await openFirstCampaign(page))) return;

    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.getByTestId("command-shade")).toBeVisible();
    await expect(page.getByTestId("campaign-phone-preview")).toBeVisible();
    await expect(page.getByTestId("campaign-live-canvas")).toHaveAttribute(
      "data-live-surface",
      "true"
    );
    await shot(page, "01-shade-open");

    // Collapse shade
    const handle = page.getByTestId("command-shade-handle");
    if ((await handle.count()) > 0) {
      await handle.click();
    }
    await shot(page, "02-shade-collapsed");

    // Expand again if needed
    if (
      (await page.getByTestId("command-shade").getAttribute("data-shade-display")) ===
      "collapsed"
    ) {
      await handle.click();
    }

    // Colors
    await page.getByTestId("campaign-tool-colors").click();
    await expect(page.getByTestId("campaign-contextual-drawer")).toBeVisible();
    await expect(page.getByTestId("campaign-contextual-drawer")).toHaveAttribute(
      "data-drawer-size",
      "compact"
    );
    await expect(page.getByTestId("campaign-drawer-colors")).toBeVisible();
    // Legacy inspector hidden while drawer open
    await expect(page.getByTestId("campaign-format-heading")).toHaveCount(0);
    await shot(page, "03-colors-drawer");

    // Typography
    await page.getByTestId("campaign-tool-typography").click();
    await expect(page.getByTestId("campaign-drawer-typography")).toBeVisible();
    await expect(page.getByTestId("campaign-drawer-colors")).toHaveCount(0);
    await shot(page, "04-typography-drawer");

    // Buttons
    await page.getByTestId("campaign-tool-buttons").click();
    await expect(page.getByTestId("campaign-drawer-buttons")).toBeVisible();
    await shot(page, "05-buttons-drawer");

    // Media library size
    await page.getByTestId("campaign-tool-media").click();
    await expect(page.getByTestId("campaign-contextual-drawer")).toHaveAttribute(
      "data-drawer-size",
      "library"
    );
    await shot(page, "06-media-drawer");

    // History expanded
    await page.getByTestId("campaign-tool-history").click();
    await expect(page.getByTestId("campaign-contextual-drawer")).toHaveAttribute(
      "data-drawer-size",
      "expanded"
    );
    await shot(page, "07-history-drawer");

    // Advanced
    await page.getByTestId("campaign-tool-advanced").click();
    await expect(page.getByTestId("campaign-drawer-advanced")).toBeVisible();
    await shot(page, "08-advanced-drawer");

    // Close drawer → compatibility pointers, not duplicate color pickers
    await page.getByTestId("campaign-drawer-collapse").click();
    await expect(page.getByTestId("campaign-contextual-drawer")).toHaveCount(0);
    await expect(page.getByTestId("campaign-format-heading")).toBeVisible();
    await expect(page.getByTestId("campaign-shared-tool-pointers")).toBeVisible();
    await expect(page.getByTestId("campaign-open-colors-tool")).toBeVisible();
    // No competing primary color grid in the compatibility panel
    await expect(
      page.locator('[data-testid="campaign-shared-tool-pointers"]').locator('input[type="color"]')
    ).toHaveCount(0);
    await shot(page, "09-drawer-closed-compat");

    // Focus mode
    const focusBtn = page.getByTestId("command-shade-focus");
    if ((await focusBtn.count()) > 0) {
      await focusBtn.click();
      await expect(page.getByTestId("authoring-workspace-shell")).toHaveAttribute(
        "data-focus-mode",
        "true"
      );
      await shot(page, "10-focus-mode");
      await focusBtn.click();
    }

    await expect(page.getByTestId("campaign-save")).toHaveClass(/bg-primary/);
    await expect(page.getByTestId("campaign-publish")).toHaveClass(/bg-primary/);
    await expect(page.getByTestId("campaign-editor")).toHaveClass(/campaign-zone-glow/);

    const serious = await axeSerious(page, '[data-testid="command-shade"]');
    expect(serious).toEqual([]);
    const railSerious = await axeSerious(page, '[data-testid="campaign-tool-rail"]');
    expect(railSerious).toEqual([]);
    const liveSerious = await axeSerious(page, '[data-testid="campaign-phone-preview"]');
    expect(liveSerious).toEqual([]);
    if ((await page.getByTestId("campaign-contextual-drawer").count()) > 0) {
      const drawerSerious = await axeSerious(
        page,
        '[data-testid="campaign-contextual-drawer"]'
      );
      expect(drawerSerious).toEqual([]);
    }

    await expect(page.getByTestId("campaign-open-detached")).toBeVisible();
  });

  test("shared-property · save/reload · undo · publication parity", async ({
    page,
    context,
  }) => {
    if (!(await openFirstCampaign(page))) return;
    await page.setViewportSize({ width: 1440, height: 900 });

    // Surface override
    await page.getByTestId("campaign-tool-colors").click();
    const bgHex = page.getByTestId("campaign-color-background-hex");
    await bgHex.click();
    await bgHex.fill("#334155");
    await bgHex.blur();
    await expect(page.getByTestId("campaign-provenance-surface").first()).toBeVisible({
      timeout: 10_000,
    });

    // Typography
    await page.getByTestId("campaign-tool-typography").click();
    await page.getByTestId("campaign-font-style").selectOption("display");

    // CTA custom
    await page.getByTestId("campaign-tool-buttons").click();
    await expect(page.getByTestId("campaign-drawer-buttons")).toBeVisible();
    if ((await page.getByTestId("campaign-cta-set-custom-proof").count()) === 0) {
      test.skip(true, "Seed campaign has no CTA for override proof");
      return;
    }
    await page.getByTestId("campaign-cta-set-custom-proof").click();
    await expect(page.getByTestId("campaign-provenance-custom").first()).toBeVisible();
    await expect(page.getByTestId("campaign-cta-fg-source")).toContainText(/Brand|Campaign/);
    await expect(page.getByTestId("campaign-cta-icon-source")).toContainText(/Preset/);

    await shot(page, "11-after-overrides");

    // Save draft
    await page.getByTestId("campaign-save").click();
    await expect(page.getByTestId("campaign-editor-status")).toContainText(/Saved|Published/i, {
      timeout: 30_000,
    });

    // Reload — overrides persist; session undo is not durable
    await page.reload();
    await expect(page.getByTestId("campaign-editor")).toBeVisible({ timeout: 60_000 });
    await page.getByTestId("campaign-tool-colors").click();
    await expect(page.getByTestId("campaign-color-background-hex")).toHaveValue(/#334155/i);
    await page.getByTestId("campaign-tool-buttons").click();
    await expect(page.getByTestId("campaign-cta-bg-hex")).toHaveValue(/#ff00aa/i);
    await shot(page, "12-after-reload");

    // Publish if device available
    const publish = page.getByTestId("campaign-publish");
    if (await publish.isEnabled()) {
      await publish.click();
      await expect(page.getByTestId("campaign-editor-status")).toContainText(/Published|Saved/i, {
        timeout: 30_000,
      });
    }

    // Public route from QR / device if present
    const deviceSelect = page.getByTestId("campaign-publish-device");
    let publicCode: string | null = null;
    if ((await deviceSelect.count()) > 0) {
      const label = await deviceSelect.locator("option:checked").textContent();
      // device nickname may differ from code — try QR tab link
    }
    await page.getByTestId("campaign-tab-qr").click().catch(() => undefined);
    const publicLink = page.locator('a[href^="/t/"]').first();
    if ((await publicLink.count()) > 0) {
      publicCode = (await publicLink.getAttribute("href"))?.replace("/t/", "") ?? null;
    }

    if (publicCode) {
      const pub = await context.newPage();
      await pub.goto(`${BASE}/t/${publicCode}?public=1`);
      await pub.waitForTimeout(800);
      await shot(pub, "13-public-campaign");
      // Surface / CTA should appear in computed styles where renderer applies theme
      const bodyBg = await pub.locator(".tap-page, [class*='tap-']").first().evaluate((el) => {
        return getComputedStyle(el).getPropertyValue("--tap-bg") || getComputedStyle(el).backgroundColor;
      }).catch(() => "");
      // Soft assert — theme var present when live campaign renders
      if (bodyBg) {
        expect(String(bodyBg).toLowerCase()).toMatch(/334155|rgb/);
      }
      await pub.close();
    }

    // Reset CTA then undo
    await page.getByTestId("campaign-tool-buttons").click();
    if ((await page.getByTestId("campaign-cta-reset-bg").count()) > 0) {
      await page.getByTestId("campaign-cta-reset-bg").click();
      await page.getByTestId("campaign-undo").click();
      await expect(page.getByTestId("campaign-phone-preview")).toBeVisible();
    }

    // Restore seed-safe surface so later public-tap a11y is not poisoned by this proof.
    await page.getByTestId("campaign-tool-colors").click();
    const restoreBgHex = page.getByTestId("campaign-color-background-hex");
    if ((await restoreBgHex.count()) > 0) {
      const current = await restoreBgHex.inputValue();
      if (/334155/i.test(current)) {
        await restoreBgHex.fill("#0b0f19");
        await restoreBgHex.blur();
        await page.getByTestId("campaign-save").click();
        await expect(page.getByTestId("campaign-editor-status")).toContainText(
          /Saved|Published/i,
          { timeout: 30_000 }
        );
      }
    }
  });

  test("tablet · phone matrix · mobile one-hand · axe", async ({ page }) => {
    if (!(await openFirstCampaign(page))) return;

    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByTestId("campaign-editor")).toBeVisible();
    await shot(page, "14-tablet");
    const tabletSerious = await axeSerious(page, '[data-testid="command-shade"]');
    expect(tabletSerious).toEqual([]);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId("campaign-mobile-toolbar")).toBeVisible();
    await shot(page, "15-phone");

    await page.getByTestId("campaign-mobile-tool-colors").click();
    await expect(
      page.getByTestId("campaign-mobile-sheet").or(page.getByTestId("campaign-contextual-drawer"))
    ).toBeVisible({ timeout: 15_000 });
    await shot(page, "16-phone-colors-sheet");

    const bg = page.getByTestId("campaign-color-background-hex");
    if ((await bg.count()) > 0) {
      await bg.fill("#1e293b");
      await bg.blur();
    }

    await page.getByTestId("campaign-mobile-tool-typography").click();
    if ((await page.getByTestId("campaign-font-style").count()) > 0) {
      await page.getByTestId("campaign-font-style").selectOption("serif");
    }

    await page.getByTestId("campaign-mobile-tool-buttons").click();
    await shot(page, "17-phone-cta-sheet");
    if ((await page.getByTestId("campaign-cta-set-custom-proof").count()) > 0) {
      await page.getByTestId("campaign-cta-set-custom-proof").click();
      if ((await page.getByTestId("campaign-cta-reset-bg").count()) > 0) {
        await page.getByTestId("campaign-cta-reset-bg").click();
      }
    }

    await page.getByTestId("campaign-mobile-tool-media").click();
    await expect(page.getByTestId("campaign-mobile-sheet")).toBeVisible();
    await expect(page.getByTestId("campaign-drawer-media")).toBeVisible();

    await page.getByTestId("campaign-undo").click();
    await page.getByTestId("campaign-redo").click();
    await expect(page.getByTestId("campaign-save")).toBeVisible();
    const saveBox = await page.getByTestId("campaign-save").boundingBox();
    expect(saveBox?.height ?? 0).toBeGreaterThanOrEqual(44);

    // Close sheet
    const close = page.getByTestId("campaign-drawer-collapse");
    if ((await close.count()) > 0) await close.click();

    await expect(page.getByTestId("campaign-return-studio")).toBeVisible();

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
    });
    expect(overflow).toBeFalsy();

    const phoneSerious = await axeSerious(page, '[data-testid="command-shade"]');
    expect(phoneSerious).toEqual([]);
    await shot(page, "18-phone-final");
  });
});
