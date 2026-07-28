/**
 * Card Authoring Workspace · Preview · Persistent Utility Actions wave.
 * Headed proofs: assembly page, edit workspace, zoom, public Ask a Question.
 *
 * Usage:
 *   PROOF_HEADED=1 BASE_URL=http://127.0.0.1:3000 \
 *   npx playwright test e2e/card-authoring-workspace.spec.ts --headed
 */
import { expect, test } from "@playwright/test";

const headed = process.env.PROOF_HEADED === "1";

test.describe("card authoring workspace wave", () => {
  test.skip(!headed, "Set PROOF_HEADED=1 for headed Card authoring proofs");
  test.describe.configure({ timeout: 180_000 });

  test("assembly page is fuse-box view — not the long builder toolbar", async ({ page }) => {
    await page.goto("/dashboard/card");
    await expect(page.getByTestId("card-assembly-workspace")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("card-edit-open")).toBeVisible();
    await expect(page.getByTestId("card-fuse-box")).toBeVisible();
    await expect(page.getByTestId("card-assembly-preview")).toBeVisible();
    await expect(page.getByTestId("card-save")).toHaveCount(0);
    await expect(page.locator(".builder-studio")).toHaveCount(0);
  });

  test("edit route is full Adaptive shell with zoom + focus", async ({ page }) => {
    await page.goto("/dashboard/card/edit");
    await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("authoring-workspace-shell")).toBeVisible();
    await expect(page.getByTestId("card-edit-workspace-host")).toHaveAttribute(
      "data-adaptive-shell",
      "v1"
    );
    await expect(page.getByTestId("card-save")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("card-preview-canvas")).toBeVisible();
    await expect(page.getByTestId("tap-card-builder")).toHaveAttribute(
      "data-shell-hosted",
      "true"
    );
    // One primary toolbar — builder chrome hidden
    await expect(page.locator(".builder-studio-toolbar")).toHaveCount(0);
    await expect(page.getByTestId("card-inspector-rail")).toBeHidden();

    const canvas = page.getByTestId("card-preview-canvas");
    const box = await canvas.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThan(280);

    await page.getByTestId("card-zoom-fit").click();
    await expect(page.getByTestId("card-preview-phone")).toHaveAttribute("data-zoom", "fit");
    await page.getByTestId("card-zoom-100").click();
    await expect(page.getByTestId("card-preview-phone")).toHaveAttribute("data-zoom", "1");
    await page.getByTestId("card-zoom-in").click();
    await page.getByTestId("command-shade-focus").click();
    await expect(page.getByTestId("tap-card-builder")).toHaveAttribute("data-focus-mode", "true");
    await page.getByTestId("card-shade-done").click();
    await expect(page.getByTestId("card-assembly-workspace")).toBeVisible({ timeout: 30_000 });
  });

  test("seeded public campaign shows Ask a Question utility", async ({ page }) => {
    await page.goto("/t/seeddemo01?public=1");
    await expect(page.getByTestId("card-utility-layer")).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId("card-utility-support")).toBeVisible();
    await expect(page.getByText(/Keep this Card/i).first()).toBeVisible();
    await page.getByTestId("card-utility-support").click();
    await expect(page.getByTestId("card-utility-support-sheet")).toBeVisible();
    await page.getByTestId("card-support-email").fill("po-ask@example.invalid");
    await page.getByTestId("card-support-question").fill("Seeded Ask a Question walkthrough test");
    const consent = page.getByTestId("card-support-consent");
    if (await consent.isVisible().catch(() => false)) {
      await consent.check();
    }
    await page.getByTestId("card-support-submit").click();
    await expect(page.getByTestId("card-support-success")).toBeVisible({ timeout: 20_000 });
  });
});
