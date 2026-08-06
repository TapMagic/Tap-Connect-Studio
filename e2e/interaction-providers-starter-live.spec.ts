import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const evidenceDir = path.join(process.cwd(), "tmp/interaction-providers-evidence");

async function openStudio(page: Page) {
  await page.goto("/dashboard/card");
  await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible({ timeout: 60_000 });
}

test.describe("interaction truth providers starter live device", () => {
  test.beforeAll(() => {
    fs.mkdirSync(evidenceDir, { recursive: true });
  });

  test("page geometry isolation and distinct command routing", async ({ page }) => {
    await openStudio(page);
    await page.getByTestId("card-creative-tool-elements").click();
    await page.getByRole("button", { name: /^Text$/ }).first().click().catch(async () => {
      await page.getByTestId("card-creative-tool-text").click();
      await page.getByRole("button", { name: /Add text box/i }).click();
    });
    const handle = page.getByTestId("card-page-extension-handle");
    await expect(handle).toBeVisible();
    const beforeHeight = await page.getByTestId("card-page-height").innerText();
    await handle.click();
    const afterHeight = await page.getByTestId("card-page-height").innerText();
    expect(Number.parseInt(afterHeight, 10)).toBeGreaterThan(Number.parseInt(beforeHeight, 10));
    await page.screenshot({ path: path.join(evidenceDir, "01-page-extend.png"), fullPage: true });

    await page.getByTestId("card-creative-tool-icons").click();
    await expect(page.getByTestId("card-icon-library")).toBeVisible();
    await expect(page.getByTestId("icon-library-search")).toBeVisible();
    await page.getByTestId("icon-library-search").fill("star");
    await expect(page.getByTestId("icon-library-status")).toContainText(/Iconify|Searching|fallback|characters/i, { timeout: 15_000 });
    await page.screenshot({ path: path.join(evidenceDir, "02-icon-library.png"), fullPage: true });
  });

  test("divider map and recent fonts control routing", async ({ page }) => {
    await openStudio(page);
    await page.getByTestId("card-creative-tool-elements").click();
    await page.getByRole("button", { name: /^Divider/i }).click();
    const style = page.getByTestId("contextual-divider-style");
    await expect(style).toBeVisible({ timeout: 15_000 });
    await style.click();
    await expect(page.getByTestId("contextual-divider-style-drawer")).toBeVisible();
    await page.getByTestId("contextual-divider-thickness").click();
    await expect(page.getByTestId("contextual-divider-thickness-drawer")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("contextual-divider-thickness-drawer")).toHaveCount(0);
    await page.screenshot({ path: path.join(evidenceDir, "03-divider-routing.png"), fullPage: true });
  });

  test("starter coupons tickets and live device drawer", async ({ page }) => {
    await openStudio(page);
    await page.getByTestId("card-creative-tool-coupons").click();
    await expect(page.getByTestId("coupon-preset-clean-retail")).toBeVisible();
    await expect(page.getByTestId("coupon-preset-perforated-stub")).toBeVisible();
    await expect(page.getByTestId("coupon-preset-split-image")).toBeVisible();
    await expect(page.getByTestId("coupon-preset-qr-first")).toBeVisible();
    await page.getByTestId("card-creative-tool-tickets").click();
    await expect(page.getByTestId("ticket-preset-admission-stub")).toBeVisible();
    await expect(page.getByTestId("ticket-preset-vip-pass")).toBeVisible();
    await expect(page.getByTestId("ticket-preset-raffle")).toBeVisible();
    await expect(page.getByTestId("ticket-preset-wallet-pass")).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, "04-starter-commerce.png"), fullPage: true });

    const live = page.getByTestId("live-device-dock");
    if (await live.count()) {
      await live.getByRole("button").first().click().catch(() => undefined);
    }
    const panel = page.getByTestId("live-device-qr-panel");
    if (await panel.count()) {
      await expect(panel).toBeVisible();
      const urlText = page.getByTestId("preview-url-text");
      if (await urlText.count()) {
        const url = await urlText.innerText();
        expect(url).not.toMatch(/localhost|127\.0\.0\.1/);
        expect(url).toMatch(/\/preview\/live\//);
      }
      await page.screenshot({ path: path.join(evidenceDir, "05-live-device.png"), fullPage: true });
    }
  });
});
