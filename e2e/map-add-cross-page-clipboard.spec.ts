import { expect, test } from "@playwright/test";

const enabled = process.env.MAP_ADD_CLIPBOARD_ACCEPTANCE === "1";

test("adds a new Map and copies it between Experience Pages with phone parity", async ({ page }) => {
  test.skip(!enabled, "Set MAP_ADD_CLIPBOARD_ACCEPTANCE=1 for the deterministic Studio proof");
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/review/studio", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/dashboard\/experiences\/library$/);
  const loveCard = page.locator('[data-testid^="experience-card-"]').filter({ hasText: "Love & Theft Sales Demo" });
  await loveCard.getByRole("link", { name: "Open" }).click();
  const experienceId = new URL(page.url()).searchParams.get("experience")!;
  const baselineResponse = await page.request.get(`/api/experiences/${experienceId}`);
  expect(baselineResponse.ok()).toBeTruthy();
  const baseline = await baselineResponse.json() as { document: { draft: Record<string, unknown>; draftRevision: number } };

  try {
    await page.getByTestId("studio-rail-add").click();
    await page.getByTestId("studio-add-map").click();
    await expect(page.getByTestId("studio-map-catalog")).toBeVisible();
    await page.getByTestId("studio-add-map-location-container").click();

    const controls = page.getByTestId("map-location-authoring-controls");
    await expect(controls).toBeVisible();
    await expect(controls.getByText("Add a venue, select a workspace place, or enter an address.")).toBeVisible();
    await controls.getByTestId("map-add-location").click();
    const location = controls.locator('[data-testid^="map-location-editor-"]').first();
    await location.getByLabel("Display name").fill("Tour Venue");
    await location.getByLabel("Display address").fill("123 Music Way, Nashville, TN");
    await page.getByRole("button", { name: "Close Inspector" }).click();

    await expect(page.getByTestId("studio-copy-selection")).toBeEnabled();
    await page.getByTestId("studio-copy-selection").click();
    await expect(page.getByTestId("studio-paste-selection")).toBeEnabled();

    await page.getByTestId("studio-pages-open").click();
    await page.getByTestId("studio-page-row-page-music").click();
    await page.getByRole("button", { name: "Close Pages" }).click();
    const destinationMaps = page.getByTestId("map-location-container");
    const before = await destinationMaps.count();
    await page.getByTestId("studio-paste-selection").click();
    await expect(destinationMaps).toHaveCount(before + 1);
    await expect(destinationMaps.last()).toHaveAttribute("data-map-location-count", "1");
    await expect(destinationMaps.last().getByText("Tour Venue", { exact: true })).toBeVisible();

    await page.getByLabel("phone preview").click();
    await page.getByTestId("studio-preview").click();
    await expect(page.locator('[data-studio-viewport="phone"]')).toBeVisible();
    await expect(destinationMaps.last()).toBeVisible();
    const phoneWidth = await destinationMaps.last().evaluate((element) => element.getBoundingClientRect().width);
    expect(phoneWidth).toBeLessThanOrEqual(390);
  } finally {
    const currentResponse = await page.request.get(`/api/experiences/${experienceId}`);
    if (currentResponse.ok()) {
      const current = await currentResponse.json() as { document: { draftRevision: number } };
      await page.request.put(`/api/card/documents/${experienceId}`, { data: { draft: baseline.document.draft, expectedRevision: current.document.draftRevision } });
    }
  }
});
