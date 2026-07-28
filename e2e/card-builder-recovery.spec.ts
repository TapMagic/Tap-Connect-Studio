/**
 * Card Builder recovery — visual host must be primary on /dashboard/card/edit.
 * Assembly page lives at /dashboard/card.
 * Requires PROOF_HEADED=1 and local server + isolated DB + Clerk-dev session.
 */
import { expect, test } from "@playwright/test";

const headed = process.env.PROOF_HEADED === "1";
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";

test.describe("card builder visual recovery", () => {
  test.skip(!headed, "Set PROOF_HEADED=1 for headed Card Builder proofs");

  test("PO path: assembly → edit, see preview, add Ask a Question, save", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/card`, { waitUntil: "networkidle" });
    await expect(page.getByTestId("card-assembly-workspace")).toBeVisible({ timeout: 60_000 });
    await page.getByTestId("card-edit-open").click();
    // Redesign: the edit workspace hosts the builder inside the adaptive shell.
    await expect(page.getByTestId("tap-card-builder")).toBeVisible({ timeout: 60_000 });
    const hostBox = await page.getByTestId("tap-card-builder").boundingBox();
    expect(hostBox?.height ?? 0).toBeGreaterThan(280);
    await expect(page.getByTestId("card-save").first()).toBeVisible();
    await expect(page.getByTestId("card-canvas-viewport")).toBeVisible();

    // Select a section if present
    const segment = page.locator("[data-testid^='card-segment-']").first();
    if ((await segment.count()) && (await segment.isVisible().catch(() => false))) {
      await segment.click();
    }

    // Edit identity / text if available
    const headline = page.getByTestId("identity-headline");
    if (await headline.count()) {
      await headline.fill(`Recovery proof ${Date.now()}`);
    }

    // Add Ask a Question — redesign: adding lives in the Outline tool drawer.
    await page.getByTestId("card-tool-outline").click();
    const kindSelect = page.getByTestId("card-drawer-add-action-kind");
    await expect(kindSelect).toBeVisible({ timeout: 15_000 });
    await kindSelect.selectOption("support");
    await page.getByTestId("card-drawer-add-action").click();
    // Save — assert the API round-trip succeeds (the shade saved chip can be
    // hidden while the shade is auto-collapsed).
    const [saveResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/brand") && r.request().method() === "PATCH",
        { timeout: 20_000 }
      ),
      page.getByTestId("card-save").first().click(),
    ]);
    expect(saveResponse.ok()).toBeTruthy();
  });

  test("edit workspace preview never collapses; zoom controls work", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/card/edit`, { waitUntil: "networkidle" });
    await expect(page.getByTestId("card-preview-canvas")).toBeVisible({ timeout: 60_000 });
    const box = await page.getByTestId("card-preview-canvas").boundingBox();
    expect(box?.height ?? 0).toBeGreaterThan(200);
    await page.getByTestId("card-zoom-fit").click();
    await expect(page.getByTestId("card-preview-phone")).toHaveAttribute("data-zoom", "fit");
    // Design chrome toggle only exists outside the adaptive shell (legacy
    // standalone builder); in the shell-hosted redesign the shell owns chrome.
    const chromeToggle = page.getByTestId("card-design-chrome-toggle");
    if (await chromeToggle.isVisible().catch(() => false)) {
      await chromeToggle.click();
    }
  });
});
