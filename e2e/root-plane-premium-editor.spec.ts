import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const enabled = process.env.ROOT_PLANE_PREMIUM_EDITOR_ACCEPTANCE === "1";

test.describe("root plane and premium editor controls", () => {
  test.skip(!enabled, "Set ROOT_PLANE_PREMIUM_EDITOR_ACCEPTANCE=1 for the isolated development fixture");
  test.setTimeout(90_000);

  test("drags page height, inserts a root Container, and routes exact left editors", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto("/dashboard/card/edit", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("card-edit-workspace-host")).toHaveAttribute("data-builder-ready", "true", { timeout: 60_000 });
    await page.getByTestId("card-creative-tool-templates").click();
    await page.getByTestId("card-template-library").getByRole("button", { name: "Blank Card" }).click();

    const handle = page.getByTestId("card-page-extension-handle");
    const initial = Number((await page.getByTestId("card-page-height").textContent())?.replace(/\D/g, ""));
    const box = await handle.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2 + 83, { steps: 8 });
    await expect.poll(async () => Number((await page.getByTestId("card-page-height").textContent())?.replace(/\D/g, ""))).toBeGreaterThan(initial + 64);
    await page.mouse.up();
    await page.getByTestId("card-undo").click();
    await expect.poll(async () => Number((await page.getByTestId("card-page-height").textContent())?.replace(/\D/g, ""))).toBe(initial);

    await page.getByTestId("card-creative-tool-templates").click();
    await page.getByRole("button", { name: /Premium Offer/ }).click();
    const root = page.getByTestId("card-root-canvas");
    const container = root.locator('[data-composition-node][data-selected="true"]').filter({ has: page.locator('[data-component-kind="container"]') });
    await expect(container).toHaveCount(1);
    await expect(page.locator("[data-section-id]")).toHaveCount(0);
    await expect(root.locator('[data-element-kind="heading"]')).toHaveCount(1);
    await expect(root.locator('[data-element-kind="button"]')).toHaveCount(1);
    await page.getByRole("button", { name: "Appearance", exact: true }).last().click();
    await expect(page.getByTestId("contextual-surface-drawer")).toHaveAttribute("data-editor-placement", "left");

    await page.getByRole("button", { name: "Close surface" }).click();
    const rootPlane = root.locator('[data-testid="creative-composition-canvas"]');
    const rootBox = await rootPlane.boundingBox();
    expect(rootBox).not.toBeNull();
    await rootPlane.click({ position: { x: rootBox!.width - 4, y: 4 } });
    await expect(page.locator('[data-contextual-object="card-root"]')).toBeVisible();
    await page.locator('[data-contextual-object="card-root"]').getByRole("button", { name: "Background" }).click();
    await expect(page.getByTestId("root-background-editor")).toBeVisible();
    await page.getByTestId("root-background-editor").getByRole("button", { name: "gradient", exact: true }).click();
    await page.getByRole("button", { name: "Add stop" }).click();
    await expect(page.getByTestId("root-background-editor").locator('input[type="color"]')).toHaveCount(4);
    await page.getByTestId("root-background-opacity").fill("72");
    await expect(page.getByTestId("contextual-root-background-drawer")).toHaveAttribute("data-editor-placement", "left");
  });

  test("is keyboard reachable and serious-Axe-clean at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard/card/edit", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible({ timeout: 60_000 });
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe("BODY");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical")).toEqual([]);
  });
});
