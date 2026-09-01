import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const enabled = process.env.STUDIO_SLICE2_ADD_DISCOVER_ACCEPTANCE === "1";
const evidence = path.join(
  "docs",
  "product-reconstitution",
  "creative-studio-platform",
  "proofs",
  "studio-slice2-add-discover",
);

test("completes Choose → Browse → Place → Select → Refine across the real Slice 2 catalog", async ({ page }) => {
  test.skip(!enabled, "Set STUDIO_SLICE2_ADD_DISCOVER_ACCEPTANCE=1 for the isolated Rich review runtime");
  test.setTimeout(180_000);
  page.setDefaultTimeout(10_000);
  mkdirSync(evidence, { recursive: true });

  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/review/studio", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/dashboard\/card\/edit$/);
  const shell = page.getByTestId("studio-reconstitution-shell");
  await expect(shell).toHaveAttribute("data-session-restored", "true");

  const baselineResponse = await page.request.get("/api/card/draft");
  expect(baselineResponse.ok()).toBeTruthy();
  const baseline = await baselineResponse.json() as { draft: Record<string, unknown>; revision: number };

  const openAdd = async () => {
    await page.getByTestId("studio-rail-add").click();
    await expect(page.getByTestId("studio-add-home")).toBeVisible();
  };
  const closeCompositionInspector = async () => {
    const inspector = page.getByTestId("studio-composition-inspector");
    if (await inspector.isVisible().catch(() => false)) {
      await inspector.getByRole("button", { name: "Close Inspector", exact: true }).click();
    }
  };

  try {
    await openAdd();
    await expect(page.getByTestId("studio-add-category-grid").locator("button")).toHaveCount(6);
    for (const category of ["text", "image", "buttons", "divider", "container", "curated"]) {
      await expect(page.getByTestId(`studio-add-${category}`)).toBeVisible();
    }
    await expect(page.getByText("Arc Ember", { exact: true })).toHaveCount(0);
    await page.screenshot({ path: path.join(evidence, "01-desktop-add-categories.png") });

    const initialModules = await page.locator('[data-parent-authority="flow-v1"] [data-composition-kind="module"]').count();
    await page.getByTestId("studio-add-text").click();
    await expect(page.getByTestId("studio-add-resource-text-basic")).toBeVisible();
    await page.getByTestId("studio-add-resource-text-basic").click();
    await expect(page.getByTestId("studio-discovery-drawer")).toHaveCount(0);
    await expect(page.getByTestId("studio-composition-inspector")).toBeVisible();
    await expect(page.locator('[data-parent-authority="flow-v1"] [data-composition-kind="module"]')).toHaveCount(initialModules + 1);
    await page.getByTestId("studio-text-content").fill("A Slice 2 authoring doorway that stays simple on the surface.");
    await closeCompositionInspector();

    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(page.locator('[data-parent-authority="flow-v1"] [data-composition-kind="module"]')).toHaveCount(initialModules);
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await expect(page.locator('[data-parent-authority="flow-v1"] [data-composition-kind="module"]')).toHaveCount(initialModules + 1);

    await openAdd();
    await page.getByTestId("studio-add-container").click();
    await expect(page.getByTestId("studio-container-treatment-gallery")).toBeVisible();
    await page.getByTestId("studio-add-container-smoked_glass").click();
    const selectedContainer = page.locator('[data-composition-kind="container"][data-selected="true"]');
    await expect(selectedContainer).toBeVisible();
    const containerId = await selectedContainer.getAttribute("data-composition-node");
    expect(containerId).toBeTruthy();
    await closeCompositionInspector();

    await openAdd();
    await expect(page.getByTestId("studio-add-target")).toContainText("Smoked Glass Container");
    await page.getByTestId("studio-add-image").click();
    await page.getByTestId("studio-choose-image-asset").click();
    await expect(page.getByTestId("shared-media-browser")).toHaveAttribute("data-catalog-adapter", "canonical-assets");
    const asset = page.getByTestId("media-browser-result").first();
    await expect(asset).toBeVisible();
    await asset.click();
    await page.getByTestId("media-browser-insert").click();
    await expect(page.getByTestId("shared-media-browser")).toHaveCount(0);
    const selectedImage = page.locator('[data-composition-kind="module"][data-selected="true"]');
    await expect(selectedImage).toHaveAttribute("data-parent-id", containerId!);
    await closeCompositionInspector();

    await openAdd();
    await page.getByTestId("studio-add-buttons").click();
    await page.getByTestId("studio-button-family-standard").click();
    await page.locator('[data-testid^="standard-button-preset-"]').first().click();
    await expect(page.getByTestId("studio-button-inspector")).toBeVisible();
    await expect(page.locator('[data-composition-kind="module"][data-selected="true"]')).toHaveAttribute("data-parent-id", containerId!);
    await expect(page.locator('[data-composition-kind="module"][data-selected="true"] [data-testid^="studio-canvas-handle-"]')).toBeVisible();
    await page.getByRole("button", { name: "Close Button Inspector" }).click();

    await openAdd();
    await page.getByTestId("studio-add-divider").click();
    await page.getByTestId("studio-add-resource-divider-standard").click();
    await expect(page.getByTestId("studio-composition-inspector")).toBeVisible();
    await expect(page.locator('[data-composition-kind="module"][data-selected="true"]')).toHaveAttribute("data-parent-id", containerId!);
    await closeCompositionInspector();

    // A root sibling selection deliberately changes the placement context back
    // to Card Surface before placing the governed Curated object.
    await page.getByRole("button", { name: "Welcome text Module", exact: true }).click();
    await openAdd();
    await expect(page.getByTestId("studio-add-target")).toContainText("Card Surface");
    await page.getByTestId("studio-add-curated").click();
    await expect(page.getByTestId("studio-curated-catalog")).toBeVisible();
    await page.getByTestId("studio-button-family-cabinet-noir").click();
    const twinRail = page.locator('button[data-testid^="studio-governed-resource-"]').filter({ hasText: "Twin Rail" });
    await expect(twinRail).toHaveCount(1);
    await twinRail.click();
    await expect(page.getByTestId("studio-curated-object-toolbar")).toBeVisible();
    await expect(page.getByTestId("studio-assembly-inspector")).toHaveCount(0);
    await expect(page.getByTestId("studio-curated-selection-identity")).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "02-finished-curated-placement.png") });

    await page.getByTestId("studio-curated-selection-identity").click();
    await expect(page.getByTestId("studio-assembly-inspector")).toBeVisible();
    await page.getByRole("button", { name: "Close authoring panel" }).click();
    await openAdd();
    await expect(page.getByTestId("studio-add-home")).toBeVisible();
    await page.getByTestId("studio-drawer-close").click();
    await expect(page.getByTestId("studio-curated-object-toolbar")).toBeVisible();

    await page.getByTestId("studio-preview").click();
    await expect(page.getByTestId("studio-editor-rail")).toHaveCount(0);
    await page.getByTestId("studio-preview").click();
    await expect(page.getByTestId("studio-editor-rail")).toBeVisible();
    await page.getByTestId("preview-live-device").click();
    await expect(page.getByTestId("studio-live-device-panel")).toBeVisible();
    await page.getByRole("button", { name: "Close Live Device Preview" }).click();
    await expect(page.getByTestId("studio-live-device-panel")).not.toBeVisible();

    const save = page.getByRole("button", { name: "Save", exact: true });
    if (await save.isEnabled()) await save.click();
    await expect(save).toBeDisabled();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("studio-discovery-drawer")).toHaveCount(0);
    await expect(shell).toHaveAttribute("data-workspace-task", "compose-card");
    await expect(page.locator(`[data-composition-node="${containerId}"]`)).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByTestId("studio-phone-toolbar").getByText("Add", { exact: true }).click();
    await expect(page.getByTestId("studio-add-home")).toBeVisible();
    await page.getByTestId("studio-add-divider").click();
    await page.getByTestId("studio-add-resource-divider-standard").click();
    await expect(page.getByTestId("studio-composition-inspector")).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "03-phone-place-and-refine.png") });

    writeFileSync(path.join(evidence, "acceptance.json"), `${JSON.stringify({
      contract: "studioAddDiscover@1.0.0",
      catalog: "studioCatalogBrowser@1.0.0",
      categories: ["Text", "Image", "Buttons", "Divider", "Container", "Curated"],
      canonicalParentage: true,
      deterministicReviewEntry: "/review/studio",
      emberActive: false,
      productOwnerAcceptance: "pending",
    }, null, 2)}\n`);
  } finally {
    const current = await page.request.get("/api/card/draft");
    if (current.ok()) {
      const state = await current.json() as { revision: number };
      const restored = await page.request.put("/api/card/draft", { data: { draft: baseline.draft, expectedRevision: state.revision } });
      expect(restored.ok()).toBeTruthy();
    }
  }
});
