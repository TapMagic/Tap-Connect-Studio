import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const enabled = process.env.INTERACTION_PROVIDERS_ACCEPTANCE === "1";
const evidenceDir = path.join(process.cwd(), "tmp/interaction-providers-evidence");

async function openStudio(page: Page) {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/dashboard/card/edit", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("card-edit-workspace-host")).toHaveAttribute("data-builder-ready", "true", { timeout: 60_000 });
  await page.getByTestId("card-creative-tool-templates").click();
  await page.getByTestId("card-template-library").getByRole("button", { name: "Blank Card" }).click();
}

test.describe("interaction truth providers starter live device", () => {
  test.skip(!enabled, "Set INTERACTION_PROVIDERS_ACCEPTANCE=1 for the isolated development fixture");
  test.setTimeout(120_000);

  test.beforeAll(() => {
    fs.mkdirSync(evidenceDir, { recursive: true });
  });

  test("page geometry isolation and Icon library open", async ({ page }) => {
    await openStudio(page);
    await page.getByTestId("card-creative-tool-text").click();
    await page.getByRole("button", { name: /Add text box/i }).click();
    const handle = page.getByTestId("card-page-extension-handle");
    await expect(handle).toBeVisible();
    const beforeHeight = Number.parseInt(await page.getByTestId("card-page-height").innerText(), 10);
    await handle.click();
    const afterHeight = Number.parseInt(await page.getByTestId("card-page-height").innerText(), 10);
    expect(afterHeight).toBeGreaterThan(beforeHeight);
    await page.screenshot({ path: path.join(evidenceDir, "01-page-extend.png"), fullPage: false });

    await page.getByTestId("card-creative-tool-icons").click();
    await expect(page.getByTestId("card-icon-library")).toBeVisible();
    await expect(page.getByTestId("icon-library-search")).toBeVisible();
    await page.getByTestId("icon-library-search").fill("star");
    await expect(page.getByTestId("icon-library-status")).toContainText(/Iconify|Searching|fallback|characters/i, { timeout: 15_000 });
    await page.screenshot({ path: path.join(evidenceDir, "02-icon-library.png"), fullPage: false });
  });

  test("divider distinct routing and Escape dismissal", async ({ page }) => {
    await openStudio(page);
    await page.getByTestId("card-creative-tool-elements").click();
    await page.getByRole("button", { name: /^Divider/i }).click();
    await expect(page.getByTestId("contextual-divider-style")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("contextual-divider-style").click();
    await expect(page.getByTestId("contextual-divider-style-drawer")).toBeVisible();
    await page.getByTestId("contextual-divider-thickness").click();
    await expect(page.getByTestId("contextual-divider-thickness-drawer")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("contextual-divider-thickness-drawer")).toHaveCount(0);
    await page.screenshot({ path: path.join(evidenceDir, "03-divider-routing.png"), fullPage: false });
  });

  test("starter coupons tickets live device and axe", async ({ page }) => {
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
    await page.screenshot({ path: path.join(evidenceDir, "04-starter-commerce.png"), fullPage: false });

    // Live Device is a required Preview product surface — never optional.
    await page.getByTestId("card-preview-as-customer").click();
    await page.getByTestId("preview-live-device").click();
    const panel = page.getByTestId("live-device-qr-panel");
    await expect(panel).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("preview-url-text")).toBeVisible({ timeout: 30_000 });
    const url = await page.getByTestId("preview-url-text").innerText();
    expect(url).not.toMatch(/localhost|127\.0\.0\.1/);
    expect(url).toMatch(/\/preview\/live\//);
    await page.screenshot({ path: path.join(evidenceDir, "05-live-device.png"), fullPage: false });

    await page.setViewportSize({ width: 390, height: 844 });
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = axe.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
});
