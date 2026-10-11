import { expect, test } from "@playwright/test";

const enabled = process.env.STUDIO_AUTHORING_BASELINE_ACCEPTANCE === "1";

test("proves Love & Theft Draft background, blank Page, and Layered Container authoring", async ({ page }) => {
  test.skip(!enabled, "Set STUDIO_AUTHORING_BASELINE_ACCEPTANCE=1 for the production-backed Draft proof");
  test.setTimeout(240_000);
  page.setDefaultTimeout(15_000);
  await page.setViewportSize({ width: 1440, height: 960 });

  await page.goto("/review/studio", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/dashboard\/experiences\/library$/);
  const loveCard = page.locator('[data-testid^="experience-card-"]').filter({ hasText: "Love & Theft Sales Demo" });
  await expect(loveCard).toBeVisible();
  await loveCard.getByRole("link", { name: "Open" }).click();
  await expect(page).toHaveURL(/\/dashboard\/card\/edit\?experience=/);

  const experienceId = new URL(page.url()).searchParams.get("experience")!;
  const baselineResponse = await page.request.get(`/api/experiences/${experienceId}`);
  expect(baselineResponse.ok()).toBeTruthy();
  const baseline = (await baselineResponse.json()) as {
    document: { draft: Record<string, unknown>; draftRevision: number; publicationActive: boolean; currentPublicationSnapshotId: string | null };
  };

  try {
    const home = page.getByTestId("experience-nav-page-home");
    if (await home.isVisible().catch(() => false)) await home.click();
    await page.getByTestId("creative-composition-canvas").first().click({ position: { x: 4, y: 4 } });
    await page.getByRole("button", { name: "Refine surface" }).click();

    const surface = page.getByTestId("studio-card-surface-inspector");
    await expect(surface.getByRole("heading", { name: "Card / Background" })).toBeVisible();
    for (const mode of ["Transparent", "Solid", "Gradient", "Image"]) {
      await expect(surface.getByRole("button", { name: mode, exact: true })).toBeVisible();
    }

    await surface.getByRole("button", { name: "Image", exact: true }).click();
    await surface.getByRole("button", { name: /^(Choose Asset|Replace image)$/ }).click();
    const leather = page.getByTestId("media-browser-result").filter({ hasText: "hay field.jpg" });
    await expect(leather).toBeVisible();
    await leather.click();
    await page.getByTestId("media-browser-insert").click();
    await expect(surface.getByTestId("studio-card-image-controls")).toBeVisible();

    const background = page.getByTestId("composition-background-renderer").first();
    for (const presentation of [
      ["cover_page", "Cover Page"],
      ["viewport_immersive", "Viewport Immersive"],
      ["focal_cover", "Focal Cover"],
      ["ambient_extend", "Ambient Extend"],
      ["tile", "Tile"],
    ] as const) {
      await surface.getByRole("button", { name: new RegExp(`^${presentation[1]}`) }).click();
      await expect(background).toHaveAttribute("data-image-presentation", presentation[0]);
    }
    await surface.getByRole("button", { name: /^Viewport Immersive/ }).click();
    await expect(background).toHaveAttribute("data-edge-mode", "full_bleed");
    await surface.getByLabel("Horizontal focal position").fill("38");
    await surface.getByLabel("Vertical focal position").fill("61");
    await surface.getByLabel("Zoom / scale").fill("132");
    await surface.getByLabel("Brightness").fill("92");
    await surface.getByLabel("Contrast").fill("108");
    await surface.getByLabel("Saturation").fill("88");
    await surface.getByLabel("Veil strength").fill("30");
    await surface.getByLabel("Image opacity").fill("96");
    await surface.getByRole("button", { name: "Close Inspector" }).click();

    const save = page.getByTestId("studio-save");
    await expect(save).toBeEnabled();
    await save.click();
    await expect(save).toBeDisabled();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("composition-background-renderer").first()).toHaveAttribute("data-image-presentation", "viewport_immersive");

    await page.getByTestId("studio-preview").click();
    await expect(page.getByTestId("composition-background-renderer").first()).toHaveAttribute("data-image-presentation", "viewport_immersive");
    await page.getByTestId("studio-preview").click();

    await page.getByTestId("studio-pages-open").click();
    const pageRows = page.locator('[data-testid^="studio-page-row-"]');
    const beforePages = await pageRows.count();
    await page.getByTestId("studio-page-add").click();
    await expect(pageRows).toHaveCount(beforePages + 1);
    const addedPageTestId = await page.locator('[data-testid^="studio-page-row-"][aria-pressed="true"]').getAttribute("data-testid");
    expect(addedPageTestId).toBeTruthy();
    await page.getByRole("button", { name: "Close Pages" }).click();
    const activeCanvas = page.getByTestId("creative-composition-canvas").first();
    await expect(activeCanvas.locator("[data-composition-node]")).toHaveCount(0);

    await page.getByTestId("studio-rail-add").click();
    await page.getByTestId("studio-add-container").click();
    await page.getByTestId("studio-add-container-transparent").click();
    const container = page.locator('[data-composition-kind="container"][data-selected="true"]');
    await expect(container).toBeVisible();
    const inspector = page.getByTestId("studio-composition-inspector");
    for (const mode of ["Vertical", "Horizontal", "Grid", "Layered"]) {
      await expect(inspector.getByRole("button", { name: mode, exact: true })).toBeVisible();
    }
    await inspector.getByRole("button", { name: "Layered", exact: true }).click();
    await expect(container).toHaveAttribute("data-layered-container", "true");
    await inspector.getByRole("button", { name: "Close Inspector" }).click();
    await expect(save).toBeEnabled();
    await save.click();
    await expect(save).toBeDisabled();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByTestId("studio-pages-open").click();
    await page.getByTestId(addedPageTestId!).click();
    await page.getByRole("button", { name: "Close Pages" }).click();
    await expect(page.locator('[data-composition-kind="container"][data-layered-container="true"]')).toHaveCount(1);
  } finally {
    const currentResponse = await page.request.get(`/api/experiences/${experienceId}`);
    if (currentResponse.ok()) {
      const current = (await currentResponse.json()) as { document: { draftRevision: number } };
      const restored = await page.request.put(`/api/card/documents/${experienceId}`, {
        data: { draft: baseline.document.draft, expectedRevision: current.document.draftRevision },
      });
      expect(restored.ok()).toBeTruthy();
      const afterResponse = await page.request.get(`/api/experiences/${experienceId}`);
      const after = (await afterResponse.json()) as {
        document: { publicationActive: boolean; currentPublicationSnapshotId: string | null };
      };
      expect(after.document.publicationActive).toBe(baseline.document.publicationActive);
      expect(after.document.currentPublicationSnapshotId).toBe(baseline.document.currentPublicationSnapshotId);
    }
  }
});
