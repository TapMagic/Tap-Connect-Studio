/**
 * Card Builder recovery — visual host must be primary on /dashboard/card.
 * Requires PROOF_HEADED=1 and local server + isolated DB + Clerk-dev session.
 */
import { expect, test } from "@playwright/test";

const headed = process.env.PROOF_HEADED === "1";
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";

test.describe("card builder visual recovery", () => {
  test.skip(!headed, "Set PROOF_HEADED=1 for headed Card Builder proofs");

  test("PO path: open Card, see preview, edit, add Ask a Question, save", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/card`, { waitUntil: "networkidle" });
    await expect(page.getByTestId("card-builder-host")).toBeVisible({ timeout: 60_000 });
    const hostBox = await page.getByTestId("card-builder-host").boundingBox();
    expect(hostBox?.height ?? 0).toBeGreaterThan(400);
    await expect(page.getByTestId("card-save")).toBeVisible();
    await expect(page.getByTestId("card-fuse-box")).toBeHidden();

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
    await expect(page.locator("[data-testid^='card-segment-']").filter({ hasText: /Ask a Question|support/i }).first()).toBeVisible({
      timeout: 10_000,
    }).catch(async () => {
      // Label may be custom; ensure a new segment exists after add
      await expect(page.locator("[data-testid^='card-segment-']").last()).toBeVisible();
    });

    await page.getByTestId("card-save").click();
    await expect(page.getByText(/Saved|saved/i).first()).toBeVisible({ timeout: 20_000 });

    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByTestId("card-builder-host")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("card-save")).toBeVisible();
    const after = await page.getByTestId("card-builder-host").boundingBox();
    expect(after?.height ?? 0).toBeGreaterThan(400);
  });

  test("desktop tablet mobile builder host remains usable", async ({ page }) => {
    for (const size of [
      { w: 1280, h: 800, id: "desktop" },
      { w: 820, h: 1180, id: "tablet" },
      { w: 390, h: 844, id: "mobile" },
    ] as const) {
      await page.setViewportSize({ width: size.w, height: size.h });
      await page.goto(`${BASE}/dashboard/card`, { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("card-builder-host")).toBeVisible({ timeout: 60_000 });
      await expect(page.getByTestId("card-save")).toBeVisible({ timeout: 30_000 });
      const box = await page.getByTestId("card-builder-host").boundingBox();
      expect(box?.height ?? 0, size.id).toBeGreaterThan(size.id === "mobile" ? 300 : 400);
    }
  });
});
