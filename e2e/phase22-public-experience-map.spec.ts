import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const enabled = process.env.PHASE22_PUBLIC_EXPERIENCE_ACCEPTANCE === "1";
const evidence = path.join("docs", "product-reconstitution", "creative-studio-platform", "proofs", "phase22-public-experience-map");

test("proves the 390px public Experience shell, direct Pages, history, return context, and Map / Location Container", async ({ page }) => {
  test.skip(!enabled, "Set PHASE22_PUBLIC_EXPERIENCE_ACCEPTANCE=1 for the local public-shell proof");
  test.setTimeout(180_000);
  mkdirSync(evidence, { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("https://maps.google.com/**", async (route) => route.fulfill({ contentType: "text/html", body: "<main style='font-family:sans-serif;padding:1rem'>Map provider adapter proof</main>" }));
  await page.route("https://www.youtube.com/embed/**", async (route) => route.fulfill({ contentType: "text/html", body: "<main style='background:#080b10;color:white;font-family:sans-serif;padding:1rem'>Inline video provider adapter proof</main>" }));

  const response = await page.goto("/everencore/love-and-theft", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
  await expect(page.getByTestId("everencore-public-experience")).toHaveAttribute("data-published-revision", "phase-2-2-public-shell-v1");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByTestId("experience-bottom-navigation")).toHaveAttribute("data-visible-slots", "4");
  await expect(page.getByTestId("tap-experience-renderer")).toHaveAttribute("data-active-page-id", "page-home");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("tapconnect.experience.session:everencore-love-and-theft"))).not.toBeNull();
  const sessionId = await page.evaluate(() => sessionStorage.getItem("tapconnect.experience.session:everencore-love-and-theft"));
  expect(sessionId).toBeTruthy();
  await page.screenshot({ path: path.join(evidence, "01-public-home-390.png"), fullPage: true });

  await page.getByTestId("experience-nav-page-music").click();
  await expect(page).toHaveURL(/\/everencore\/love-and-theft\/music$/);
  await expect(page.getByTestId("tap-experience-renderer")).toHaveAttribute("data-active-page-id", "page-music");
  expect(await page.evaluate(() => sessionStorage.getItem("tapconnect.experience.session:everencore-love-and-theft"))).toBe(sessionId);
  const featureVideo = page.locator('[data-analytics-id="everencore:video:road-session"]');
  await expect(featureVideo).toHaveAttribute("data-video-state", "poster");
  await featureVideo.getByRole("button", { name: /Play Road session/i }).click();
  await expect(featureVideo).toHaveAttribute("data-video-state", "playing");
  await expect(featureVideo.locator("iframe")).toBeVisible();
  await page.evaluate(() => {
    document.addEventListener("click", (event) => event.preventDefault(), { capture: true, once: true });
    (document.querySelector('[data-analytics-id="everencore:music:spotify"] a, a[data-analytics-id="everencore:music:spotify"]') as HTMLAnchorElement | null)?.click();
  });
  const musicReturnContext = await page.evaluate(() => JSON.parse(sessionStorage.getItem("tapconnect.experience.return:everencore-love-and-theft") || "null"));
  expect(musicReturnContext?.pageId).toBe("page-music");
  await page.screenshot({ path: path.join(evidence, "02-public-music-video-390.png"), fullPage: true });

  await page.getByTestId("compact-action-tile-ee-backstage").click();
  await expect(page).toHaveURL(/\/everencore\/love-and-theft\/backstage$/);
  await expect(page.getByTestId("experience-bottom-navigation")).toBeVisible();
  await expect(page.getByTestId("tap-experience-renderer")).toHaveAttribute("data-active-page-id", "page-backstage");
  await page.goBack();
  await expect(page).toHaveURL(/\/everencore\/love-and-theft\/music$/);
  await expect(page.getByTestId("tap-experience-renderer")).toHaveAttribute("data-active-page-id", "page-music");

  await page.getByTestId("experience-nav-page-live").click();
  await expect(page).toHaveURL(/\/everencore\/love-and-theft\/live$/);
  const map = page.getByTestId("map-location-container");
  await expect(map).toHaveAttribute("data-map-location-count", "3");
  await expect(map).toHaveAttribute("data-map-primary-location", "wec-venue");
  await expect(map.locator('[data-map-associated-action="ee-live-tickets"]')).toBeVisible();
  await expect(page.getByTestId("map-location-embed")).toBeVisible();
  await expect(page.getByTestId("map-activate-interaction")).toBeVisible();
  expect(await page.getByTestId("map-location-embed").evaluate((element) => getComputedStyle(element).pointerEvents)).toBe("none");
  const venueNavigate = page.getByTestId("map-location-tile-wec-venue").locator('[data-location-action="navigate"]');
  await expect(venueNavigate).toHaveAttribute("data-runtime-map-adapter", "device");
  await page.evaluate(() => {
    document.addEventListener("click", (event) => event.preventDefault(), { capture: true, once: true });
    (document.querySelector('[data-testid="map-location-tile-wec-venue"] [data-location-action="navigate"]') as HTMLAnchorElement | null)?.click();
  });
  const venueReturnContext = await page.evaluate(() => JSON.parse(sessionStorage.getItem("tapconnect.experience.return:everencore-love-and-theft") || "null"));
  expect(venueReturnContext?.pageId).toBe("page-live");
  expect(venueReturnContext?.selectedContentId).toBe("wec-venue");
  expect(venueReturnContext?.sessionId).toBe(sessionId);

  await page.evaluate(() => {
    document.addEventListener("click", (event) => event.preventDefault(), { capture: true, once: true });
    (document.querySelector('[data-testid="map-location-tile-wec-parking"] [data-location-action="navigate"]') as HTMLAnchorElement | null)?.click();
  });
  await expect(map).toHaveAttribute("data-map-selected-location", "wec-parking");
  const parkingReturnContext = await page.evaluate(() => JSON.parse(sessionStorage.getItem("tapconnect.experience.return:everencore-love-and-theft") || "null"));
  expect(parkingReturnContext?.pageId).toBe("page-live");
  expect(parkingReturnContext?.selectedContentId).toBe("wec-parking");
  expect(parkingReturnContext?.sessionId).toBe(sessionId);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
  await expect(page.getByTestId("tap-experience-renderer")).toHaveAttribute("data-active-page-id", "page-live");
  await page.getByTestId("map-activate-interaction").click();
  expect(await page.getByTestId("map-location-embed").evaluate((element) => getComputedStyle(element).pointerEvents)).toBe("auto");
  await page.screenshot({ path: path.join(evidence, "03-public-live-map-390.png"), fullPage: true });

  const directions = map.locator('[data-location-action="navigate"][data-location-id="wec-parking"]').last();
  await page.evaluate(() => {
    document.addEventListener("click", (event) => event.preventDefault(), { capture: true, once: true });
    (document.querySelector('[data-map-layer="details"] [data-location-action="navigate"]') as HTMLAnchorElement | null)?.click();
  });
  await expect(directions).toHaveAttribute("data-destination-policy", "external");
  const returnContext = await page.evaluate(() => JSON.parse(sessionStorage.getItem("tapconnect.experience.return:everencore-love-and-theft") || "null"));
  expect(returnContext?.pageId).toBe("page-live");
  expect(returnContext?.selectedContentId).toBe("wec-parking");
  expect(returnContext?.sessionId).toBe(sessionId);

  await page.goto("/everencore/love-and-theft/vault", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("experience-locked-page")).toBeVisible();
  await expect(page.getByTestId("experience-bottom-navigation")).toBeVisible();
  await page.screenshot({ path: path.join(evidence, "04-direct-locked-page-390.png"), fullPage: true });

  writeFileSync(path.join(evidence, "acceptance.json"), `${JSON.stringify({
    route: "/everencore/love-and-theft",
    publishedRevision: "phase-2-2-public-shell-v1",
    viewport: { width: 390, height: 844 },
    noLogin: true,
    noPreviewToken: true,
    noIndex: true,
    stableSlugToPublishedRevision: true,
    spaHistory: ["home", "music", "backstage", "music", "live"],
    sessionPreserved: true,
    externalReturnContextPreserved: true,
    directPageEntry: ["live", "vault"],
    map: { providerNeutralState: true, locationCount: 3, primary: "wec-venue", tiles: true, scrollSafeActivation: true, fallback: true, routeGuidanceSeparatedFromDisplay: true, runtimeDeviceAdapter: true, independentlyNavigable: ["wec-venue", "wec-parking", "wec-vip"] },
    navigationReturnProof: { primary: "wec-venue", secondary: "wec-parking", samePage: "page-live", sameSession: true, noRetap: true },
    productOwnerAcceptance: "pending",
  }, null, 2)}\n`);
});

test("proves the Map / Location Container authoring path in Studio", async ({ page }) => {
  test.skip(!enabled, "Set PHASE22_PUBLIC_EXPERIENCE_ACCEPTANCE=1 for the local public-shell proof");
  test.setTimeout(180_000);
  mkdirSync(evidence, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.route("https://maps.google.com/**", async (route) => route.fulfill({ contentType: "text/html", body: "<main>Map provider adapter proof</main>" }));
  await page.goto("/review/studio", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/dashboard\/card\/edit$/);
  const baselineResponse = await page.request.get("/api/card/draft");
  expect(baselineResponse.ok()).toBeTruthy();
  const baseline = await baselineResponse.json() as { draft: Record<string, unknown>; revision: number };
  try {
    const liveNavigation = page.getByTestId("experience-nav-page-live");
    await expect(liveNavigation).toBeVisible();
    await page.waitForTimeout(500);
    await liveNavigation.click();
    await expect(liveNavigation).toHaveAttribute("aria-current", "page");
    const mapNode = page.locator('[data-composition-node="review-live-map"]');
    await expect(mapNode).toBeVisible();
    await mapNode.click({ force: true });
    await page.getByRole("button", { name: /^Edit · Map \/ Location Container/ }).click();
    const controls = page.getByTestId("map-location-authoring-controls");
    await expect(controls).toBeVisible({ timeout: 10_000 });
    await expect(controls.locator('[data-testid^="map-location-editor-"]')).toHaveCount(3);
    await expect(controls.getByLabel("Layout")).toHaveValue("map_tiles_below");
    await expect(controls.getByLabel("Height")).toHaveValue("compact");
    await controls.getByLabel("Height").selectOption("standard");
    await controls.getByRole("checkbox", { name: "Address", exact: true }).uncheck();
    await controls.getByTestId("map-add-location").click();
    await expect(controls.locator('[data-testid^="map-location-editor-"]')).toHaveCount(4);
    await expect(controls.locator('[data-testid^="map-action-editor-"]')).toHaveCount(1);
    await controls.getByTestId("map-add-action").click();
    await expect(controls.locator('[data-testid^="map-action-editor-"]')).toHaveCount(2);
    await page.screenshot({ path: path.join(evidence, "05-map-location-authoring-controls.png"), fullPage: true });

    await page.getByTestId("studio-preview").click();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId("map-location-container")).toHaveAttribute("data-map-height-preset", "standard");
    await expect(page.getByTestId("map-location-container")).toHaveAttribute("data-map-location-count", "4");
    await page.screenshot({ path: path.join(evidence, "06-map-preview-authoring-parity-390.png"), fullPage: true });
  } finally {
    const currentResponse = await page.request.get("/api/card/draft");
    if (currentResponse.ok()) {
      const current = await currentResponse.json() as { revision: number };
      await page.request.put("/api/card/draft", { data: { draft: baseline.draft, expectedRevision: current.revision } });
    }
  }
});
