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
  const moreMusic = page.getByTestId("compact-action-tile-proof-more-music").locator('[data-pick-insert-kind="mastered"]');
  await expect(page.getByTestId("easy-to-be-lonely-proof-container")).toBeVisible();
  await expect(spotify).toBeVisible();
  await expect(apple).toBeVisible();
  await expect(moreMusic).toBeVisible();
  await expect(spotify).toHaveAttribute("data-pick-master-id", "LT-PICK-SPOTIFY");
  await expect(apple).toHaveAttribute("data-pick-master-id", "LT-PICK-MUSIC");
  await expect(moreMusic).toHaveAttribute("data-pick-master-id", "LT-PICK-PLAYLIST");
  await expect(page.locator('[data-love-and-theft-fallback-insert="true"]')).toHaveCount(0);
  await expect(moreMusic.locator('img[data-certified-source-master="true"]')).toHaveAttribute("src", /LT-PICK-PLAYLIST_more-music\.png$/);
  for (const pick of [spotify, apple, moreMusic]) {
    const box = await pick.boundingBox();
    expect(box?.width).toBeGreaterThan(60);
    expect(box?.width).toBeLessThanOrEqual(114);
    expect(Math.abs((box?.width ?? 0) - (box?.height ?? 0))).toBeLessThan(1);
  }
  await page.screenshot({ path: "/private/tmp/love-theft-pick-home-390.png", fullPage: true });
});

test("Love & Theft Pick Library exposes every unique certified master by category", async ({ page }) => {
  test.skip(!enabled, "Set LOVE_THEFT_SEMANTIC_INSERT_ACCEPTANCE=1 for the deterministic read-only Studio drawer proof");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/review/studio", { waitUntil: "networkidle" });
  if (!(await page.getByTestId("experience-nav-page-music").count())) {
    await page.getByRole("link", { name: "Open / Edit", exact: true }).click();
    await expect(page.getByTestId("studio-reconstitution-shell")).toBeVisible();
  }
  await page.getByTestId("experience-nav-page-music").click();
  const gridModule = page.getByTestId("compact-action-grid").first().locator('xpath=ancestor::*[@data-composition-kind="module"][1]');
  await gridModule.click({ position: { x: 2, y: 2 }, force: true });
  const inspector = page.getByTestId("studio-compact-action-grid-inspector");
  if (!(await inspector.isVisible())) await page.getByRole("button", { name: /^Edit ·/ }).click();
  await expect(inspector).toBeVisible();
  await inspector.getByRole("button", { name: "Look", exact: true }).click();
  await expect(inspector.getByText("Icon / Insert · Love & Theft Pick Library", { exact: true })).toBeVisible();
  for (const category of ["love-theft", "music-media", "social", "live-events", "commerce-access", "contact-utility", "brand"]) {
    await expect(inspector.getByTestId(`pick-category-${category}`)).toBeVisible();
  }
  await expect(inspector.locator('[data-certified-master-preview]')).toHaveCount(24);
  await expect(inspector.getByRole("button", { name: /Love & Theft · Love & Theft · Certified master/ })).toBeVisible();
  await expect(inspector.getByRole("button", { name: /EverEncore Pick · Brand · Certified master/ })).toBeVisible();
  await expect(inspector.getByRole("button", { name: /Tickets · Classic · Live & Events · Certified master/ })).toBeVisible();
  await expect(inspector.getByRole("button", { name: /Cowboy Hat · Live & Events · Certified master/ })).toBeVisible();
  await expect(inspector.getByRole("button", { name: /Blank \/ Custom · Love & Theft · Certified master/ })).toBeVisible();
  await page.screenshot({ path: "/private/tmp/love-theft-pick-library-drawer.png", fullPage: true });
});
