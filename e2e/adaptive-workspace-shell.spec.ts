/**
 * Adaptive Workspace Shell V1 — headed Brand + Card proofs.
 *
 * Usage:
 *   PROOF_HEADED=1 BASE_URL=http://127.0.0.1:3000 \
 *   npx playwright test e2e/adaptive-workspace-shell.spec.ts --headed
 */
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const headed = process.env.PROOF_HEADED === "1";

test.describe("adaptive workspace shell v1", () => {
  test.skip(!headed, "Set PROOF_HEADED=1 for headed Adaptive Workspace Shell proofs");
  test.describe.configure({ timeout: 180_000 });

  test("Brand Kit adopts Command Shade + adaptive drawer sizing", async ({ page }) => {
    await page.goto("/dashboard/brand/edit");
    await expect(page.getByTestId("brand-kit-workspace")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("command-shade")).toBeVisible();
    await expect(page.getByTestId("authoring-workspace-shell")).toHaveAttribute(
      "data-adaptive-shell",
      "v1"
    );

    // Overview / browse → shade open
    await expect(page.getByTestId("command-shade")).toHaveAttribute(
      "data-shade-display",
      /open|peek/
    );

    await page.getByTestId("brand-topic-logos").click();
    await expect(page.getByTestId("brand-contextual-drawer")).toBeVisible();
    await expect(page.getByTestId("brand-contextual-drawer")).toHaveAttribute(
      "data-drawer-size",
      "library"
    );
    // Edit/construct → shade collapses (auto)
    await expect(page.getByTestId("command-shade")).toHaveAttribute(
      "data-shade-display",
      "collapsed"
    );

    await page.getByTestId("brand-topic-colors").click();
    await expect(page.getByTestId("brand-contextual-drawer")).toHaveAttribute(
      "data-drawer-size",
      "compact"
    );
    await expect(page.getByTestId("brand-contextual-drawer")).toHaveAttribute(
      "data-topic",
      "colors"
    );

    // Live preview remains mounted
    await expect(page.getByTestId("brand-preview-canvas")).toBeVisible();
    await expect(page.getByTestId("authoring-canvas")).toHaveAttribute(
      "data-live-surface",
      "true"
    );

    // Green Done CTA
    await expect(page.getByTestId("brand-done-editing")).toBeVisible();
    await expect(page.getByTestId("brand-done-editing")).toHaveClass(/bg-primary/);

    // Collapse drawer → canvas expands
    await page.getByTestId("brand-drawer-collapse").click();
    await expect(page.getByTestId("brand-contextual-drawer")).toHaveCount(0);
    await expect(page.getByTestId("brand-preview-canvas")).toBeVisible();
  });

  test("Command Shade pin + focus + Esc priority", async ({ page }) => {
    await page.goto("/dashboard/brand/edit");
    await expect(page.getByTestId("brand-kit-workspace")).toBeVisible({ timeout: 60_000 });

    await page.getByTestId("command-shade-handle").click();
    // Ensure shade is expanded so pin controls are available
    if (
      (await page.getByTestId("command-shade").getAttribute("data-shade-display")) ===
      "collapsed"
    ) {
      await page.getByTestId("command-shade-handle").click();
    }
    await page.getByTestId("command-shade-pin-open").click();
    await expect(page.getByTestId("command-shade")).toHaveAttribute(
      "data-shade-preference",
      "pinned_open"
    );

    await page.getByTestId("brand-topic-fonts").click();
    // Pin open overrides edit collapse
    await expect(page.getByTestId("command-shade")).toHaveAttribute(
      "data-shade-display",
      "open"
    );

    await page.getByTestId("command-shade-auto").click();
    await expect(page.getByTestId("command-shade")).toHaveAttribute(
      "data-shade-preference",
      "auto"
    );

    await page.getByTestId("command-shade-focus").click();
    await expect(page.getByTestId("authoring-workspace-shell")).toHaveAttribute(
      "data-focus-mode",
      "true"
    );
    await expect(page.getByTestId("brand-contextual-drawer")).toHaveCount(0);

    // Esc exits focus first
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("authoring-workspace-shell")).toHaveAttribute(
      "data-focus-mode",
      "false"
    );
  });

  test("detached refresh restores shell chrome", async ({ page }) => {
    await page.goto("/dashboard/brand/edit");
    await expect(page.getByTestId("brand-kit-workspace")).toBeVisible({ timeout: 60_000 });
    await page.getByTestId("brand-topic-images").click();
    await expect(page.getByTestId("brand-contextual-drawer")).toHaveAttribute(
      "data-topic",
      "images"
    );
    await page.getByTestId("command-shade-pin-collapsed").click();

    await page.reload();
    await expect(page.getByTestId("brand-kit-workspace")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("brand-contextual-drawer")).toHaveAttribute(
      "data-topic",
      "images"
    );
    await expect(page.getByTestId("command-shade")).toHaveAttribute(
      "data-shade-preference",
      "pinned_collapsed"
    );
    await expect(page.getByTestId("brand-session-restore-notice")).toBeAttached();
  });

  test("Card full Adaptive Workspace Shell consumer", async ({ page }) => {
    await page.goto("/dashboard/card/edit");
    await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByTestId("card-edit-workspace-host")).toHaveAttribute(
      "data-adaptive-shell",
      "v1"
    );
    await expect(page.getByTestId("card-edit-workspace-host")).toHaveAttribute(
      "data-shell-consumer",
      "card-authoring"
    );
    await expect(page.getByTestId("command-shade")).toBeVisible();
    await expect(page.getByTestId("card-edit-compact-toolbar")).toBeAttached();
    await expect(page.getByTestId("tap-card-builder")).toBeVisible();
    await expect(page.getByTestId("tap-card-builder")).toHaveAttribute(
      "data-shell-hosted",
      "true"
    );
    await expect(page.getByTestId("card-preview-canvas")).toBeVisible();
    await expect(page.getByTestId("card-shade-done")).toHaveClass(/bg-primary/);
    await expect(page.locator(".builder-studio-toolbar")).toHaveCount(0);
    await expect(page.getByTestId("card-inspector-rail")).toBeHidden();

    await page.getByTestId("card-tool-colors").click();
    await expect(page.getByTestId("card-contextual-drawer")).toBeVisible();
    await expect(page.getByTestId("card-drawer-colors")).toBeVisible();

    await page.getByTestId("command-shade-focus").click();
    await expect(page.getByTestId("tap-card-builder")).toHaveAttribute(
      "data-focus-mode",
      "true"
    );
  });

  test("phone Brand one-hand flow uses bottom sheet", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard/brand/edit");
    await expect(page.getByTestId("brand-kit-workspace")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("command-shade")).toBeVisible();
    await page.getByTestId("brand-mobile-topic-logos").click();
    await expect(page.getByTestId("brand-mobile-sheet")).toBeVisible();
    await expect(page.getByTestId("brand-mobile-sheet")).toHaveAttribute(
      "data-mobile-sheet",
      "library"
    );
    await page.getByTestId("brand-mobile-topic-colors").click();
    await expect(page.getByTestId("brand-mobile-sheet")).toHaveAttribute(
      "data-topic",
      "colors"
    );
    await page.getByTestId("brand-mobile-sheet-close").click();
    await expect(page.getByTestId("brand-mobile-sheet")).toHaveCount(0);
    await expect(page.getByTestId("brand-done-editing")).toBeVisible();
  });

  test("axe matrix brand + card shell surfaces", async ({ page }) => {
    for (const path of ["/dashboard/brand/edit", "/dashboard/card/edit"] as const) {
      await page.goto(path);
      await expect(page.getByTestId("command-shade")).toBeVisible({ timeout: 60_000 });
      const results = await new AxeBuilder({ page })
        .disableRules(["color-contrast"]) // dark studio matrix; contrast covered by Brand unit checks
        .analyze();
      const serious = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical"
      );
      expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
    }
  });
});
