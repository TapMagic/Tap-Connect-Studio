import { expect, test, type Locator, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { TapConnectCardConfig } from "@/lib/brand/tap-card";
import { canonicalizeExperienceConfig, projectExperiencePage } from "@/lib/fusion/card/experience-pages";
import type { CreativeCompositionBlock, CreativeCompositionNode } from "@/lib/fusion/creative-studio/composition";
import {
  compactActionGridLayoutMetrics,
  compactActionGridNodeProps,
  createCompactActionGrid,
  createCompactActionTile,
  type CompactActionGridState,
} from "@/lib/fusion/creative-studio/platform/compact-action-grid";

const enabled = process.env.COMPACT_ACTION_GRID_SIZING_ACCEPTANCE === "1";
const proofRoot = path.join("docs", "product-reconstitution", "creative-studio-platform", "proofs", "compact-action-grid-sizing");

function gridNode(id: string, name: string, state: CompactActionGridState, y: number, width: number, x: number): CreativeCompositionNode {
  const metrics = compactActionGridLayoutMetrics(state);
  return {
    id,
    primitive: "button",
    compositionKind: "module",
    parentId: null,
    siblingOrder: 1,
    x,
    y,
    width,
    height: metrics.contentHeightPx / 620,
    zIndex: 2,
    name,
    visible: true,
    locked: false,
    anchor: "top-left",
    props: compactActionGridNodeProps(state),
  };
}

function stayConnectedRoot(previous: CreativeCompositionBlock): CreativeCompositionBlock {
  const tile = (componentId: string, label: string, iconAssetRef: string) => createCompactActionTile({
    componentId,
    actionId: `${componentId}-action`,
    analyticsId: `proof:${componentId}`,
    label,
    iconAssetRef,
    actionType: "website",
    destinationRef: "https://example.com/",
  });
  const grid = createCompactActionGrid({
    componentId: "stay-connected-grid",
    analyticsId: "proof:stay-connected",
    presentation: "everencore-love-and-theft-pick",
    columns: 4,
    tileSizing: "auto_fill",
    tileSizePx: 84,
    widthMode: "full",
    gridAlignment: "left",
    lastRowAlignment: "left",
    columnGapPx: 8,
    tiles: [
      tile("stay-spotify", "Spotify", "simple-icons:spotify"),
      tile("stay-apple", "Apple Music", "simple-icons:apple-music"),
      tile("stay-instagram", "Instagram", "simple-icons:instagram"),
      tile("stay-facebook", "Facebook", "simple-icons:facebook"),
      tile("stay-bandsintown", "Bandsintown", "simple-icons:bandsintown"),
      tile("stay-call", "Call", "lucide:phone"),
    ],
  });
  const heading: CreativeCompositionNode = {
    id: "stay-connected-heading", primitive: "text", compositionKind: "module", parentId: null, siblingOrder: 0,
    x: .08, y: .03, width: .84, height: .08, zIndex: 2, name: "Stay Connected heading", visible: true, locked: false,
    props: { componentKind: "text", elementKind: "text", text: "STAY CONNECTED", textRole: "heading", align: "center", color: "#fff2d0", fontSize: 24, fontWeight: 800 },
  };
  return {
    ...previous,
    id: "compact-grid-sizing-proof",
    label: "Stay Connected · Compact Action Grid sizing proof",
    nodes: [
      heading,
      gridNode("stay-connected-grid-node", "Stay Connected · 4 + 2 grid", grid, .16, .94, .03),
    ],
    parentAuthority: { version: 1, layout: "flow", cardGapPx: 12 },
    compositionMode: { version: 1, mode: "layered", layeredHeightPx: 620, layeredPlacementInitialized: true },
    pageHeightPx: 620,
  };
}

async function box(locator: Locator) {
  const result = await locator.boundingBox();
  if (!result) throw new Error("Expected a visible Compact Action Grid box.");
  return result;
}

async function openGridInspector(page: Page, componentId: string) {
  await page.locator(`[data-compact-action-component-id="${componentId}"]`).click({ force: true });
  const inspector = page.getByTestId("studio-compact-action-grid-inspector");
  if (!(await inspector.isVisible().catch(() => false))) await page.getByRole("button", { name: /^Edit ·/ }).click();
  await expect(inspector).toBeVisible();
  await inspector.getByRole("button", { name: "Grid", exact: true }).click();
  return inspector;
}

test("builds a fixed-size centered 4-over-2 composition in one Compact Action Grid", async ({ page }) => {
  test.skip(!enabled, "Set COMPACT_ACTION_GRID_SIZING_ACCEPTANCE=1 for the deterministic local acceptance fixture");
  test.setTimeout(150_000);
  mkdirSync(proofRoot, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/dashboard/card/edit", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/dashboard\/card\/edit$/);
  const baselineResponse = await page.request.get("/api/card/draft");
  expect(baselineResponse.ok()).toBeTruthy();
  const baseline = await baselineResponse.json() as { draft: TapConnectCardConfig; revision: number };
  const activePageId = baseline.draft.experience?.defaultPageId;
  const projected = projectExperiencePage(baseline.draft, activePageId);
  if (!projected.rootComposition) throw new Error("Review draft has no Card Surface composition.");
  const proofDraft = canonicalizeExperienceConfig({ ...projected, rootComposition: stayConnectedRoot(projected.rootComposition) }, activePageId);
  try {
    const seeded = await page.request.put("/api/card/draft", { data: { draft: proofDraft, expectedRevision: baseline.revision } });
    expect(seeded.ok()).toBeTruthy();
    await page.reload({ waitUntil: "networkidle" });

    const grid = page.locator('[data-compact-action-component-id="stay-connected-grid"]');
    await expect(grid).toBeVisible();

    const inspector = await openGridInspector(page, "stay-connected-grid");
    await inspector.getByTestId("compact-grid-columns-4").click();
    await inspector.getByTestId("compact-grid-tile-sizing-fixed").click();
    await inspector.getByTestId("compact-grid-tile-size").fill("100");
    await inspector.getByTestId("compact-grid-tile-size").press("Enter");
    await expect(inspector.getByTestId("compact-grid-fixed-overflow-warning")).toContainText("Tile size will be preserved");
    await inspector.getByTestId("compact-grid-tile-size").fill("84");
    await inspector.getByTestId("compact-grid-tile-size").press("Enter");
    await inspector.getByTestId("compact-grid-column-gap").fill("8");
    await inspector.getByTestId("compact-grid-column-gap").press("Enter");
    await expect(inspector.getByTestId("compact-grid-fixed-overflow-warning")).toHaveCount(0);
    await inspector.getByTestId("compact-grid-width-fit_content").click();
    await inspector.getByTestId("compact-grid-align-center").click();
    await inspector.getByTestId("compact-grid-last-row-center").click();

    await expect(grid).toHaveAttribute("data-compact-action-columns", "4");
    await expect(grid).toHaveAttribute("data-compact-action-track-columns", "4");
    await expect(grid).toHaveAttribute("data-compact-action-tile-sizing", "fixed");
    await expect(grid).toHaveAttribute("data-compact-action-last-row-alignment", "center");
    await expect(grid).toHaveAttribute("data-compact-action-width-mode", "fit_content");
    await expect(grid).toHaveAttribute("data-compact-action-tile-size", "84");

    const picks = grid.locator('[data-love-and-theft-pick="true"]');
    await expect(picks).toHaveCount(6);
    const pickBoxes = await Promise.all(Array.from({ length: 6 }, (_, index) => box(picks.nth(index))));
    expect(pickBoxes.every((pickBox) => Math.abs(pickBox.width - 84) < 1)).toBeTruthy();
    const gridBox = await box(grid);
    expect(Math.abs(gridBox.width - 360)).toBeLessThan(2);
    expect(Math.abs(pickBoxes[4]!.x - pickBoxes[1]!.x)).toBeLessThan(2);
    expect(Math.abs(pickBoxes[5]!.x - pickBoxes[2]!.x)).toBeLessThan(2);

    const gridModule = page.locator('[data-composition-node="stay-connected-grid-node"]');
    const selectedBox = await box(gridModule);
    expect(Math.abs(selectedBox.width - gridBox.width)).toBeLessThan(2);
    await page.screenshot({ path: path.join(proofRoot, "01-stay-connected-4-over-2-edit.png"), fullPage: true });

    await inspector.getByTestId("compact-grid-width-custom").click();
    await inspector.getByTestId("compact-grid-custom-width").fill("320");
    await inspector.getByTestId("compact-grid-custom-width").press("Enter");
    const customBefore = await box(gridModule);
    const customPickBefore = await box(grid.locator('[data-love-and-theft-pick="true"]').first());
    const resizeHandle = page.getByTestId("studio-layer-resize-stay-connected-grid-node-e");
    const resizeBox = await box(resizeHandle);
    await page.mouse.move(resizeBox.x + resizeBox.width / 2, resizeBox.y + resizeBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(resizeBox.x + resizeBox.width / 2 + 24, resizeBox.y + resizeBox.height / 2, { steps: 4 });
    await page.mouse.up();
    expect((await box(gridModule)).width).toBeGreaterThan(customBefore.width + 10);
    expect(Math.abs((await box(grid.locator('[data-love-and-theft-pick="true"]').first())).width - customPickBefore.width)).toBeLessThan(1);
    await inspector.getByTestId("compact-grid-width-fit_content").click();
    await inspector.getByTestId("compact-grid-align-center").click();

    const beforeX = Number(await gridModule.getAttribute("data-layer-x"));
    const moveHandle = page.getByTestId("studio-canvas-handle-stay-connected-grid-node");
    const handleBox = await box(moveHandle);
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + handleBox.width / 2 + 18, handleBox.y + handleBox.height / 2, { steps: 4 });
    await page.mouse.up();
    const movedX = Number(await gridModule.getAttribute("data-layer-x"));
    expect(Math.abs(movedX - beforeX)).toBeGreaterThan(.005);

    await inspector.getByTestId("compact-grid-align-center").click();
    if (await page.getByTestId("studio-save").isEnabled()) await page.getByTestId("studio-save").click();
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator('[data-compact-action-component-id="stay-connected-grid"]')).toHaveAttribute("data-compact-action-width-mode", "fit_content");
    await expect(page.locator('[data-compact-action-component-id="stay-connected-grid"]')).toHaveAttribute("data-compact-action-tile-sizing", "fixed");
    await expect(page.locator('[data-compact-action-component-id="stay-connected-grid"]')).toHaveAttribute("data-compact-action-tile-size", "84");
    await expect(page.locator('[data-compact-action-component-id="stay-connected-grid"]')).toHaveAttribute("data-compact-action-last-row-alignment", "center");

    await page.getByTestId("studio-preview").click();
    await page.setViewportSize({ width: 390, height: 844 });
    const previewGrid = page.locator('[data-compact-action-component-id="stay-connected-grid"]');
    const previewPicks = previewGrid.locator('[data-love-and-theft-pick="true"]');
    const previewBoxes = await Promise.all(Array.from({ length: 6 }, (_, index) => box(previewPicks.nth(index))));
    expect(previewBoxes.every((pickBox) => Math.abs(pickBox.width - 84) < 1)).toBeTruthy();
    expect(Math.abs(previewBoxes[4]!.x - previewBoxes[1]!.x)).toBeLessThan(2);
    expect(Math.abs(previewBoxes[5]!.x - previewBoxes[2]!.x)).toBeLessThan(2);
    await page.screenshot({ path: path.join(proofRoot, "02-stay-connected-4-over-2-preview-390.png"), fullPage: true });
  } finally {
    const currentResponse = await page.request.get("/api/card/draft");
    if (currentResponse.ok()) {
      const current = await currentResponse.json() as { revision: number };
      await page.request.put("/api/card/draft", { data: { draft: baseline.draft, expectedRevision: current.revision } });
    }
  }
});
