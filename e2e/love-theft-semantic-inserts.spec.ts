import { expect, test } from "@playwright/test";

const enabled = process.env.LOVE_THEFT_SEMANTIC_INSERT_ACCEPTANCE === "1";

test("Love & Theft keeps Spotify, Apple Music, and More Music coherent at 390px", async ({ page }) => {
  test.skip(!enabled, "Set LOVE_THEFT_SEMANTIC_INSERT_ACCEPTANCE=1 for the deterministic read-only proof surface");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/review/studio", { waitUntil: "networkidle" });
  await page.goto("/review/love-theft-picks", { waitUntil: "networkidle" });
  await expect(page.getByTestId("love-theft-semantic-insert-proof")).toBeVisible();
  const spotify = page.getByTestId("compact-action-tile-proof-spotify").locator('[data-pick-insert-kind="mastered"]');
  const apple = page.getByTestId("compact-action-tile-proof-apple-music").locator('[data-pick-insert-kind="mastered"]');
  const moreMusic = page.getByTestId("compact-action-tile-proof-more-music").locator('[data-pick-insert-kind="engraved-fallback"]');
  const heart = page.getByTestId("compact-action-tile-proof-heart").locator('[data-pick-insert-kind="engraved-fallback"]');
  const globe = page.getByTestId("compact-action-tile-proof-globe").locator('[data-pick-insert-kind="engraved-fallback"]');
  await expect(spotify).toBeVisible();
  await expect(apple).toBeVisible();
  await expect(moreMusic).toBeVisible();
  const fallbacks = [moreMusic, heart, globe];
  for (const fallback of fallbacks) {
    await expect(fallback.locator('[data-love-and-theft-fallback-insert="true"]')).toBeVisible();
    await expect(fallback.locator('[data-love-and-theft-engraved-icon="true"] svg')).toBeVisible();
  }
  await expect(moreMusic.locator('[data-family-insert-construction="secondary-insert"]')).toBeVisible();
  await expect(heart.locator('[data-family-insert-construction="direct-engrave"]')).toBeVisible();
  await expect(globe.locator('[data-family-insert-construction="recessed-medallion"]')).toBeVisible();
  for (const pick of [spotify, apple, moreMusic, heart, globe]) {
    const box = await pick.boundingBox();
    expect(box?.width).toBeGreaterThan(60);
    expect(box?.width).toBeLessThanOrEqual(114);
    expect(Math.abs((box?.width ?? 0) - (box?.height ?? 0))).toBeLessThan(1);
  }
});
