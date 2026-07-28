/**
 * Card Fuse-Box — Support / Ask a Question headed proof (updated for assembly + edit).
 * Requires PROOF_HEADED=1 and local server + isolated DB.
 */
import { expect, test } from "@playwright/test";

const headed = process.env.PROOF_HEADED === "1";

test.describe("card fuse-box support slice", () => {
  test.skip(!headed, "Set PROOF_HEADED=1 for headed Card fuse-box proofs");

  test("Card assembly page shows fuse-box — Edit opens builder", async ({ page }) => {
    await page.goto("/dashboard/card");
    await expect(page.getByTestId("card-assembly-workspace")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("card-fuse-box")).toBeVisible();
    await expect(page.getByTestId("fuse-box-support")).toBeVisible();
    const status = await page.getByTestId("fuse-box-support").getAttribute("data-status");
    expect([
      "connected",
      "partially_connected",
      "available_to_configure",
      "not_yet_available",
    ]).toContain(status);
    await page.getByTestId("card-edit-open").click();
    // Redesign: the builder is shell-hosted in the adaptive edit workspace.
    await expect(page.getByTestId("tap-card-builder")).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId("card-save").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("card-canvas-viewport")).toBeVisible();
  });

  test("editor lists Ask a Question action and utility toggle", async ({ page }) => {
    await page.goto("/dashboard/card/edit");
    await expect(page.getByTestId("card-save").first()).toBeVisible({ timeout: 60_000 });
    // Redesign: adding actions lives in the Outline tool drawer.
    await page.getByTestId("card-tool-outline").click();
    const kindSelect = page.getByTestId("card-drawer-add-action-kind");
    await expect(kindSelect).toBeVisible({ timeout: 15_000 });
    await kindSelect.selectOption("support");
    await expect(kindSelect).toHaveValue("support");
  });
});
