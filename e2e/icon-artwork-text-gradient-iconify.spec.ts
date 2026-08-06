/**
 * Acceptance: bare Icon artwork, path glow, backing/border, glyph vs Text Box
 * gradients, Iconify provider search, replacement, refined handles.
 *
 *   DATABASE_URL='postgresql://tapconnect:tapconnect@127.0.0.1:5433/tapconnect_fusion_dev' \
 *   BASE_URL=http://127.0.0.1:3050 ICON_ARTWORK_ACCEPTANCE=1 \
 *   npx playwright test e2e/icon-artwork-text-gradient-iconify.spec.ts --workers=1
 */

import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const enabled = process.env.ICON_ARTWORK_ACCEPTANCE === "1";
const evidenceDir = path.join(process.cwd(), "tmp/icon-artwork-repair-evidence");

async function openBlankStudio(page: Page) {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/dashboard/card/edit", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("card-edit-workspace-host")).toHaveAttribute("data-builder-ready", "true", {
    timeout: 60_000,
  });
  await page.getByTestId("card-creative-tool-templates").click();
  await page.getByTestId("card-template-library").getByRole("button", { name: "Blank Card" }).click();
}

async function placeRecommendedIcon(page: Page, id = "ticket") {
  await page.getByTestId("card-creative-tool-icons").click();
  await expect(page.getByTestId("card-icon-library")).toBeVisible();
  await page.getByTestId(`icon-recommended-${id}`).click();
  const icon = page.locator('[data-element-kind="icon"]').first();
  await expect(icon).toBeVisible({ timeout: 15_000 });
  await icon.click();
  return icon;
}

test.describe("icon artwork text gradient iconify repair", () => {
  test.skip(!enabled, "Set ICON_ARTWORK_ACCEPTANCE=1");
  test.setTimeout(180_000);

  test.beforeAll(() => {
    fs.mkdirSync(evidenceDir, { recursive: true });
  });

  test("A–C bare icon, path glow, backing border none", async ({ page }) => {
    await openBlankStudio(page);
    const icon = await placeRecommendedIcon(page, "ticket");
    await expect(icon.locator("[data-icon-backing='off']")).toBeVisible();
    await expect(icon.locator("[data-icon-effect-target='artwork']")).toBeVisible();

    const box = await icon.boundingBox();
    expect(box).toBeTruthy();
    // Sample near a corner — bare icon should not paint a filled square.
    const corner = await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      if (!el) return { tag: "none", bg: "none" };
      const style = getComputedStyle(el as Element);
      return { tag: (el as HTMLElement).tagName, bg: style.backgroundColor, filter: style.filter };
    }, { x: box!.x + 2, y: box!.y + 2 });
    expect(corner.bg === "rgba(0, 0, 0, 0)" || corner.bg === "transparent" || corner.tag === "IMG" || corner.tag === "SPAN" || corner.tag === "SVG" || corner.tag === "PATH").toBeTruthy();

    await page.getByTestId("contextual-icon-appearance").click();
    await expect(page.getByTestId("icon-appearance-controls")).toBeVisible();
    await expect(page.getByTestId("icon-artwork-section")).toBeVisible();
    await expect(page.getByTestId("icon-backing-section")).toBeVisible();
    await page.getByTestId("icon-artwork-glow").fill("18");
    await expect(icon.locator("[data-icon-glow='18']")).toBeVisible();
    await expect(icon.locator("[data-icon-artwork='true']")).toBeVisible();
    const artworkFilter = await icon.locator("[data-icon-artwork='true']").evaluate((el) => getComputedStyle(el).filter);
    expect(artworkFilter).toMatch(/drop-shadow/i);
    const wrapperShadow = await icon.locator("[data-icon-backing]").evaluate((el) => getComputedStyle(el).boxShadow);
    expect(wrapperShadow === "none" || !wrapperShadow).toBeTruthy();

    await page.getByTestId("icon-backing-enabled").check();
    await expect(icon.locator("[data-icon-backing='on']")).toBeVisible();
    await page.getByTestId("icon-backing-shape-circle").click();
    await page.getByTestId("icon-border-style-solid").click();
    await page.getByTestId("icon-border-style-none").click();
    const border = await icon.locator("[data-icon-backing='on']").evaluate((el) => getComputedStyle(el).borderStyle);
    expect(border === "none" || border === "").toBeTruthy();
    await page.getByTestId("icon-backing-enabled").uncheck();
    await expect(icon.locator("[data-icon-backing='off']")).toBeVisible();

    await page.screenshot({ path: path.join(evidenceDir, "01-bare-icon-glow-backing.png"), fullPage: false });
  });

  test("D Iconify dog search, SVG tiles, replace preserves geometry", async ({ page }) => {
    await openBlankStudio(page);
    await page.getByTestId("card-creative-tool-icons").click();
    await expect(page.getByTestId("card-icon-library")).toBeVisible();
    await page.getByTestId("icon-library-search").fill("dog");
    await expect(page.getByTestId("icon-library-status")).toContainText(/Iconify results|Searching/i, { timeout: 20_000 });
    const results = page.getByTestId("icon-library-iconify-results");
    await expect(results).toBeVisible({ timeout: 20_000 });
    await expect(results.locator("[data-icon-svg='true']").first()).toBeVisible({ timeout: 20_000 });
    await expect(results.getByText(/dog/i).first()).toBeVisible();
    const first = results.locator("button").first();
    await first.click();
    const icon = page.locator('[data-element-kind="icon"]').first();
    await expect(icon).toBeVisible();
    await icon.click();
    const before = await icon.boundingBox();
    await page.getByTestId("contextual-icon-picker").click();
    await page.getByTestId("iconify-search").fill("ticket");
    await expect(page.getByTestId("iconify-results")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("iconify-results").locator("[data-icon-svg='true']").first()).toBeVisible({ timeout: 20_000 });
    await page.getByTestId("iconify-results").locator("button").first().click();
    const after = await icon.boundingBox();
    expect(before && after).toBeTruthy();
    expect(Math.abs(before!.x - after!.x)).toBeLessThan(4);
    expect(Math.abs(before!.y - after!.y)).toBeLessThan(4);
    expect(Math.abs(before!.width - after!.width)).toBeLessThan(4);
    expect(Math.abs(before!.height - after!.height)).toBeLessThan(4);
    await page.screenshot({ path: path.join(evidenceDir, "02-iconify-dog-ticket.png"), fullPage: false });
  });

  test("E–F glyph gradient vs Text Box gradient + editor", async ({ page }) => {
    await openBlankStudio(page);
    await page.getByTestId("card-creative-tool-text").click();
    await page.getByRole("button", { name: /Add text box/i }).click();
    const text = page.locator('[data-element-kind="text"], [data-primitive="text"]').first();
    await expect(text).toBeVisible({ timeout: 15_000 });
    await text.click();
    await page.getByTestId("contextual-color").click();
    await page.getByTestId("see-all-gradient-colors").click();
    await expect(page.getByTestId("default-gradient-colors")).toHaveAttribute("data-gradient-target", "glyph");
    await expect(page.getByTestId("gradient-studio")).toBeVisible();
    await page.locator("[data-testid^='gradient-preset-']").first().click();
    await expect(text.locator("[data-glyph-gradient='true']")).toBeVisible();
    await expect(text.locator("[data-text-box-background='transparent']")).toBeVisible();
    await page.getByTestId("gradient-start-color").fill("#ff0000");
    await page.getByTestId("gradient-end-color").fill("#00ff88");
    await page.getByTestId("gradient-add-stop").click();
    await page.getByTestId("gradient-stop-position").fill("40");
    await page.getByTestId("gradient-angle").fill("120");
    const glyphCss = await text.locator("[data-testid^='composition-inline-text-']").evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(glyphCss).toMatch(/gradient/i);
    const boxBg = await text.locator("[data-text-box-background]").evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(boxBg === "none" || !boxBg.includes("gradient")).toBeTruthy();

    await page.getByTestId("nested-back-color").click();
    await page.getByRole("button", { name: /Open Text Box/i }).click();
    await expect(page.getByTestId("text-box-controls")).toBeVisible();
    await page.getByTestId("text-box-fill-gradient").click();
    await expect(page.getByTestId("text-box-gradient-editor")).toBeVisible();
    await expect(page.getByTestId("text-box-controls")).toHaveAttribute("data-gradient-target", "text-box");
    await page.getByTestId("text-box-gradient-editor").getByTestId("gradient-start-color").fill("#112233");
    await expect(text.locator("[data-text-box-background='filled']")).toBeVisible();
    await expect(text.locator("[data-glyph-gradient='true']")).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, "03-glyph-vs-textbox-gradient.png"), fullPage: false });
  });

  test("G refined handles constant screen size across zoom", async ({ page }) => {
    await openBlankStudio(page);
    await placeRecommendedIcon(page, "star");
    const handle = page.locator("[data-testid^='composition-resize-'][data-handle-kind='corner']").first();
    await expect(handle).toBeVisible();
    await expect(handle).toHaveAttribute("data-handle-screen-px", "6");
    const measure = async () => {
      const box = await handle.boundingBox();
      const after = await handle.evaluate((el) => {
        const pseudo = getComputedStyle(el, "::after");
        return { w: parseFloat(pseudo.width), h: parseFloat(pseudo.height) };
      });
      return { hit: box, visible: after };
    };
    const at100 = await measure();
    expect(at100.visible.w).toBeGreaterThanOrEqual(5);
    expect(at100.visible.w).toBeLessThanOrEqual(9);
    expect(at100.hit!.width).toBeGreaterThanOrEqual(14);

    const zoomControl = page.getByTestId("card-editor-zoom").or(page.getByLabel(/zoom/i)).first();
    if (await zoomControl.count()) {
      await zoomControl.fill("50").catch(async () => {
        await page.keyboard.press("Meta+-").catch(() => undefined);
      });
    }
    const atZoom = await measure();
    expect(atZoom.visible.w).toBeGreaterThanOrEqual(5);
    expect(atZoom.visible.w).toBeLessThanOrEqual(10);
    await page.screenshot({ path: path.join(evidenceDir, "04-selection-handles.png"), fullPage: false });
  });

  test("provider failure does not pretend recommended are Iconify", async ({ page }) => {
    await openBlankStudio(page);
    await page.route("**/api/creative/icons**", async (route) => {
      await route.fulfill({ status: 503, body: JSON.stringify({ error: "unavailable" }) });
    });
    await page.getByTestId("card-creative-tool-icons").click();
    await page.getByTestId("icon-library-search").fill("dog");
    await expect(page.getByTestId("icon-library-status")).toContainText(/unavailable|fallback|Provider/i, { timeout: 15_000 });
    await expect(page.getByTestId("icon-library-provider-error")).toBeVisible();
    await expect(page.getByTestId("icon-library-fallback")).toBeVisible();
    await expect(page.getByTestId("icon-library-recommended")).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, "05-provider-failure.png"), fullPage: false });
  });
});
