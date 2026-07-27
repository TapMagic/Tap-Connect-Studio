/**
 * Campaign Format Migration — headed Adaptive Workspace Shell + shared visual proofs.
 *
 * Usage:
 *   PROOF_HEADED=1 BASE_URL=http://127.0.0.1:3000 \
 *   npx playwright test e2e/campaign-format-migration.spec.ts --headed
 */
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const headed = process.env.PROOF_HEADED === "1";
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";

test.describe("campaign format migration", () => {
  test.skip(!headed, "Set PROOF_HEADED=1 for headed Campaign Format Migration proofs");
  test.describe.configure({ timeout: 180_000 });

  test("Campaign adopts Command Shade + adaptive drawer + live canvas", async ({
    page,
  }) => {
    await page.goto(`${BASE}/dashboard/campaigns`);
    // Open first campaign link if present; otherwise workbench → skip soft
    const editLink = page.locator('a[href*="/dashboard/campaigns/"]').first();
    if ((await editLink.count()) === 0) {
      test.skip(true, "No campaign available in local seed");
      return;
    }
    await editLink.click();
    await expect(page.getByTestId("campaign-editor")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("campaign-editor")).toHaveAttribute(
      "data-adaptive-shell",
      "v1"
    );
    await expect(page.getByTestId("campaign-editor")).toHaveAttribute(
      "data-resolver",
      "shared-visual-core-v0"
    );
    await expect(page.getByTestId("command-shade")).toBeVisible();
    await expect(page.getByTestId("authoring-workspace-shell")).toHaveAttribute(
      "data-adaptive-shell",
      "v1"
    );

    await page.getByTestId("campaign-tool-colors").click();
    await expect(page.getByTestId("campaign-contextual-drawer")).toBeVisible();
    await expect(page.getByTestId("campaign-contextual-drawer")).toHaveAttribute(
      "data-drawer-size",
      "compact"
    );
    await expect(page.getByTestId("campaign-drawer-colors")).toBeVisible();

    // Live canvas remains mounted
    await expect(page.getByTestId("campaign-live-canvas")).toBeVisible();
    await expect(page.getByTestId("campaign-phone-preview")).toBeVisible();
    await expect(page.getByTestId("campaign-phone-preview")).toHaveAttribute(
      "data-live-surface",
      "true"
    );

    // Green Save CTA
    await expect(page.getByTestId("campaign-save")).toBeVisible();
    await expect(page.getByTestId("campaign-save")).toHaveClass(/bg-primary/);

    // One drawer at a time — switch tools
    await page.getByTestId("campaign-tool-typography").click();
    await expect(page.getByTestId("campaign-drawer-typography")).toBeVisible();
    await expect(page.getByTestId("campaign-drawer-colors")).toHaveCount(0);

    await page.getByTestId("campaign-tool-media").click();
    await expect(page.getByTestId("campaign-contextual-drawer")).toHaveAttribute(
      "data-drawer-size",
      "library"
    );
  });

  test("Campaign surface override + CTA custom + reset + undo", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/campaigns`);
    const editLink = page.locator('a[href*="/dashboard/campaigns/"]').first();
    if ((await editLink.count()) === 0) {
      test.skip(true, "No campaign available in local seed");
      return;
    }
    await editLink.click();
    await expect(page.getByTestId("campaign-editor")).toBeVisible({ timeout: 60_000 });

    await page.getByTestId("campaign-tool-colors").click();
    const bg = page.getByTestId("campaign-color-background-hex");
    await bg.click();
    await bg.fill("#224466");
    await bg.blur();
    await expect(page.getByTestId("campaign-provenance-surface").first()).toBeVisible({
      timeout: 10_000,
    });

    await page.getByTestId("campaign-tool-buttons").click();
    if ((await page.getByTestId("campaign-cta-set-custom-proof").count()) > 0) {
      await page.getByTestId("campaign-cta-set-custom-proof").click();
      await expect(page.getByTestId("campaign-provenance-custom").first()).toBeVisible({
        timeout: 10_000,
      });
      await page.getByTestId("campaign-cta-reset-bg").click();
    }

    await page.getByTestId("campaign-undo").click();
    await expect(page.getByTestId("campaign-phone-preview")).toBeVisible();
  });

  test("detached tab + phone layout + axe", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/campaigns`);
    const editLink = page.locator('a[href*="/dashboard/campaigns/"]').first();
    if ((await editLink.count()) === 0) {
      test.skip(true, "No campaign available in local seed");
      return;
    }
    await editLink.click();
    await expect(page.getByTestId("campaign-editor")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("campaign-open-detached")).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId("campaign-editor")).toBeVisible();
    await expect(page.getByTestId("campaign-mobile-toolbar")).toBeVisible();
    await page.getByTestId("campaign-mobile-tool-colors").click();
    await expect(
      page.getByTestId("campaign-mobile-sheet").or(page.getByTestId("campaign-contextual-drawer"))
    ).toBeVisible({ timeout: 15_000 });

    await page.setViewportSize({ width: 1280, height: 800 });
    const axe = await new AxeBuilder({ page })
      .include('[data-testid="command-shade"]')
      .include('[data-testid="campaign-tool-rail"]')
      .disableRules(["color-contrast"])
      .analyze();
    const serious = axe.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );
    expect(serious).toEqual([]);
  });
});
