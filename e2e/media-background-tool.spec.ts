import { expect, test } from "@playwright/test";

test.describe("shared durable background tool", () => {
  test.skip(
    process.env.BACKGROUND_TOOL_ACCEPTANCE !== "1",
    "Set BACKGROUND_TOOL_ACCEPTANCE=1 for the durable media acceptance pass.",
  );

  test("Assets creates, groups, reuses, and restores a non-destructive derivative", async ({ page }) => {
    await page.goto("/dashboard/assets");
    await expect(page.getByTestId("assets-library")).toBeVisible();
    const firstRoot = page.locator('[data-testid^="asset-card-"]').first();
    await firstRoot.click();
    const drawer = page.getByTestId("asset-detail-drawer");
    await expect(drawer).toBeVisible();
    const originalUrl = await drawer.locator("img").first().getAttribute("src");
    await drawer.getByRole("button", { name: "Remove background", exact: true }).click();
    const tool = page.getByTestId("background-tool");
    await expect(tool).toBeVisible();
    await expect(tool).toContainText("the original Asset is always preserved");
    await expect(tool.getByTestId("background-invert-selection")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await tool.getByTestId("background-invert-selection").click();
    await expect(tool.getByTestId("background-invert-selection")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await tool.getByTestId("background-refine").click();
    await expect(tool.getByRole("button", { name: "Keep Subject", exact: true })).toBeVisible();
    await expect(
      tool.getByRole("button", { name: "Remove Background", exact: true }),
    ).toBeVisible();
    await expect(tool.getByTestId("background-refine-help")).toContainText(
      "anything that should remain",
    );
    await expect(tool.getByTestId("background-refine-help")).toContainText(
      "anything that should become transparent",
    );
    await tool.getByTestId("remove-color-mode").click();
    await expect(tool.getByTestId("background-invert-selection")).toBeHidden();
    await tool.getByTestId("remove-background-mode").click();
    await expect(tool.getByTestId("background-invert-selection")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await tool.getByTestId("background-create-variant").click();
    await expect(tool.getByText(/Saved a reusable|Reused the matching/)).toBeVisible({ timeout: 30_000 });
    await expect(tool.getByTestId("background-apply-variant")).toBeEnabled();
    await tool.getByTestId("background-apply-variant").click();
    await expect(tool).toBeHidden();
    await expect(drawer.getByRole("button", { name: "View original Asset" })).toBeVisible();
    const derivedUrl = await drawer.locator("img").first().getAttribute("src");
    expect(derivedUrl).not.toBe(originalUrl);

    await drawer.getByRole("button", { name: "View original Asset" }).click();
    await expect(drawer.getByTestId("asset-derived-variants")).toBeVisible();
    await page.reload();
    await expect(page.getByTestId("assets-library")).toBeVisible();
    await expect(page.getByText(/variant/).first()).toBeVisible();
  });
});
