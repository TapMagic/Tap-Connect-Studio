import { expect, test } from "@playwright/test";

const enabled = process.env.EXPERIENCE_NAV_VISUAL_LIBRARY_ACCEPTANCE === "1";

test("Love & Theft navigation authors and renders exact masters from the canonical library at 390px", async ({ page }) => {
  test.skip(!enabled, "Set EXPERIENCE_NAV_VISUAL_LIBRARY_ACCEPTANCE=1 for the deterministic local review runtime");
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/review/studio", { waitUntil: "networkidle" });
  if (!(await page.getByTestId("studio-pages-open").count())) {
    await page.goto("/dashboard/card/edit", { waitUntil: "networkidle" });
    await expect(page.getByTestId("studio-reconstitution-shell")).toBeVisible();
  }
  const baselineResponse = await page.request.get("/api/card/draft");
  expect(baselineResponse.ok()).toBeTruthy();
  const baseline = await baselineResponse.json() as { draft: Record<string, unknown>; revision: number };

  const choose = async (pageId: string, masterId: string) => {
    await page.getByTestId(`studio-page-row-${pageId}`).click();
    const library = page.getByTestId("studio-page-nav-visual-library");
    await expect(library).toHaveAttribute("data-navigation-visual-library", "everencore-love-and-theft-pick-masters");
    const [activityResponse] = await Promise.all([
      page.waitForResponse((response) => response.url().includes("/api/studio/activity") && response.request().method() === "POST"),
      library.getByTestId(`studio-visual-choice-${masterId}`).click(),
    ]);
    expect(activityResponse.ok()).toBeTruthy();
    await expect(page.getByTestId(`experience-nav-${pageId}`).locator('[data-navigation-artwork="love-and-theft-pick"]')).toHaveAttribute("data-navigation-visual-ref", masterId);
  };

  try {
    await page.getByTestId("studio-pages-open").click();
    const library = page.getByTestId("studio-page-nav-visual-library");
    await expect(library.getByText("Icon / Visual · Love & Theft Pick Library", { exact: true })).toBeVisible();
    for (const category of ["love-theft", "music-media", "social", "live-events", "commerce-access", "contact-utility", "brand"]) {
      await expect(library.getByTestId(`pick-category-${category}`)).toBeVisible();
    }
    await expect(library.locator("[data-certified-master-preview]")).toHaveCount(24);
    await expect(page.getByTestId("studio-page-nav-icon")).toHaveCount(0);
    await page.screenshot({ path: "/private/tmp/love-theft-navigation-library-drawer.png", fullPage: true });

    await choose("page-home", "LT-PICK-LOVE-THEFT");
    await choose("page-music", "LT-PICK-MUSIC");
    await choose("page-live", "LT-PICK-MAP");
    await choose("page-exclusives", "LT-PICK-LOCK");

    await page.getByTestId("studio-page-row-page-profile").click();
    await page.getByTestId("studio-page-nav-visible").uncheck();
    await expect(page.getByTestId("experience-bottom-navigation")).toHaveAttribute("data-visible-slots", "4");
    await expect(page.getByTestId("experience-bottom-navigation")).toHaveAttribute("data-pick-size-tier", "medium");

    const expected = [
      ["page-home", "page-home", "LT-PICK-LOVE-THEFT", /LT-PICK-LOVE-THEFT_artist-identity\.png$/],
      ["page-music", "page-music", "LT-PICK-MUSIC", /LT-PICK-MUSIC_music-note\.png$/],
      ["page-live", "page-live", "LT-PICK-MAP", /LT-PICK-MAP_location\.png$/],
      ["page-exclusives", "page-exclusives", "LT-PICK-LOCK", /LT-PICK-LOCK_lock\.png$/],
    ] as const;
    for (const [pageId, destination, masterId, source] of expected) {
      const item = page.getByTestId(`experience-nav-${pageId}`);
      await expect(item).toHaveAttribute("data-nav-destination", destination);
      await expect(item.locator("[data-pick-master-id]")).toHaveAttribute("data-pick-master-id", masterId);
      await expect(item.locator('img[data-certified-source-master="true"]')).toHaveAttribute("src", source);
    }
    await expect(page.getByTestId("experience-bottom-navigation").locator('[data-pick-insert-kind="blank"]')).toHaveCount(0);

    await page.getByRole("button", { name: "Close Pages" }).click();
    await page.getByTestId("studio-preview").click();
    await page.setViewportSize({ width: 390, height: 844 });
    const nav = page.getByTestId("experience-bottom-navigation");
    await expect(nav).toHaveAttribute("data-safe-area", "bottom");
    await expect(nav.locator('[data-navigation-artwork="love-and-theft-pick"]')).toHaveCount(4);
    const navBox = await nav.boundingBox();
    expect(navBox?.x).toBeGreaterThanOrEqual(0);
    expect((navBox?.x ?? 0) + (navBox?.width ?? 0)).toBeLessThanOrEqual(390);
    await page.screenshot({ path: "/private/tmp/love-theft-navigation-four-masters-390.png", fullPage: true });
  } finally {
    const currentResponse = await page.request.get("/api/card/draft");
    if (currentResponse.ok()) {
      const current = await currentResponse.json() as { revision: number };
      await page.request.put("/api/card/draft", { data: { draft: baseline.draft, expectedRevision: current.revision } });
    }
  }
});
