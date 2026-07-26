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
    await expect(page.getByTestId("card-builder-host")).toBeVisible({ timeout: 60_000 });
    const hostBox = await page.getByTestId("card-builder-host").boundingBox();
    expect(hostBox?.height ?? 0).toBeGreaterThan(280);
    await expect(page.getByTestId("card-save")).toBeVisible();
    await expect(page.getByTestId("card-preview-canvas")).toBeVisible();

    // Select a section if present
    const segment = page.locator("[data-testid^='card-segment-']").first();
    if (await segment.count()) {
      await segment.click();
    }

    // Edit identity / text if available
    const headline = page.getByTestId("identity-headline");
    if (await headline.count()) {
      await headline.fill(`Recovery proof ${Date.now()}`);
    }

    // Add Ask a Question
    const kindSelect = page
      .locator("select")
      .filter({ has: page.locator("option[value='support']") })
      .first();
    await expect(kindSelect).toBeVisible();
    await kindSelect.selectOption("support");
    await page.getByRole("button", { name: /Add action/i }).click();
    await page.getByTestId("card-save").click();
    await expect(page.getByText(/saved|Tap Connect Card saved/i)).toBeVisible({
      timeout: 20_000,
    });
  });

  test("edit workspace preview never collapses; zoom controls work", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/card/edit`, { waitUntil: "networkidle" });
    await expect(page.getByTestId("card-preview-canvas")).toBeVisible({ timeout: 60_000 });
    const box = await page.getByTestId("card-preview-canvas").boundingBox();
    expect(box?.height ?? 0).toBeGreaterThan(200);
    await page.getByTestId("card-zoom-fit").click();
    await expect(page.getByTestId("card-preview-phone")).toHaveAttribute("data-zoom", "fit");
    await page.getByTestId("card-design-chrome-toggle").click();
  });
});
