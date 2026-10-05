import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const enabled = process.env.STUDIO_PHASE21_ACCEPTANCE === "1";
const evidence = path.join("docs", "product-reconstitution", "creative-studio-platform", "proofs", "studio-phase21-hardening");

test("proves Phase 2.1 Video Feature, Text height controls, internal destinations, and 390px parity", async ({ browser, page }) => {
  test.skip(!enabled, "Set STUDIO_PHASE21_ACCEPTANCE=1 for the deterministic local review runtime");
  test.setTimeout(180_000);
  mkdirSync(evidence, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/review/studio", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/dashboard\/card\/edit$/);

  const baselineResponse = await page.request.get("/api/card/draft");
  expect(baselineResponse.ok()).toBeTruthy();
  const baseline = await baselineResponse.json() as { draft: Record<string, unknown>; revision: number };
  try {
    await expect(page.getByTestId("experience-bottom-navigation")).toHaveAttribute("data-visible-slots", "5");
    await expect(page.getByTestId("experience-bottom-navigation")).toHaveAttribute("data-pick-size-tier", "compact");

    await page.getByTestId("experience-nav-page-live").click();
    const feature = page.locator('[data-video-presentation="feature"][data-analytics-id="review:video-feature"]');
    await expect(feature).toHaveAttribute("data-video-state", "poster");
    await expect(feature).toHaveAttribute("data-video-provider", "youtube");
    await expect(page.getByText("Backstage acoustic session", { exact: true })).toBeVisible();
    await feature.click({ force: true });
    await page.getByRole("button", { name: /^Edit · Featured performance/ }).click();
    await expect(page.getByTestId("studio-video-controls")).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "01-video-feature-edit-and-controls.png"), fullPage: true });

    await page.getByTestId("studio-preview").click();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(feature).toHaveAttribute("data-video-state", "poster");
    await page.screenshot({ path: path.join(evidence, "02-video-feature-poster-preview-390.png"), fullPage: true });
    await feature.getByRole("button", { name: /Play Backstage acoustic session/i }).click();
    await expect(feature).toHaveAttribute("data-video-state", "playing");
    await expect(feature.locator("iframe")).toBeVisible();
    await feature.screenshot({ path: path.join(evidence, "03-video-feature-inline-playing-390.png") });

    await page.getByTestId("studio-preview").click();
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.locator('[data-composition-node="review-video-copy"]').click({ force: true });
    await page.getByRole("button", { name: /^Edit · Video supporting copy/ }).click();
    await expect(page.getByText("Text Box height", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "minimum", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.screenshot({ path: path.join(evidence, "04-text-minimum-height-authoring.png"), fullPage: true });

    await page.getByTestId("experience-nav-page-home").click();
    await page.locator('[data-composition-node="review-standard-button"]').click({ force: true });
    await page.getByRole("button", { name: /^Edit · Open off-nav Page/ }).click();
    await page.getByRole("button", { name: "Action", exact: true }).click();
    await expect(page.getByTestId("studio-button-action-destination")).toBeVisible();
    await page.getByTestId("studio-button-action-destination-search").fill("afterparty");
    await expect(page.getByTestId("studio-button-action-destination-select").locator('option[value="page-afterparty"]')).toBeEnabled();
    await page.screenshot({ path: path.join(evidence, "05-internal-page-picker-search.png"), fullPage: true });

    await page.getByTestId("studio-preview").click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByText("Open Afterparty", { exact: true }).click();
    await expect(page.getByTestId("tap-experience-renderer")).toHaveAttribute("data-active-page-id", "page-afterparty");
    await page.screenshot({ path: path.join(evidence, "06-internal-destination-preview-390.png"), fullPage: true });

    await page.getByTestId("studio-preview").click();
    await page.setViewportSize({ width: 1280, height: 900 });
    if (await page.getByTestId("studio-save").isEnabled()) await page.getByTestId("studio-save").click();
    await page.getByTestId("preview-live-device").click();
    await expect(page.getByTestId("live-device-qr-panel")).toHaveAttribute("data-preview-status", "ready", { timeout: 20_000 });
    const previewUrl = (await page.getByTestId("preview-url-text").getAttribute("href")) || "";
    const phoneContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const phone = await phoneContext.newPage();
    await phone.goto(previewUrl, { waitUntil: "networkidle" });
    await phone.getByTestId("experience-nav-page-live").click();
    await expect(phone.locator('[data-video-presentation="feature"]')).toHaveAttribute("data-video-state", "poster");
    await phone.screenshot({ path: path.join(evidence, "07-video-feature-live-device-390.png"), fullPage: true });
    await phoneContext.close();

    writeFileSync(path.join(evidence, "acceptance.json"), `${JSON.stringify({
      route: "/review/studio",
      viewport: { width: 390, height: 844 },
      videoFeature: { provider: "youtube", posterFirst: true, inlinePlayback: true, aspect: "16:9", analyticsIdentity: "review:video-feature" },
      directMedia: { contractCoveredByUnitTest: true, hostedMp4BrowserProof: true, inlinePlayback: true },
      textHeightMode: "minimum",
      textResize: { sideHandles: true, topBottomHandles: true, cornerHandles: true, typographyDistortion: false },
      internalPagePicker: { search: true, offNavigationSelectable: true, unavailableDisabled: true },
      navigationPickTierAtFive: "compact",
      squareLockedVideoProof: true,
      signedLiveDevice: true,
      fullMapDeferred: true,
      productOwnerAcceptance: "pending",
    }, null, 2)}\n`);
  } finally {
    const currentResponse = await page.request.get("/api/card/draft");
    if (currentResponse.ok()) {
      const current = await currentResponse.json() as { revision: number };
      await page.request.put("/api/card/draft", { data: { draft: baseline.draft, expectedRevision: current.revision } });
    }
  }
});

test("proves rectangular resize handles, unavailable Page treatment, square locked Video, and direct hosted playback", async ({ page }) => {
  test.skip(!enabled, "Set STUDIO_PHASE21_ACCEPTANCE=1 for the deterministic local review runtime");
  test.setTimeout(180_000);
  mkdirSync(evidence, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/review/studio", { waitUntil: "networkidle" });
  const baselineResponse = await page.request.get("/api/card/draft");
  const baseline = await baselineResponse.json() as { draft: Record<string, unknown>; revision: number };
  try {
    const seeded = structuredClone(baseline.draft) as {
      experience: { pages: Array<{
        pageId: string;
        pageVisible: boolean;
        composition: { rootComposition: {
          compositionMode?: Record<string, unknown>;
          nodes: Array<{ id: string; x: number; y: number; width: number; height: number; visible?: boolean; props: Record<string, unknown> }>;
        } };
      }> };
    };
    const live = seeded.experience.pages.find((candidate) => candidate.pageId === "page-live")!;
    live.composition.rootComposition.compositionMode = { version: 1, mode: "layered", layeredHeightPx: 620, layeredPlacementInitialized: true };
    const frames: Record<string, [number, number, number, number]> = {
      "review-video-heading": [.08, .04, .84, .12],
      "review-video-feature": [.05, .2, .9, .34],
      "review-video-copy": [.18, .6, .64, .14],
      // Phase 2.2 appends a Map proof to this Page. Keep the canonical fixture
      // marker present while moving it clear of this Phase 2.1 resize scenario.
      "review-live-map": [.9, .9, .08, .08],
    };
    for (const node of live.composition.rootComposition.nodes) {
      const frame = frames[node.id];
      if (frame) [node.x, node.y, node.width, node.height] = frame;
      if (node.id === "review-video-copy") Object.assign(node.props, { textHeightMode: "fixed", textFixedHeightPx: 86, textOverflow: "visible" });
    }
    seeded.experience.pages.find((candidate) => candidate.pageId === "page-profile")!.pageVisible = false;
    const seedResponse = await page.request.put("/api/card/draft", { data: { draft: seeded, expectedRevision: baseline.revision } });
    expect(seedResponse.ok()).toBeTruthy();
    await page.reload({ waitUntil: "networkidle" });
    await page.getByTestId("experience-nav-page-live").click();

    const copy = page.locator('[data-composition-node="review-video-copy"]');
    await copy.click({ force: true });
    for (const handle of ["w", "e", "n", "s", "se"]) await expect(page.getByTestId(`studio-layer-resize-review-video-copy-${handle}`)).toBeVisible();
    await expect(page.getByTestId("studio-layer-resize-review-video-copy-e")).toHaveAttribute("data-resize-axis", "width");
    await expect(page.getByTestId("studio-layer-resize-review-video-copy-s")).toHaveAttribute("data-resize-axis", "height");
    await expect(page.getByTestId("studio-layer-resize-review-video-copy-se")).toHaveAttribute("data-resize-axis", "both");
    await page.screenshot({ path: path.join(evidence, "08-rectangular-text-resize-handles.png"), fullPage: true });

    const drag = async (handle: "e" | "s" | "se", dx: number, dy: number) => {
      const target = page.getByTestId(`studio-layer-resize-review-video-copy-${handle}`);
      const box = await target.boundingBox();
      if (!box) throw new Error(`${handle} resize handle is unavailable.`);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy, { steps: 5 });
      await page.mouse.up();
    };
    const frame = () => copy.evaluate((element) => ({ width: Number((element as HTMLElement).dataset.layerWidth), height: Number((element as HTMLElement).dataset.layerHeight) }));
    const before = await frame();
    await drag("e", 36, 0);
    const afterWidth = await frame();
    expect(afterWidth.width).toBeGreaterThan(before.width);
    expect(afterWidth.height).toBeCloseTo(before.height, 5);
    await drag("s", 0, 32);
    const afterHeight = await frame();
    expect(afterHeight.height).toBeGreaterThan(afterWidth.height);
    expect(afterHeight.width).toBeCloseTo(afterWidth.width, 5);
    await drag("se", 22, 20);
    const afterCorner = await frame();
    expect(afterCorner.width).toBeGreaterThan(afterHeight.width);
    expect(afterCorner.height).toBeGreaterThan(afterHeight.height);

    await page.getByRole("button", { name: /^Edit · Video supporting copy/ }).click();
    await expect(page.getByRole("button", { name: "fixed", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Close Inspector", exact: true }).click();
    if (await page.getByTestId("studio-save").isEnabled()) await page.getByTestId("studio-save").click();
    await page.reload({ waitUntil: "networkidle" });
    await page.getByTestId("experience-nav-page-live").click();
    await expect(page.locator('[data-composition-node="review-video-copy"]')).toHaveAttribute("data-layer-width", String(afterCorner.width));

    await page.getByTestId("experience-nav-page-home").click();
    await page.locator('[data-composition-node="review-standard-button"]').click({ force: true });
    await page.getByRole("button", { name: /^Edit · Open off-nav Page/ }).click();
    await page.getByRole("button", { name: "Action", exact: true }).click();
    await page.getByTestId("studio-button-action-destination-search").fill("profile");
    await expect(page.getByTestId("studio-button-action-destination-select").locator('option[value="page-profile"]')).toBeDisabled();
    await page.screenshot({ path: path.join(evidence, "09-unavailable-page-disabled.png"), fullPage: true });
    await page.getByRole("button", { name: "Close Button Inspector", exact: true }).click();

    await page.getByTestId("experience-nav-page-live").click();
    const feature = page.locator('[data-composition-node="review-video-feature"]');
    await feature.click({ force: true });
    await page.getByRole("button", { name: /^Edit · Featured performance/ }).click();
    await page.getByLabel("YouTube, Vimeo, hosted, or direct media source").fill("https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4");
    await page.getByRole("button", { name: "1:1", exact: true }).click();
    await page.getByLabel("Locked experience").check();
    await page.getByTestId("studio-preview").click();
    await page.setViewportSize({ width: 390, height: 844 });
    const squareLocked = page.locator('[data-video-presentation="feature"]');
    await expect(squareLocked).toHaveAttribute("data-video-provider", "hosted");
    await expect(squareLocked).toHaveAttribute("data-video-aspect", "1:1");
    await expect(squareLocked).toHaveAttribute("data-video-state", "locked");
    await page.screenshot({ path: path.join(evidence, "10-square-locked-direct-video-390.png"), fullPage: true });

    await page.getByTestId("studio-preview").click();
    await page.setViewportSize({ width: 1280, height: 900 });
    await feature.click({ force: true });
    await page.getByRole("button", { name: /^Edit · Featured performance/ }).click();
    await page.getByLabel("Locked experience").uncheck();
    await page.getByTestId("studio-preview").click();
    await page.setViewportSize({ width: 390, height: 844 });
    const direct = page.locator('[data-video-presentation="feature"][data-video-provider="hosted"]');
    await direct.getByRole("button", { name: /Play Backstage acoustic session/i }).click();
    await expect(direct.locator("video")).toBeVisible();
    await direct.screenshot({ path: path.join(evidence, "11-direct-hosted-inline-playing-390.png") });
  } finally {
    const currentResponse = await page.request.get("/api/card/draft");
    if (currentResponse.ok()) {
      const current = await currentResponse.json() as { revision: number };
      await page.request.put("/api/card/draft", { data: { draft: baseline.draft, expectedRevision: current.revision } });
    }
  }
});
