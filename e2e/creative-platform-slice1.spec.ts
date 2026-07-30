import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

test("shared media browser is responsive and restores keyboard focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard/brand/edit", { waitUntil: "networkidle" });
  await expect(page.getByTestId("brand-kit-workspace")).toBeVisible({
    timeout: 60_000,
  });
  await page.getByTestId("brand-mobile-topic-logos").click();
  await expect(page.getByTestId("brand-logo-media-picker")).toBeVisible();

  const picker = page.getByTestId("brand-logo-media-picker");
  const browse = picker.getByTestId("open-shared-media-browser");
  const opener =
    (await browse.count()) > 0
      ? browse
      : picker.getByRole("button", { name: "Replace" }).last();
  await opener.focus();
  await opener.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Media & Asset Browser" });
  await expect(dialog).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Close Media and Asset Browser" })
  ).toBeFocused();
  const sourceSelect = page.getByTestId("media-source-select");
  await expect(sourceSelect).toBeVisible();
  await expect(sourceSelect.locator("option")).toHaveCount(8);
  await expect(sourceSelect).toHaveValue("studio");

  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.width).toBeLessThanOrEqual(390);
  expect(bounds!.height).toBeLessThanOrEqual(844);
  const proofDir = path.join(process.cwd(), "tmp", "creative-platform-slice1");
  fs.mkdirSync(proofDir, { recursive: true });
  await page.screenshot({
    path: path.join(proofDir, "shared-media-browser-mobile.png"),
    fullPage: true,
  });

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test("fixture provider results remain visible until explicit dismissal", async ({
  page,
}) => {
  const statusResponse = await page.request.get("/api/media/providers/status");
  const providerStatus = await statusResponse.json();
  test.skip(
    providerStatus.providers?.pexels?.state !== "fixture",
    "Provider fixture mode is required for this deterministic proof"
  );

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dashboard/brand/edit", { waitUntil: "networkidle" });
  await page.getByTestId("brand-topic-logos").click();
  const picker = page.getByTestId("brand-logo-media-picker");
  const browse = picker.getByTestId("open-shared-media-browser");
  if (await browse.isVisible().catch(() => false)) await browse.click();
  else await picker.getByRole("button", { name: "Replace" }).last().click();

  const dialog = page.getByRole("dialog", { name: "Media & Asset Browser" });
  await expect(dialog).toBeVisible();
  await page.getByRole("tab", { name: /Pexels/ }).click();
  await expect(page.getByTestId("provider-readiness-pexels")).toContainText(
    "Fixture mode"
  );
  await page.getByTestId("media-browser-search").fill("coffee");
  await page.getByTestId("media-browser-search-submit").click();
  await expect(page.getByTestId("media-browser-result").first()).toBeVisible();
  await page.waitForTimeout(750);
  await expect(dialog).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

