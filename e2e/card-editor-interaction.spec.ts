/**
 * Card editor interaction + Adaptive Task Drawer completion proofs.
 *
 * Usage:
 *   PROOF_HEADED=1 BASE_URL=http://127.0.0.1:3000 \
 *   npx playwright test e2e/card-editor-interaction.spec.ts --headed
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const headed = process.env.PROOF_HEADED === "1";
const shotDir = path.join("tmp", "card-editor-interaction-completion");

async function gotoCardEdit(page: Page) {
  await page.goto("/dashboard/card/edit");
  await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByTestId("tap-card-builder")).toBeVisible({ timeout: 30_000 });
}

test.describe("card editor interaction completion", () => {
  test.skip(!headed, "Set PROOF_HEADED=1 for headed Card interaction proofs");
  test.describe.configure({ timeout: 240_000 });

  test("desktop: one shell, drawers, no overlay, preview first-fold", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoCardEdit(page);

    await expect(page.getByTestId("command-shade")).toBeVisible();
    await expect(page.getByTestId("authoring-workspace-shell")).toHaveAttribute(
      "data-adaptive-shell",
      "v1"
    );
    await expect(page.locator(".builder-studio-toolbar")).toHaveCount(0);
    await expect(page.getByTestId("card-inspector-rail")).toBeHidden();
    await expect(page.getByTestId("card-mobile-sheet")).toHaveCount(0);

    // One Save + one primary Done (when clean)
    await expect(page.getByTestId("card-save")).toHaveCount(1);
    await expect(page.getByTestId("card-shade-done")).toHaveCount(1);
    await expect(page.getByTestId("card-shade-done")).toHaveClass(/bg-primary/);

    // Fit Card is not primary green
    await expect(page.getByTestId("card-zoom-fit")).not.toHaveClass(/bg-primary(?!\/)/);

    const canvas = page.getByTestId("card-preview-canvas");
    const box = await canvas.boundingBox();
    expect(box?.y ?? 999).toBeLessThan(340);
    expect(box?.height ?? 0).toBeGreaterThan(360);

    // No fixed bottom overlay covering lower half
    const overlay = await page.evaluate(() => {
      const main = document.querySelector('[data-testid="card-preview-canvas"]');
      if (!main) return { covered: true };
      const r = main.getBoundingClientRect();
      const midY = r.top + r.height * 0.7;
      const midX = r.left + r.width / 2;
      const el = document.elementFromPoint(midX, midY);
      const covered =
        !el ||
        (!main.contains(el) &&
          !el.closest('[data-testid="card-preview-canvas"]') &&
          !el.closest('[data-testid="card-preview-phone"]'));
      return {
        covered,
        tag: el?.tagName,
        testid: (el as HTMLElement | null)?.closest?.("[data-testid]")?.getAttribute(
          "data-testid"
        ),
      };
    });
    expect(overlay.covered, JSON.stringify(overlay)).toBe(false);

    await page.screenshot({
      path: path.join(shotDir, "02-desktop-clean-shell.png"),
      fullPage: false,
    });
    await page.screenshot({
      path: path.join(shotDir, "05-desktop-preview-first-fold.png"),
      fullPage: false,
    });

    // Open drawer
    await page.getByTestId("card-tool-colors").click();
    await expect(page.getByTestId("card-contextual-drawer")).toBeVisible();
    await expect(page.getByTestId("card-drawer-colors")).toBeVisible();
    // Desktop side drawer — not bottom sheet
    await expect(page.getByTestId("card-contextual-drawer")).not.toHaveAttribute(
      "data-drawer-placement",
      "bottom"
    );
    await page.screenshot({
      path: path.join(shotDir, "03-desktop-drawer-open.png"),
      fullPage: false,
    });

    // Switch tool
    await page.getByTestId("card-tool-typography").click();
    await expect(page.getByTestId("card-drawer-typography")).toBeVisible();
    await expect(page.getByTestId("text-panel-stack")).toBeVisible();
    await expect(page.getByTestId("card-drawer-colors")).toHaveCount(0);

    // Preview remains mounted
    await expect(page.getByTestId("card-preview-phone")).toBeVisible();

    // Close drawer — canvas expands
    const widthOpen = (await canvas.boundingBox())?.width ?? 0;
    await page.getByTestId("card-drawer-collapse").click();
    await expect(page.getByTestId("card-contextual-drawer")).toHaveCount(0);
    const widthClosed = (await canvas.boundingBox())?.width ?? 0;
    expect(widthClosed).toBeGreaterThanOrEqual(widthOpen - 2);
    await page.screenshot({
      path: path.join(shotDir, "04-desktop-drawer-closed.png"),
      fullPage: false,
    });

    // Focus
    await page.getByTestId("command-shade-focus").click();
    await expect(page.getByTestId("authoring-workspace-shell")).toHaveAttribute(
      "data-focus-mode",
      "true"
    );
    await page.screenshot({
      path: path.join(shotDir, "06-desktop-focus.png"),
      fullPage: false,
    });
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("authoring-workspace-shell")).toHaveAttribute(
      "data-focus-mode",
      "false"
    );

    // History + Advanced
    await page.getByTestId("card-tool-history").click();
    await expect(page.getByTestId("card-drawer-history")).toBeVisible();
    await page.screenshot({
      path: path.join(shotDir, "08-desktop-history.png"),
      fullPage: false,
    });
    await page.getByTestId("card-tool-advanced").click();
    await expect(page.getByTestId("card-drawer-advanced")).toBeVisible();
    await page.screenshot({
      path: path.join(shotDir, "09-desktop-advanced.png"),
      fullPage: false,
    });

    // Outline tool
    await page.getByTestId("card-tool-outline").click();
    await expect(page.getByTestId("card-drawer-outline")).toBeVisible();
    await page.screenshot({
      path: path.join(shotDir, "07-desktop-outline-hidden.png"),
      fullPage: false,
    });

    // Format alias → colors (pin shade open so Format control is reachable)
    await page.getByTestId("command-shade-pin-open").click();
    await expect(page.getByTestId("command-shade")).toHaveAttribute(
      "data-shade-display",
      "open"
    );
    await page.getByTestId("card-tool-format-trigger").click();
    await expect(page.getByTestId("card-drawer-colors")).toBeVisible();

    // Body overflow honest
    const overflow = await page.evaluate(() => ({
      html: getComputedStyle(document.documentElement).overflow,
      body: getComputedStyle(document.body).overflow,
      chrome: document
        .querySelector('[data-testid="dashboard-chrome"]')
        ?.getAttribute("data-escape-mode"),
    }));
    expect(overflow.chrome).toBe("true");

    void testInfo;
  });

  test("tablet: canvas useful, no overlay crush", async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
    await gotoCardEdit(page);
    await expect(page.getByTestId("card-preview-canvas")).toBeVisible();
    const box = await page.getByTestId("card-preview-canvas").boundingBox();
    expect(box?.height ?? 0).toBeGreaterThan(240);
    await expect(page.getByTestId("card-inspector-rail")).toBeHidden();
    await page.screenshot({
      path: path.join(shotDir, "10-tablet-card-editor.png"),
      fullPage: false,
    });
  });

  test("phone: bottom rail + bottom sheet drawer", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoCardEdit(page);
    await expect(page.getByTestId("card-mobile-tool-rail")).toBeVisible();
    await expect(page.getByTestId("card-save")).toBeVisible();
    await page.getByTestId("card-mobile-tool-content").click();
    await expect(page.getByTestId("card-mobile-sheet")).toBeVisible();
    await expect(page.getByTestId("card-mobile-sheet")).toHaveAttribute(
      "data-drawer-placement",
      "bottom"
    );
    await page.screenshot({
      path: path.join(shotDir, "11-phone-card-editor.png"),
      fullPage: false,
    });
    await page.screenshot({
      path: path.join(shotDir, "12-phone-drawer.png"),
      fullPage: false,
    });
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(scrollWidth).toBeLessThanOrEqual(1);
    await page.getByTestId("card-drawer-collapse").click();
    await expect(page.getByTestId("card-mobile-sheet")).toHaveCount(0);
  });

  test("public card + assembly regression shots", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/t/seeddemo01?public=1");
    await expect(page.getByTestId("card-utility-layer").or(page.locator(".tap-card")).first()).toBeVisible({
      timeout: 45_000,
    });
    await page.screenshot({
      path: path.join(shotDir, "13-public-card.png"),
      fullPage: false,
    });

    await page.goto("/dashboard/card");
    await expect(page.getByTestId("card-assembly-workspace")).toBeVisible({
      timeout: 60_000,
    });
    await page.screenshot({
      path: path.join(shotDir, "14-card-assembly-first-fold.png"),
      fullPage: false,
    });
  });

  test("button functions + honesty + axe matrix", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoCardEdit(page);

    await page.getByTestId("card-edit-open-preview").click();
    await expect(page.getByTestId("card-preview-host")).toBeVisible({
      timeout: 30_000,
    });
    await page.goto("/dashboard/card/edit");
    await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible({
      timeout: 60_000,
    });

    await page.getByTestId("card-tool-buttons").click();
    await expect(page.getByTestId("card-drawer-buttons")).toBeVisible();
    await page.getByTestId("card-tool-media").click();
    await expect(page.getByTestId("card-drawer-media")).toBeVisible();
    await expect(page.getByTestId("card-honest-note").first()).toBeVisible();
    await page.getByTestId("card-tool-layout").click();
    await expect(page.getByTestId("card-drawer-layout")).toBeVisible();
    await page.getByTestId("card-tool-lifecycle").click();
    await expect(page.getByTestId("card-drawer-lifecycle")).toBeVisible();
    await expect(page.getByTestId("card-retire-toggle")).toBeVisible();
    await page.getByTestId("card-tool-brand").click();
    await expect(page.getByTestId("card-drawer-brand")).toBeVisible();
    await expect(page.getByTestId("brand-use-toggle")).toBeVisible();

    if (await page.getByTestId("card-undo").isEnabled()) {
      await page.getByTestId("card-undo").click();
    }
    if (await page.getByTestId("card-redo").isEnabled()) {
      await page.getByTestId("card-redo").click();
    }
    await page.getByTestId("card-zoom-fit").click();
    await page.getByTestId("card-zoom-out").click();
    await page.getByTestId("card-zoom-in").click();

    for (const size of [
      { w: 1440, h: 900, label: "desktop" },
      { w: 820, h: 1180, label: "tablet" },
      { w: 390, h: 844, label: "phone" },
    ] as const) {
      await page.setViewportSize({ width: size.w, height: size.h });
      await page.goto("/dashboard/card/edit");
      await expect(page.getByTestId("command-shade")).toBeVisible({ timeout: 60_000 });
      const results = await new AxeBuilder({ page })
        .disableRules(["color-contrast"])
        .analyze();
      const serious = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical"
      );
      expect(serious, `${size.label}: ${JSON.stringify(serious, null, 2)}`).toEqual([]);
    }
  });
});
