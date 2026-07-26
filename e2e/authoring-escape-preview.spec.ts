/**
 * Authoring escape + preview + case ops correction e2e.
 * PROOF_HEADED=1 required.
 */
import { expect, test } from "@playwright/test";

const headed = process.env.PROOF_HEADED === "1";

test.describe("authoring escape + preview + inbox humanization", () => {
  test.skip(!headed, "Set PROOF_HEADED=1");
  test.describe.configure({ timeout: 180_000 });

  test("edit escape hides studio nav; panes scroll; Done exits", async ({ page }) => {
    await page.goto("/dashboard/card/edit");
    await expect(page.getByTestId("dashboard-chrome")).toHaveAttribute(
      "data-escape-mode",
      "true",
      { timeout: 60_000 }
    );
    await expect(page.getByTestId("authoring-escape-bar")).toBeVisible();
    await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible();
    await expect(page.getByTestId("card-builder-host")).toBeVisible();

    const outline = page.getByTestId("card-outline-rail");
    const canvas = page.getByTestId("card-preview-canvas");
    const inspector = page.getByTestId("card-inspector-rail");
    await expect(outline).toBeVisible();
    await expect(canvas).toBeVisible();
    await expect(inspector).toBeVisible();

    await outline.evaluate((el) => {
      el.scrollTop = 0;
    });
    await outline.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await canvas.evaluate((el) => {
      el.scrollTop = 0;
    });
    await canvas.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });

    await page.getByTestId("card-toggle-outline").click();
    await expect(outline).toBeHidden();
    await page.getByTestId("card-toggle-outline").click();
    await expect(outline).toBeVisible();

    await page.getByTestId("card-edit-done-link").click();
    await expect(page.getByTestId("card-assembly-workspace")).toBeVisible({ timeout: 30_000 });
  });

  test("view-only preview workspace loads without edit controls", async ({ page }) => {
    await page.goto("/dashboard/card/preview");
    await expect(page.getByTestId("card-preview-workspace")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("card-preview-canvas")).toBeVisible();
    await expect(page.getByTestId("card-save")).toHaveCount(0);
    await page.getByTestId("card-preview-viewport").getByText("Phone").click();
    await expect(page.getByTestId("card-preview-frame")).toHaveAttribute("data-viewport", "phone");
  });

  test("inbox uses operator language for preferences check", async ({ page }) => {
    await page.goto("/dashboard/audience/inbox");
    await expect(page.getByRole("heading", { name: /Inbox/i })).toBeVisible({
      timeout: 60_000,
    });
    const purpose = page.getByTestId("inbox-purpose");
    if (await purpose.isVisible().catch(() => false)) {
      await expect(purpose.locator("option").first()).toContainText(/Support|Service|Marketing/i);
      await expect(page.getByText(/Customer can receive this reply/i)).toBeVisible();
      await expect(page.getByTestId("inbox-composer-hint")).toContainText(
        /communication preferences/i
      );
      await expect(page.getByText(/Channel Guardian enforced/i)).toHaveCount(0);
    }
  });

  test("cases workspace queue views render", async ({ page }) => {
    await page.goto("/dashboard/audience/cases");
    await expect(page.getByTestId("case-operations-workspace")).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByTestId("case-queue-views")).toBeVisible();
    await page.getByTestId("case-queue-new").click();
    await expect(page.getByTestId("case-queue-list")).toBeVisible();
  });
});
