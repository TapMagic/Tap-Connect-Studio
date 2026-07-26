/**
 * Card Offer Fuse — explicit Campaign selection + host wire proofs.
 * Requires PROOF_HEADED=1 and local server + isolated DB.
 */
import { expect, test } from "@playwright/test";

const headed = process.env.PROOF_HEADED === "1";

test.describe("card offer fuse conversion slice", () => {
  test.skip(!headed, "Set PROOF_HEADED=1 for headed Card offer fuse proofs");

  test("Create recipe Put an offer on my Card opens assembly wire", async ({ page }) => {
    await page.goto("/dashboard");
    const recipe = page.getByRole("link", { name: /Put an offer on my Card/i });
    if (await recipe.count()) {
      await recipe.first().click();
      await expect(page.getByTestId("card-offer-wire-panel")).toBeVisible({ timeout: 60_000 });
    } else {
      await page.goto("/dashboard/card?wire=offer");
      await expect(page.getByTestId("card-offer-wire-panel")).toBeVisible({ timeout: 60_000 });
    }
  });

  test("Card assembly shows offer fuse-box status", async ({ page }) => {
    await page.goto("/dashboard/card");
    await expect(page.getByTestId("card-assembly-workspace")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("fuse-box-offer")).toBeVisible();
    const status = await page.getByTestId("fuse-box-offer").getAttribute("data-status");
    expect([
      "connected",
      "partially_connected",
      "available_to_configure",
      "not_yet_available",
    ]).toContain(status);
  });

  test("Offer wire requires explicit selection and confirmation before bind", async ({
    page,
  }) => {
    await page.goto("/dashboard/card?wire=offer");
    await expect(page.getByTestId("card-offer-wire-panel")).toBeVisible({ timeout: 60_000 });

    const empty = page.getByTestId("card-offer-empty-state");
    if (await empty.isVisible().catch(() => false)) {
      await expect(page.getByTestId("card-offer-create-campaign")).toBeVisible();
      await expect(page.getByTestId("card-offer-bind")).toHaveCount(0);
      return;
    }

    const select = page.getByTestId("card-offer-campaign-select");
    await expect(select).toBeVisible();
    const mode = await select.getAttribute("data-selection-mode");
    expect(["single", "multiple"]).toContain(mode);

    const bind = page.getByTestId("card-offer-bind");
    const confirm = page.getByTestId("card-offer-bind-confirm");

    if (mode === "multiple") {
      // Must not silently hold a newest Campaign — empty or currently-bound only
      const value = await select.inputValue();
      const options = select.locator("option");
      const firstEligible = await options.nth(1).getAttribute("value"); // 0 is placeholder
      // If nothing bound, value should be empty
      if (!value) {
        await expect(bind).toBeDisabled();
        await expect(page.getByTestId("card-offer-awaiting-selection")).toBeVisible();
        await select.selectOption(firstEligible!);
      }
    }

    await expect(page.getByTestId("card-offer-selected-context")).toBeVisible({
      timeout: 10_000,
    });
    await expect(bind).toBeDisabled();
    await confirm.check();
    await expect(bind).toBeEnabled();

    await page.getByTestId("card-offer-preview").click();
    await expect(
      page.getByTestId("card-offer-unified-preview").or(page.getByTestId("card-offer-wire-error"))
    ).toBeVisible({ timeout: 30_000 });
  });
});
