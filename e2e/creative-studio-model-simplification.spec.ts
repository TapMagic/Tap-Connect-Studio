import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const enabled = process.env.CREATIVE_STUDIO_SIMPLIFICATION_ACCEPTANCE === "1";

test.describe("Creative Studio simplified platform", () => {
  test.skip(!enabled, "Set CREATIVE_STUDIO_SIMPLIFICATION_ACCEPTANCE=1 with the authenticated isolated-development fixture");
  test.describe.configure({ timeout: 240_000 });

  test("constructs root objects and populated generic Section presets through visible UI", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dashboard/card/edit", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible({ timeout: 60_000 });

    await page.getByTestId("card-creative-tool-templates").click();
    await page.getByRole("button", { name: /Blank Card/ }).click();
    const root = page.getByTestId("card-root-canvas");
    await expect(root.locator("[data-composition-node]")).toHaveCount(0);

    await page.getByTestId("card-creative-tool-text").click();
    await page.getByRole("button", { name: "Add text box", exact: true }).click();
    await page.getByTestId("card-creative-tool-buttons").click();
    await page.getByTestId("button-preset-website-outline").click();
    await page.getByTestId("card-creative-tool-badges").click();
    await page.getByTestId("polished-badge-library").getByRole("button", { name: "SALE" }).click();
    await expect(root.locator('[data-element-kind="text"]')).toHaveCount(1);
    await expect(root.locator('[data-element-kind="button"]')).toHaveCount(1);
    await expect(root.locator('[data-element-kind="badge"]')).toHaveCount(1);
    await expect(page.locator("[data-section-id]")).toHaveCount(0);

    await page.getByTestId("card-creative-tool-templates").click();
    await page.getByRole("button", { name: /Premium Offer/ }).click();
    const offer = root.locator('[data-composition-node]').filter({ has: page.locator('[data-component-kind="container"]') });
    await expect(offer).toHaveCount(1);
    await expect(root.locator('[data-element-kind="badge"]')).toHaveCount(2);
    await expect(root.locator('[data-element-kind="heading"]')).toHaveCount(1);
    await expect(root.locator('[data-element-kind="image"]')).toHaveCount(1);
    await expect(root.locator('[data-element-kind="button"]')).toHaveCount(2);
    await expect(page.locator("[data-section-id]")).toHaveCount(0);

    await page.getByTestId("card-creative-tool-build").click();
    await page.getByTestId("composer-outline-toggle").click();
    await expect(page.getByTestId("outline-utility-layer")).toContainText("Governed");
    await expect(page.getByText("Available capabilities")).toHaveCount(0);

    await page.getByTestId("card-preview-as-customer").click();
    await expect(page.getByText("Choose media from Assets")).toHaveCount(0);
    await expect(page.getByText("Add media", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Complete setup", { exact: false })).toHaveCount(0);
    await page.getByTestId("preview-exit").click();
  });

  test("keeps explicit Section targeting, editable text combinations, Magic Write, and commerce Components reversible", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dashboard/card/edit", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible({ timeout: 60_000 });
    await page.getByTestId("card-creative-tool-templates").click();
    await page.getByRole("button", { name: /Blank Card/ }).click();
    await page.getByRole("button", { name: /Blank Section/ }).last().click();
    const section = page.getByTestId("card-root-canvas").locator('[data-composition-node]').filter({ has: page.locator('[data-component-kind="container"]') }).last();

    await page.getByTestId("card-creative-tool-text").click();
    await expect(page.getByTestId("insertion-target-choice")).toHaveCount(0);
    await page.getByTestId("text-combination-neon").click();
    await expect(page.getByTestId("card-root-canvas").locator('[data-element-kind="text"]')).toHaveCount(2);
    await expect(section).toBeVisible();
    await page.getByRole("button", { name: "Add text box", exact: true }).click();
    await expect(page.getByTestId("card-root-canvas").locator('[data-element-kind="text"]')).toHaveCount(3);

    await page.getByRole("button", { name: /Magic Write/ }).click();
    await page.getByPlaceholder(/free fries/).fill("Present an offer for free fries with a $20 purchase.");
    await page.getByRole("button", { name: "Review result" }).click();
    await expect(page.getByTestId("magic-write-result")).toContainText("FREE FRIES");
    await page.getByRole("button", { name: "Insert", exact: true }).click();
    await expect(page.getByTestId("card-root-canvas").locator('[data-element-kind="text"]')).toHaveCount(4);

    await page.getByTestId("card-creative-tool-coupons").click();
    await page.getByTestId("coupon-preset-percentage").click();
    await page.getByTestId("card-creative-tool-tickets").click();
    await page.getByTestId("ticket-preset-event").click();
    await expect(page.locator('[data-component-kind="coupon"]')).toHaveCount(1);
    await expect(page.locator('[data-component-kind="ticket"]')).toHaveCount(1);
    await expect(page.getByTestId("common-more-menu")).toHaveCount(0);
  });

  test("is keyboard reachable and serious-Axe-clean at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard/card/edit", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("card-mobile-tool-rail")).toBeVisible({ timeout: 60_000 });
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe("BODY");
    expect(await page.getByTestId("card-edit-workspace-host").evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical")).toEqual([]);
  });
});
