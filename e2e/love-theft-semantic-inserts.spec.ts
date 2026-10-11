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
  await expect(page.getByTestId("easy-to-be-lonely-proof-container")).toBeVisible();
  await expect(spotify).toBeVisible();
  await expect(apple).toBeVisible();
  await expect(moreMusic).toBeVisible();
  const fallback = moreMusic.locator('[data-love-and-theft-fallback-insert="true"]');
  await expect(fallback).toHaveAttribute("data-family-insert-construction", "secondary-insert");
  await expect(fallback).toHaveAttribute("data-family-insert-presentation", "integrated-master-recess");
  await expect(fallback).toHaveAttribute("data-family-recess-authority", "blank-master");
  await expect(fallback.locator(':scope > [data-love-and-theft-engraved-icon="true"] svg')).toBeVisible();
  await expect(fallback.locator('[data-love-and-theft-fallback-recess-layer="true"]')).toHaveCount(0);
  await expect(fallback.locator("svg")).toHaveCSS("color", "rgb(152, 101, 44)");
  for (const pick of [spotify, apple, moreMusic]) {
    const box = await pick.boundingBox();
    expect(box?.width).toBeGreaterThan(60);
    expect(box?.width).toBeLessThanOrEqual(114);
    expect(Math.abs((box?.width ?? 0) - (box?.height ?? 0))).toBeLessThan(1);
  }
});
