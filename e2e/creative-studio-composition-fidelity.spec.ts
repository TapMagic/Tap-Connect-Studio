/**
 * Creative Composition — Studio canvas vs Live Device phone fidelity.
 */
import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const SHOT_DIR = path.join(
  process.cwd(),
  "tmp/creative-studio-rescue/evidence/walkthrough/composition-fidelity"
);

test.setTimeout(90_000);

test.beforeAll(() => {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
});

async function ensureComposition(page: import("@playwright/test").Page) {
  await page.getByTestId("card-tool-composition").click();
  await expect(page.getByTestId("card-drawer-composition")).toBeVisible({
    timeout: 15_000,
  });
  const add = page.getByTestId("composition-drawer-add");
  if (await add.isVisible()) await add.click();
  await expect(page.getByTestId("creative-composition-canvas").first()).toBeVisible({
    timeout: 15_000,
  });
  await page.getByTestId("composition-open-fallback").click();
  await page.getByTestId("composition-fallback-scale").click();
  await page.getByTestId("panel-stack-back").click();
}

test("studio composition canvas stays freeform on edit", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dashboard/card/edit", { waitUntil: "networkidle" });
  await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible({
    timeout: 60_000,
  });
  await ensureComposition(page);
  const canvas = page.getByTestId("creative-composition-canvas").first();
  await expect(canvas).toHaveAttribute("data-mobile-fallback", "freeform");
  await page.screenshot({
    path: path.join(SHOT_DIR, "01-studio-edit-canvas.png"),
  });
});

test("live device phone viewport keeps freeform composition", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dashboard/card/edit", { waitUntil: "networkidle" });
  await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible({
    timeout: 60_000,
  });
  await ensureComposition(page);
  // Leave composition tools without discarding in-memory card state
  await page.keyboard.press("Escape").catch(() => {});
  await page.getByTestId("chrome-state-expanded").click();
  await page.waitForTimeout(400);
  const previewCta = page.getByTestId("card-preview-as-customer");
  await previewCta.scrollIntoViewIfNeeded().catch(() => {});
  // If CTA still hidden, use view-only preview entry
  if (!(await previewCta.isVisible().catch(() => false))) {
    const alt = page.getByTestId("card-edit-open-preview");
    if (await alt.isVisible().catch(() => false)) await alt.click();
  } else {
    await previewCta.click({ timeout: 20_000 });
  }
  await expect(page.getByTestId("preview-toolbar")).toBeVisible({ timeout: 20_000 });
  await page.getByTestId("preview-viewport-phone").click();
  await page.waitForTimeout(500);
  const phoneCanvas = page.getByTestId("creative-composition-canvas").first();
  await expect(phoneCanvas).toBeVisible({ timeout: 15_000 });
  await expect(phoneCanvas).toHaveAttribute("data-mobile-fallback", "freeform");
  await page.screenshot({
    path: path.join(SHOT_DIR, "02-studio-phone-preview.png"),
  });

  await page.getByTestId("preview-live-device").click();
  await expect(page.getByTestId("live-device-qr-panel")).toBeVisible({
    timeout: 20_000,
  });
  const update = page.getByRole("button", { name: /Update phone preview/i });
  if (await update.count()) {
    await update.first().click();
    await page.waitForTimeout(3000);
  }
  await page.waitForTimeout(3500);
  const previewUrl = (
    (await page.getByTestId("preview-url-text").textContent()) || ""
  ).trim();
  expect(previewUrl.length).toBeGreaterThan(10);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(previewUrl, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("preview-draft-banner")).toBeVisible({
    timeout: 20_000,
  });
  const liveCanvas = page.getByTestId("creative-composition-canvas").first();
  await expect(liveCanvas).toBeVisible({ timeout: 15_000 });
  await expect(liveCanvas).toHaveAttribute("data-mobile-fallback", "freeform");
  await expect(
    page.locator("[data-composition-node][data-primitive]").first()
  ).toBeVisible();
  await page.screenshot({
    path: path.join(SHOT_DIR, "03-live-device-phone-viewport.png"),
  });

  const http = await request.get(previewUrl);
  expect(http.status()).toBe(200);
});
