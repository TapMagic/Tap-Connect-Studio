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
    siblingOrder: id.endsWith("top") ? 1 : 2,
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
  const top = createCompactActionGrid({
    componentId: "stay-connected-top-grid",
    analyticsId: "proof:stay-connected:top",
    presentation: "everencore-love-and-theft-pick",
    columns: 3,
    tileSizePx: 96,
    widthMode: "fit_content",
    gridAlignment: "center",
    columnGapPx: 12,
    tiles: [
      tile("stay-spotify", "Spotify", "simple-icons:spotify"),
      tile("stay-instagram", "Instagram", "simple-icons:instagram"),
      tile("stay-facebook", "Facebook", "simple-icons:facebook"),
    ],
  });
  const bottom = createCompactActionGrid({
    componentId: "stay-connected-bottom-grid",
    analyticsId: "proof:stay-connected:bottom",
    presentation: "everencore-love-and-theft-pick",
    columns: 3,
    tileSizePx: 96,
    widthMode: "full",
    gridAlignment: "left",
    columnGapPx: 12,
    tiles: [
      tile("stay-bandsintown", "Bandsintown", "simple-icons:bandsintown"),
      tile("stay-call", "Call", "lucide:phone"),
    ],
  });
  const topWidth = compactActionGridLayoutMetrics(top).contentWidthPx / (390 - 24);
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
      gridNode("stay-connected-grid-top", "Stay Connected · top row", top, .16, topWidth, (1 - topWidth) / 2),
      gridNode("stay-connected-grid-bottom", "Stay Connected · bottom row", bottom, .48, .94, .03),
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

test("builds a fixed-size centered 3-over-2 Compact Action Grid composition", async ({ page }) => {
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

    const topGrid = page.locator('[data-compact-action-component-id="stay-connected-top-grid"]');
    const bottomGrid = page.locator('[data-compact-action-component-id="stay-connected-bottom-grid"]');
    await expect(topGrid).toBeVisible();
    await expect(bottomGrid).toBeVisible();

    const inspector = await openGridInspector(page, "stay-connected-bottom-grid");
    await inspector.getByRole("button", { name: "2", exact: true }).click();
    await inspector.getByTestId("compact-grid-tile-size").fill("96");
    await inspector.getByTestId("compact-grid-tile-size").press("Enter");
    await inspector.getByTestId("compact-grid-width-fit_content").click();
    await inspector.getByTestId("compact-grid-align-center").click();

    await expect(bottomGrid).toHaveAttribute("data-compact-action-columns", "2");
    await expect(bottomGrid).toHaveAttribute("data-compact-action-occupied-columns", "2");
    await expect(bottomGrid).toHaveAttribute("data-compact-action-width-mode", "fit_content");
    await expect(topGrid).toHaveAttribute("data-compact-action-tile-size", "96");
    await expect(bottomGrid).toHaveAttribute("data-compact-action-tile-size", "96");

    const topPick = await box(topGrid.locator('[data-love-and-theft-pick="true"]').first());
    const bottomPick = await box(bottomGrid.locator('[data-love-and-theft-pick="true"]').first());
    expect(Math.abs(topPick.width - bottomPick.width)).toBeLessThan(1);
    expect(Math.abs(topPick.width - 96)).toBeLessThan(1);
    const topBox = await box(topGrid);
    const bottomBox = await box(bottomGrid);
    expect(Math.abs(topBox.width - 312)).toBeLessThan(2);
    expect(Math.abs(bottomBox.width - 204)).toBeLessThan(2);
    expect(Math.abs((topBox.x + topBox.width / 2) - (bottomBox.x + bottomBox.width / 2))).toBeLessThan(2);

    const bottomModule = page.locator('[data-composition-node="stay-connected-grid-bottom"]');
    const selectedBox = await box(bottomModule);
    expect(Math.abs(selectedBox.width - bottomBox.width)).toBeLessThan(2);
    await page.screenshot({ path: path.join(proofRoot, "01-stay-connected-3-over-2-edit.png"), fullPage: true });

    await inspector.getByTestId("compact-grid-width-custom").click();
    const customBefore = await box(bottomModule);
    const customPickBefore = await box(bottomGrid.locator('[data-love-and-theft-pick="true"]').first());
    const resizeHandle = page.getByTestId("studio-layer-resize-stay-connected-grid-bottom-e");
    const resizeBox = await box(resizeHandle);
    await page.mouse.move(resizeBox.x + resizeBox.width / 2, resizeBox.y + resizeBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(resizeBox.x + resizeBox.width / 2 + 24, resizeBox.y + resizeBox.height / 2, { steps: 4 });
    await page.mouse.up();
    expect((await box(bottomModule)).width).toBeGreaterThan(customBefore.width + 10);
    expect(Math.abs((await box(bottomGrid.locator('[data-love-and-theft-pick="true"]').first())).width - customPickBefore.width)).toBeLessThan(1);
    await inspector.getByTestId("compact-grid-width-fit_content").click();
    await inspector.getByTestId("compact-grid-align-center").click();

    const beforeX = Number(await bottomModule.getAttribute("data-layer-x"));
    const moveHandle = page.getByTestId("studio-canvas-handle-stay-connected-grid-bottom");
    const handleBox = await box(moveHandle);
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + handleBox.width / 2 + 18, handleBox.y + handleBox.height / 2, { steps: 4 });
    await page.mouse.up();
    const movedX = Number(await bottomModule.getAttribute("data-layer-x"));
    expect(Math.abs(movedX - beforeX)).toBeGreaterThan(.01);

    await inspector.getByTestId("compact-grid-align-center").click();
    if (await page.getByTestId("studio-save").isEnabled()) await page.getByTestId("studio-save").click();
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator('[data-compact-action-component-id="stay-connected-bottom-grid"]')).toHaveAttribute("data-compact-action-width-mode", "fit_content");
    await expect(page.locator('[data-compact-action-component-id="stay-connected-bottom-grid"]')).toHaveAttribute("data-compact-action-tile-size", "96");

    await page.getByTestId("studio-preview").click();
    await page.setViewportSize({ width: 390, height: 844 });
    const previewTop = page.locator('[data-compact-action-component-id="stay-connected-top-grid"]');
    const previewBottom = page.locator('[data-compact-action-component-id="stay-connected-bottom-grid"]');
    const previewTopBox = await box(previewTop);
    const previewBottomBox = await box(previewBottom);
    expect(Math.abs((previewTopBox.x + previewTopBox.width / 2) - (previewBottomBox.x + previewBottomBox.width / 2))).toBeLessThan(2);
    expect(Math.abs((await box(previewTop.locator('[data-love-and-theft-pick="true"]').first())).width - (await box(previewBottom.locator('[data-love-and-theft-pick="true"]').first())).width)).toBeLessThan(1);
    await page.screenshot({ path: path.join(proofRoot, "02-stay-connected-3-over-2-preview-390.png"), fullPage: true });
  } finally {
    const currentResponse = await page.request.get("/api/card/draft");
    if (currentResponse.ok()) {
      const current = await currentResponse.json() as { revision: number };
      await page.request.put("/api/card/draft", { data: { draft: baseline.draft, expectedRevision: current.revision } });
    }
  }
});
