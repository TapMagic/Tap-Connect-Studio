import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const enabled = process.env.STUDIO_COMPOSITION_FOUNDATION_ACCEPTANCE === "1";
const evidence = path.join("docs", "product-reconstitution", "creative-studio-platform", "proofs", "studio-composition-foundation-pass");

test("proves unobscured chrome, edge layouts, bounded layers, Media, direct Text, and rich Standard Buttons", async ({ page }) => {
  test.skip(!enabled, "Set STUDIO_COMPOSITION_FOUNDATION_ACCEPTANCE=1 for the isolated Rich review runtime");
  test.setTimeout(240_000);
  page.setDefaultTimeout(12_000);
  mkdirSync(evidence, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/review/studio", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/dashboard\/card\/edit$/);
  const baselineResponse = await page.request.get("/api/card/draft");
  expect(baselineResponse.ok()).toBeTruthy();
  const baseline = await baselineResponse.json() as { draft: Record<string, unknown> };

  const openAdd = async () => {
    await page.getByTestId("studio-rail-add").click();
    await expect(page.getByTestId("studio-add-home")).toBeVisible();
  };
  const closeCompositionInspector = async () => {
    const inspector = page.getByTestId("studio-composition-inspector");
    if (await inspector.isVisible().catch(() => false)) await inspector.getByRole("button", { name: "Close Inspector" }).click();
  };

  try {
    const toolbarBox = await page.getByTestId("card-view-toolbar-compact").boundingBox();
    const cardBox = await page.getByTestId("card-preview-phone").boundingBox();
    expect(toolbarBox && cardBox && toolbarBox.y + toolbarBox.height <= cardBox.y).toBeTruthy();
    await expect(page.getByTestId("card-view-toolbar-compact")).toHaveAttribute("data-chrome-placement", "workspace-edge");

    const existingText = page.locator('[data-parent-authority="flow-v1"] [data-composition-kind="module"][data-primitive="text"]').first();
    await existingText.click();
    const textId = await existingText.getAttribute("data-composition-node");
    expect(textId).toBeTruthy();
    await expect(page.getByTestId(`studio-edit-text-${textId}`)).toBeVisible();
    await page.getByTestId(`studio-edit-text-${textId}`).click();
    await expect(existingText.locator('[data-testid^="composition-inline-text-"]')).toHaveAttribute("data-inline-editing", "true");
    await page.keyboard.press("Escape");

    await page.getByTestId("creative-composition-canvas").first().click({ position: { x: 4, y: 4 } });
    await page.getByRole("button", { name: "Refine surface" }).click();
    await expect(page.getByTestId("studio-card-composition-mode")).toBeVisible();
    await page.getByTestId("studio-card-composition-mode").getByRole("button", { name: "Layered" }).click();
    await expect(page.locator('[data-card-surface-layered="true"]')).toBeVisible();
    await page.getByTestId("studio-card-composition-mode").getByRole("button", { name: "Flow" }).click();
    await expect(page.locator('[data-card-surface-layered="true"]')).toHaveCount(0);
    await expect(page.getByTestId("studio-card-edge-controls")).toBeVisible();
    await page.getByTestId("studio-card-edge-controls").getByRole("button", { name: "Inset" }).click();
    await expect(page.getByTestId("composition-background-renderer").first()).toHaveAttribute("data-edge-mode", "inset");
    await page.getByTestId("studio-card-surface-inspector").getByRole("button", { name: "Close Inspector" }).click();

    await openAdd();
    await page.getByTestId("studio-add-container").click();
    await page.getByTestId("studio-add-container-smoked_glass").click();
    const selectedContainer = page.locator('[data-composition-kind="container"][data-selected="true"]');
    const containerId = await selectedContainer.getAttribute("data-composition-node");
    expect(containerId).toBeTruthy();
    await page.getByTestId("studio-container-edge-mode").getByRole("button", { name: "Full bleed" }).click();
    await page.getByTestId("studio-container-layout-mode").getByRole("button", { name: /layered/i }).click();
    await expect(selectedContainer).toHaveAttribute("data-layered-container", "true");
    await closeCompositionInspector();

    await openAdd();
    await expect(page.getByTestId("studio-add-target")).toContainText("Smoked Glass Container");
    await page.getByTestId("studio-add-image").click();
    await expect(page.getByText("Image and Video", { exact: true })).toBeVisible();
    await page.getByTestId("studio-add-video-module").click();
    const videoNode = page.locator('[data-composition-kind="module"][data-primitive="video"][data-selected="true"]');
    await expect(videoNode).toHaveAttribute("data-parent-id", containerId!);
    await page.getByTestId("studio-video-controls").getByLabel("Hosted, YouTube, or provider URL").fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    await page.getByTestId("studio-video-controls").getByRole("button", { name: /autoplay muted/i }).click();
    await expect(videoNode.locator('[data-video-provider="youtube"]')).toHaveAttribute("data-video-playback", "autoplay_muted");
    await expect(videoNode.getByTestId(/studio-layer-resize-/)).toBeVisible();
    await closeCompositionInspector();

    await openAdd();
    await page.getByTestId("studio-add-text").click();
    await page.getByTestId("studio-add-resource-text-heading").click();
    const layeredText = page.locator('[data-composition-kind="module"][data-primitive="text"][data-selected="true"]');
    await expect(layeredText).toHaveAttribute("data-local-layer", "true");
    await closeCompositionInspector();
    await page.locator(`[data-composition-node="${containerId}"]`).scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(evidence, "01-layered-media-and-edge.png") });

    await openAdd();
    await page.getByTestId("studio-add-buttons").click();
    await expect(page.getByTestId("studio-button-family-cabinet-noir")).toBeVisible();
    await expect(page.getByTestId("studio-button-family-saved")).toHaveCount(0);
    await page.getByTestId("studio-button-family-standard").click();
    await expect(page.getByTestId("studio-standard-group-2d")).toBeVisible();
    await expect(page.getByTestId("studio-standard-group-dimensional")).toBeVisible();
    await expect(page.getByTestId("studio-standard-group-glass")).toBeVisible();
    await expect(page.getByTestId("studio-standard-group-metal")).toBeVisible();
    await page.getByTestId("standard-button-preset-black-chrome").click();
    const selectedButton = page.locator('[data-composition-kind="module"][data-primitive="button"][data-selected="true"]');
    await expect(selectedButton.locator('[data-standard-button="standardButtonAppearance@1.0.0"]')).toHaveAttribute("data-standard-button-depth", "standard");
    await page.getByTestId("studio-inspector-tab-appearance").click();
    await expect(page.getByTestId("studio-standard-button-presets")).toContainText("2D");
    await expect(page.getByTestId("studio-standard-button-presets")).toContainText("Dimensional");
    await expect(page.getByTestId("studio-standard-button-presets")).toContainText("Gloss & Glass");
    await expect(page.getByTestId("studio-standard-button-presets")).toContainText("Metal");
    await page.getByTestId("studio-standard-appearance-embossed-light").click();
    await expect(selectedButton.locator('[data-standard-button="standardButtonAppearance@1.0.0"]')).toHaveAttribute("data-material-preset", "embossed");
    await page.getByTestId("studio-standard-appearance-deep-raised").click();
    await expect(selectedButton.locator('[data-standard-button="standardButtonAppearance@1.0.0"]')).toHaveAttribute("data-standard-button-depth", "high");
    await page.screenshot({ path: path.join(evidence, "02-standard-button-appearance.png") });

    await page.getByTestId("studio-preview").click();
    await expect(page.getByTestId("studio-editor-rail")).toHaveCount(0);
    await expect(page.locator(`[data-composition-node="${containerId}"] [data-primitive="video"]`)).toBeVisible();
    await expect(page.locator('[data-standard-button="standardButtonAppearance@1.0.0"][data-standard-button-depth="high"]')).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "03-preview-parity.png") });
    await page.getByTestId("studio-preview").click();
    await page.getByRole("button", { name: "Close Button Inspector" }).click();
    await page.getByTestId("preview-live-device").click();
    await expect(page.getByTestId("studio-live-device-panel")).toBeVisible();
    await expect(page.getByTestId("live-device-qr-panel")).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "05-live-device-entry.png") });
    await page.getByRole("button", { name: "Close Live Device Preview" }).click();
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical")).toEqual([]);

    const save = page.getByTestId("studio-save");
    if (await save.isEnabled()) await save.click();
    await expect(save).toBeDisabled();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: "domcontentloaded" });
    const phoneCard = page.getByTestId("card-preview-phone");
    await expect(phoneCard).toBeVisible();
    const phoneCardBox = await phoneCard.boundingBox();
    expect(phoneCardBox && phoneCardBox.x >= -1 && phoneCardBox.x + phoneCardBox.width <= 391).toBeTruthy();
    await page.locator(`[data-composition-node="${containerId}"]`).scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(evidence, "04-phone-layered-composition.png") });
    writeFileSync(path.join(evidence, "acceptance.json"), `${JSON.stringify({ contract: "studioCompositionFoundation@1.0.0", rootLayout: "flow", boundedLayering: true, media: ["image", "video"], standardButtonMaterialAuthority: true, editPreviewPublicParity: true, productOwnerAcceptance: "pending" }, null, 2)}\n`);
  } finally {
    const current = await page.request.get("/api/card/draft");
    if (current.ok()) {
      const state = await current.json() as { revision: number };
      const restored = await page.request.put("/api/card/draft", { data: { draft: baseline.draft, expectedRevision: state.revision } });
      expect(restored.ok()).toBeTruthy();
    }
  }
});
