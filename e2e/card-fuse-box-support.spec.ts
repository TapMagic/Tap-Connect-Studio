/**
 * Card Fuse-Box first slice — Support / Ask a Question headed proof.
 * Requires PROOF_HEADED=1 and local server + isolated DB.
 */
import { expect, test } from "@playwright/test";

const headed = process.env.PROOF_HEADED === "1";

test.describe("card fuse-box support slice", () => {
  test.skip(!headed, "Set PROOF_HEADED=1 for headed Card fuse-box proofs");

  test("Card page opens visual builder first — not fuse-box diagnostics", async ({ page }) => {
    await page.goto("/dashboard/card");
    const host = page.getByTestId("card-builder-host");
    await expect(host).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("card-save")).toBeVisible({ timeout: 30_000 });
    const box = await host.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThan(400);
    await expect(page.getByRole("heading", { name: /Tap Connect Card builder/i })).toBeVisible();
    // Fuse-box must not be the primary surface
    await expect(page.getByTestId("card-fuse-box")).toBeHidden();
    await expect(page.locator(".builder-studio")).toBeVisible();
  });

  test("Advanced connections reveals honest fuse-box panel", async ({ page }) => {
    await page.goto("/dashboard/card");
    await expect(page.getByTestId("card-builder-host")).toBeVisible({ timeout: 60_000 });
    await page.getByTestId("card-connections-advanced").locator("summary").click();
    await expect(page.getByTestId("card-fuse-box")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("fuse-box-support")).toBeVisible();
    const status = await page.getByTestId("fuse-box-support").getAttribute("data-status");
    expect([
      "connected",
      "partially_connected",
      "available_to_configure",
      "not_yet_available",
    ]).toContain(status);
    await expect(page.getByTestId("fuse-box-journey")).toHaveAttribute(
      "data-status",
      "not_yet_available"
    );
  });

  test("builder lists Ask a Question action", async ({ page }) => {
    await page.goto("/dashboard/card");
    await expect(page.getByTestId("card-save")).toBeVisible({ timeout: 60_000 });
    const kindSelect = page
      .locator("select")
      .filter({ has: page.locator("option[value='support']") })
      .first();
    await expect(kindSelect).toBeVisible({ timeout: 15_000 });
    await kindSelect.selectOption("support");
    await expect(kindSelect).toHaveValue("support");
  });
});
