/**
 * Shared Visual Authoring Core V0 + Brand Kit focused workspace.
 *
 * Usage:
 *   PROOF_HEADED=1 BASE_URL=http://127.0.0.1:3000 \
 *   npx playwright test e2e/brand-visual-authoring-core.spec.ts --headed
 */
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const headed = process.env.PROOF_HEADED === "1";

test.describe("brand visual authoring core v0", () => {
  test.skip(!headed, "Set PROOF_HEADED=1 for headed Brand Kit workspace proofs");
  test.describe.configure({ timeout: 180_000 });

  test("Assets entry opens focused Brand Kit workspace", async ({ page }) => {
    await page.goto("/dashboard/assets");
    await expect(page.getByTestId("assets-workspace")).toBeVisible({ timeout: 60_000 });
    await page.getByTestId("assets-cta-brand").click();
    await expect(page.getByTestId("brand-kit-workspace")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("authoring-workspace-shell")).toBeVisible();
    await expect(page.getByTestId("dashboard-chrome")).toHaveAttribute(
      "data-escape-mode",
      "true"
    );
  });

  test("topics open drawer; active topic / collapse / Esc closes; Esc exits when closed", async ({
    page,
  }) => {
    await page.goto("/dashboard/brand/edit");
    await expect(page.getByTestId("brand-kit-workspace")).toBeVisible({ timeout: 60_000 });
    await page.getByTestId("brand-topic-colors").click();
    await expect(page.getByTestId("brand-contextual-drawer")).toBeVisible();
    await expect(page.getByTestId("brand-contextual-drawer")).toHaveAttribute(
      "data-topic",
      "colors"
    );
    await page.getByTestId("brand-topic-fonts").click();
    await expect(page.getByTestId("brand-contextual-drawer")).toHaveAttribute(
      "data-topic",
      "fonts"
    );
    await page.getByTestId("brand-drawer-collapse").click();
    await expect(page.getByTestId("brand-contextual-drawer")).toHaveCount(0);
    await page.getByTestId("brand-topic-overview").click();
    await expect(page.getByTestId("brand-contextual-drawer")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("brand-contextual-drawer")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("brand-kit-classic")).toBeVisible({ timeout: 30_000 });
  });

  test("Starter Kit approve + Card override + Brand change + reset + undo/redo", async ({
    page,
  }) => {
    await page.goto("/dashboard/brand/edit");
    await expect(page.getByTestId("brand-kit-workspace")).toBeVisible({ timeout: 60_000 });

    await page.getByTestId("brand-topic-discover").click();
    await expect(page.getByTestId("brand-drawer-discover")).toBeVisible();
    await expect(
      page.getByTestId("brand-drawer-discover").getByText("We found your Brand.")
    ).toBeVisible();
    await expect(page.getByTestId("starter-item-color-primary")).toHaveAttribute(
      "data-state",
      /suggested|needs_confirmation/
    );
    await page.getByTestId("starter-approve-color-primary").click();
    await expect(page.getByTestId("starter-item-color-primary")).toHaveAttribute(
      "data-state",
      "approved"
    );

    await page.getByTestId("brand-preview-surface-card").click();
    await expect(page.getByTestId("shared-card-preview")).toBeVisible();
    await expect(page.getByTestId("shared-card-preview")).toHaveAttribute(
      "data-resolver",
      "shared-visual-core-v0"
    );

    await page.getByTestId("brand-topic-applications").click();
    await page.locator('[data-testid="card-override-background"]').evaluate((el, v) => {
      const input = el as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      )?.set;
      setter?.call(input, v);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, "#ff00aa");
    await expect(page.getByTestId("card-override-source")).toContainText(/custom/i, {
      timeout: 10_000,
    });

    await page.getByTestId("brand-topic-colors").click();
    await page.locator('[data-testid="brand-color-primary"]').evaluate((el, v) => {
      const input = el as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      )?.set;
      setter?.call(input, v);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, "#003366");

    await page.getByTestId("brand-preview-surface-card").click();
    const action = page.locator('[data-testid^="shared-card-action-"]').first();
    await expect(action).toHaveAttribute("data-source-background", "custom");

    await page.getByTestId("brand-topic-applications").click();
    await page.getByTestId("card-reset-property").click();
    await expect(page.getByTestId("card-override-source")).toContainText(/brand/i);

    await page.getByTestId("brand-undo").first().click();
    await page.getByTestId("brand-redo").first().click();

    // Restore seed Brand primary — do not leave #003366 (fails public CTA contrast).
    await page.getByTestId("brand-topic-colors").click();
    await page.locator('[data-testid="brand-color-primary"]').evaluate((el, v) => {
      const input = el as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      )?.set;
      setter?.call(input, v);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, "#22c55e");
    await expect(page.getByTestId("brand-color-primary")).toHaveValue(/#22c55e/i);
  });

  test("logo plates + mobile toolbar / bottom sheet", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard/brand/edit");
    await expect(page.getByTestId("brand-kit-workspace")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("brand-mobile-toolbar")).toBeVisible();
    // Dismiss Next.js overlay if present
    await page.keyboard.press("Escape").catch(() => undefined);
    const closeSheet = page.getByTestId("brand-mobile-sheet-close");
    if (await closeSheet.isVisible().catch(() => false)) {
      await closeSheet.click({ force: true });
    }
    await page.getByTestId("brand-mobile-topic-discover").click({ force: true });
    await expect(page.getByTestId("brand-mobile-sheet")).toBeVisible();
    await page.getByTestId("starter-approve-logo-primary").click({ force: true });
    await page.getByTestId("brand-mobile-topic-logos").click({ force: true });
    await expect(page.getByTestId("brand-mobile-sheet")).toBeVisible();
    await expect(page.getByTestId("logo-library")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("logo-plate-dark").first()).toBeVisible();
    await expect(page.getByTestId("logo-plate-light").first()).toBeVisible();
    await expect(page.getByTestId("logo-plate-checker").first()).toBeVisible();
    await expect(page.locator('[data-object-fit="contain"]').first()).toBeVisible();
  });

  test("detached tab / refresh restoration", async ({ page }) => {
    await page.goto("/dashboard/brand/edit");
    await expect(page.getByTestId("brand-kit-workspace")).toBeVisible({ timeout: 60_000 });
    await page.getByTestId("brand-topic-fonts").click();
    await page.getByTestId("brand-preview-surface-typography").click();
    await page.getByTestId("brand-zoom-in").click();
    await page.reload();
    await expect(page.getByTestId("brand-kit-workspace")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("brand-contextual-drawer")).toHaveAttribute(
      "data-topic",
      "fonts"
    );
    await expect(page.getByTestId("brand-preview-canvas")).toHaveAttribute(
      "data-preview-surface",
      "typography"
    );
    await expect(page.getByTestId("brand-open-detached")).toHaveAttribute("target", "_blank");
  });

  test("forced dark + green CTA + restrained zone glow + a11y", async ({ page }) => {
    await page.goto("/dashboard/brand/edit");
    await expect(page.getByTestId("brand-kit-workspace")).toBeVisible({ timeout: 60_000 });
    const bg = await page.getByTestId("brand-kit-workspace").evaluate((el) =>
      getComputedStyle(el).backgroundColor
    );
    expect(bg).toMatch(/rgb\(5,\s*8,\s*20\)|#050814/i);
    await expect(page.getByTestId("brand-done-editing")).toHaveClass(/bg-primary/);
    await expect(page.locator(".brand-zone-glow")).toBeVisible();

    for (const size of [
      { width: 1280, height: 800 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(size);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      const serious = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious"
      );
      expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
    }

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByTestId("brand-topic-colors").focus();
    await expect(page.getByTestId("brand-topic-colors")).toBeFocused();
  });
});
