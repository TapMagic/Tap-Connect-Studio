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

  const opener = page.getByTestId("open-shared-media-browser");
  await opener.focus();
  await opener.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Media & Asset Browser" });
  await expect(dialog).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Close Media and Asset Browser" })
  ).toBeFocused();
  await expect(page.getByRole("tablist", { name: "Media sources" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Studio" })).toHaveAttribute(
    "aria-selected",
    "true"
  );

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

