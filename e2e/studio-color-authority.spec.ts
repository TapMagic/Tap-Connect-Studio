import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

const enabled = process.env.STUDIO_COLOR_AUTHORITY_ACCEPTANCE === "1";
const proofRoot = path.join("docs", "product-reconstitution", "creative-studio-platform", "proofs", "studio-layered-composition");

test("uses one shared editable color authority for Standard Button and Container", async ({ page }) => {
  test.skip(!enabled, "Set STUDIO_COLOR_AUTHORITY_ACCEPTANCE=1 for the deterministic local Studio runtime");
  test.setTimeout(120_000);
  page.setDefaultTimeout(18_000);
  mkdirSync(proofRoot, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/review/studio", { waitUntil: "networkidle" });
  await expect(page.getByTestId("studio-reconstitution-shell")).toBeVisible({ timeout: 60_000 });

  const openAdd = async () => {
    if (!(await page.getByTestId("studio-discovery-drawer").isVisible().catch(() => false))) await page.getByTestId("studio-rail-add").click();
  };

  await openAdd();
  await page.getByTestId("studio-add-buttons").click();
  await page.getByTestId("studio-button-family-standard").click();
  await page.getByTestId("standard-button-preset-black-chrome").click();
  await expect(page.getByTestId("studio-button-inspector")).toBeVisible();
  await page.getByTestId("studio-inspector-tab-appearance").click();
  const buttonBodyHex = page.getByRole("textbox", { name: "Button body", exact: true });
  await expect(buttonBodyHex).toBeVisible();
  await buttonBodyHex.fill("#2357a6");
  await buttonBodyHex.press("Enter");
  await expect(buttonBodyHex).toHaveValue("#2357A6");
  await expect(page.getByText("Source · custom", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Brand", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Document", { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: path.join(proofRoot, "23-shared-color-standard-button.png") });
  await page.getByRole("button", { name: "Reset body to Brand", exact: true }).click();
  await page.getByRole("button", { name: "Close Button Inspector" }).click();

  await openAdd();
  await page.getByTestId("studio-add-container").click();
  await page.getByTestId("studio-add-container-transparent").click();
  await expect(page.getByTestId("studio-composition-inspector")).toBeVisible();
  await page.getByRole("button", { name: /^Solid/ }).click();
  const containerFillHex = page.getByRole("textbox", { name: "Fill", exact: true });
  await expect(containerFillHex).toBeVisible();
  await containerFillHex.fill("#6a351f");
  await containerFillHex.press("Enter");
  await expect(containerFillHex).toHaveValue("#6A351F");
  await expect(page.getByText("Brand", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Document", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Reset to Brand", exact: true }).first()).toBeVisible();
  await page.screenshot({ path: path.join(proofRoot, "24-shared-color-container.png") });

  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
});
