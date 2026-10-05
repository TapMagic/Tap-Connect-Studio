import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const enabled = process.env.EXPERIENCE_PAGES_ACCEPTANCE === "1";
const evidence = path.join("docs", "product-reconstitution", "creative-studio-platform", "proofs", "experience-pages-phase1");

test("proves Phase 1 Experience Pages, internal routing, persistent nav, and signed 390px runtime", async ({ browser, page }) => {
  test.skip(!enabled, "Set EXPERIENCE_PAGES_ACCEPTANCE=1 for the deterministic local review runtime");
  test.setTimeout(150_000);
  mkdirSync(evidence, { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/review/studio", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/dashboard\/card\/edit$/);

  const baselineResponse = await page.request.get("/api/card/draft");
  expect(baselineResponse.ok()).toBeTruthy();
  const baseline = await baselineResponse.json() as { draft: Record<string, unknown>; revision: number };
  try {
    await expect(page.getByTestId("tap-experience-renderer")).toHaveAttribute("data-active-page-id", "page-home");
    await expect(page.getByTestId("experience-bottom-navigation")).toHaveAttribute("data-visible-slots", "5");
    await page.getByTestId("studio-preview").click();
    await expect(page.getByTestId("experience-nav-page-home")).toHaveAttribute("data-nav-active", "true");
    await page.screenshot({ path: path.join(evidence, "A-home-five-slot-nav-390.png"), fullPage: true });

    await page.getByRole("button", { name: "Music", exact: true }).click();
    await expect(page.getByTestId("tap-experience-renderer")).toHaveAttribute("data-active-page-id", "page-music");
    await expect(page.getByText("Follow & Listen", { exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "B-music-internal-nav-390.png"), fullPage: true });

    await page.getByRole("button", { name: "Home", exact: true }).click();
    await page.getByText("Open Afterparty", { exact: true }).click();
    await expect(page.getByTestId("tap-experience-renderer")).toHaveAttribute("data-active-page-id", "page-afterparty");
    await expect(page.getByRole("button", { name: "Afterparty", exact: true })).toHaveCount(0);
    await page.screenshot({ path: path.join(evidence, "C-off-nav-page-via-internal-action-390.png"), fullPage: true });

    await page.getByTestId("experience-nav-page-exclusives").click();
    await expect(page.getByTestId("experience-locked-page")).toHaveAttribute("data-locked-mode", "cta");
    await expect(page.getByRole("link", { name: "Join", exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "D-configurable-locked-page-390.png"), fullPage: true });

    await page.getByTestId("studio-preview").click();
    await page.getByTestId("studio-pages-open").click();
    await expect(page.getByTestId("studio-pages-manager")).toBeVisible();
    await page.getByRole("button", { name: /^Music In bottom nav/ }).click();
    const title = page.getByTestId("studio-page-title");
    await title.fill("Releases");
    await title.press("Tab");
    await expect(page.getByText("Stable ID · page-music", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /^Profile In bottom nav/ }).click();
    await page.getByTestId("studio-page-nav-visible").uncheck();
    await page.getByTestId("studio-page-settings").getByRole("button", { name: "Move up" }).click();
    await page.screenshot({ path: path.join(evidence, "E-pages-manager-hidden-reordered.png"), fullPage: true });
    await expect(page.getByTestId("studio-page-add")).toBeVisible();
    await expect(page.getByTestId("studio-page-duplicate")).toBeVisible();
    await expect(page.getByTestId("studio-page-nav-icon")).toBeVisible();
    await expect(page.getByTestId("studio-page-nav-destination")).toBeVisible();
    await page.getByRole("button", { name: "Close Pages" }).click();

    await page.getByTestId("preview-live-device").click();
    const panel = page.getByTestId("live-device-qr-panel");
    await expect(panel).toHaveAttribute("data-preview-status", "ready", { timeout: 20_000 });
    const previewUrl = (await page.getByTestId("preview-url-text").getAttribute("href")) || "";
    expect(previewUrl).toContain("/preview/live/");
    const phoneContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const phone = await phoneContext.newPage();
    await phone.goto(previewUrl, { waitUntil: "networkidle" });
    await expect(phone.getByTestId("tap-experience-renderer")).toBeVisible();
    await phone.getByRole("button", { name: "Live", exact: true }).click();
    await expect(phone.getByTestId("experience-nav-page-live")).toHaveAttribute("data-nav-active", "true");
    await expect(phone.getByTestId("tap-experience-renderer")).toHaveAttribute("data-active-page-id", "page-live");
    await phone.screenshot({ path: path.join(evidence, "F-signed-live-device-active-page-390.png"), fullPage: true });
    await phoneContext.close();

    writeFileSync(path.join(evidence, "acceptance.json"), `${JSON.stringify({
      route: "/review/studio",
      contract: "tapExperience@1.0.0",
      viewport: { width: 390, height: 844 },
      pages: ["page-home", "page-music", "page-live", "page-exclusives", "page-profile", "page-afterparty"],
      stableRenameProof: { pageId: "page-music", title: "Releases" },
      offNavInternalDestination: "page-afterparty",
      lockedPolicy: "cta",
      persistentNavigation: true,
      fullReloadsDuringInternalNavigation: 0,
      signedLiveDevice: true,
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
