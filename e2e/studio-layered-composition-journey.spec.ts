import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { TapConnectCardConfig } from "@/lib/brand/tap-card";
import { canonicalizeExperienceConfig, projectExperiencePage } from "@/lib/fusion/card/experience-pages";
import type { CreativeCompositionBlock, CreativeCompositionGroup, CreativeCompositionNode } from "@/lib/fusion/creative-studio/composition";
import { compositionBackgroundFromMaterialRecipe, getMaterialRecipe } from "@/lib/fusion/creative-studio/material-engine";
import { setCardEdgeMode } from "@/lib/fusion/creative-studio/platform/edge-layout";
import {
  compileSignatureAuthoringState,
  createSignatureAssemblyAuthoringState,
  setSignatureAppearanceOption,
  setSignatureActionCount,
  updateSignatureAction,
} from "@/lib/fusion/creative-studio/signature-assets/authoring";
import { LOVE_AND_THEFT_APPEARANCE_OPTION_IDS } from "@/lib/fusion/creative-studio/signature-assets/everencore-love-and-theft-appearance";
import {
  EVERENCORE_LOVE_AND_THEFT_ASSEMBLY_RECIPES,
  EVERENCORE_LOVE_AND_THEFT_FAMILY_ID,
} from "@/lib/fusion/creative-studio/signature-assets/everencore-love-and-theft";

const enabled = process.env.STUDIO_LAYERED_COMPOSITION_ACCEPTANCE === "1";
const proofRoot = path.join("docs", "product-reconstitution", "creative-studio-platform", "proofs", "studio-layered-composition");

type ProjectedDraft = TapConnectCardConfig & { rootComposition: CreativeCompositionBlock };

function projectDraft(draft: TapConnectCardConfig): ProjectedDraft {
  const projected = projectExperiencePage(draft, draft.experience?.defaultPageId);
  if (!projected.rootComposition) throw new Error("Review draft has no canonical Card Surface composition.");
  return projected as ProjectedDraft;
}

function pageRoot(draft: TapConnectCardConfig): CreativeCompositionBlock {
  return projectDraft(draft).rootComposition;
}

function commitDraft(draft: ProjectedDraft): TapConnectCardConfig {
  return canonicalizeExperienceConfig(draft, draft.experience?.defaultPageId);
}

type PresentationId =
  | "everencore-love-and-theft-standard-left"
  | "everencore-love-and-theft-standard-right"
  | "everencore-love-and-theft-standard-utility"
  | "everencore-love-and-theft-standard-body"
  | "everencore-love-and-theft-twin-rail";

function compilePresentation(id: PresentationId, labels: readonly string[], treatment: string = LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.smokyBlack) {
  let sequence = 0;
  const created = createSignatureAssemblyAuthoringState(
    EVERENCORE_LOVE_AND_THEFT_FAMILY_ID,
    { presentationId: id },
    { idFactory: () => `${id}-${++sequence}` },
  );
  if (!created) throw new Error(`${id} is unavailable.`);
  let state = setSignatureAppearanceOption(setSignatureActionCount(created, labels.length, () => `${id}-${++sequence}`), "text-bar-surface", treatment);
  labels.forEach((label, index) => {
    state = updateSignatureAction(state, state.input.actions[index].id, {
      label,
      sublabel: index === 0 ? label === "Listen Now" ? "LOVE & THEFT · OFFICIAL" : label === "Watch Now" ? "NEW VIDEO" : undefined : undefined,
      accessibilityLabel: label,
    });
  });
  const compiled = compileSignatureAuthoringState(state, { blockId: `composition-${id}`, label: `Love & Theft ${labels.join(" / ")}` });
  if (!compiled.ok) throw new Error(compiled.errors.map((error) => error.message).join(" "));
  return { state, block: compiled.composition.block };
}

function curatedNode(input: {
  id: string;
  name: string;
  presentationId: PresentationId;
  labels: readonly string[];
  parentId: string | null;
  siblingOrder: number;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  anchor?: CreativeCompositionNode["anchor"];
  treatment?: string;
}): CreativeCompositionNode {
  const compiled = compilePresentation(input.presentationId, input.labels, input.treatment);
  const density = EVERENCORE_LOVE_AND_THEFT_ASSEMBLY_RECIPES.find((recipe) => recipe.presentation?.id === input.presentationId)?.presentation?.density;
  return {
    id: input.id,
    primitive: "frame",
    compositionKind: "module",
    parentId: input.parentId,
    siblingOrder: input.siblingOrder,
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    zIndex: input.zIndex,
    name: input.name,
    visible: true,
    locked: false,
    anchor: input.anchor ?? "top-left",
    minHeightPx: Math.ceil(compiled.block.pageHeightPx ?? 44),
    props: {
      componentKind: "curated-system",
      elementKind: "curated-system",
      curatedFamilyId: EVERENCORE_LOVE_AND_THEFT_FAMILY_ID,
      curatedLayoutMode: compiled.state.input.layoutMode,
      curatedPresentationId: input.presentationId,
      curatedDensityMode: density?.mode,
      flowWidthPercent: density?.preferredFlowWidthPercent ?? 100,
      flowAlignment: density?.defaultFlowAlignment ?? "stretch",
      minimumTouchTargetPx: density?.minimumTouchTargetPx ?? 44,
    },
    moduleComposition: compiled.block,
  };
}

function composedRoot(previous: CreativeCompositionBlock): CreativeCompositionBlock {
  const leather = getMaterialRecipe("worn_saddle_leather");
  if (!leather) throw new Error("Worn Saddle Leather is unavailable.");
  const lowerContainerId = "composition-proof-lower-flow";
  const nodes: CreativeCompositionNode[] = [
    {
      id: "composition-proof-image", primitive: "image", compositionKind: "module", parentId: null, siblingOrder: 0,
      x: .025, y: .035, width: .43, height: .255, zIndex: 1, name: "Love & Theft artwork", visible: true, locked: false, anchor: "top-left",
      props: { componentKind: "image", elementKind: "image", src: "/marketing/use-cases/venues.jpg", alt: "Love & Theft concert atmosphere", fit: "cover", focalX: .5, focalY: .5, opacity: 1, decorative: false, radiusPx: 18 },
    },
    {
      id: "composition-proof-heading", primitive: "text", compositionKind: "module", parentId: null, siblingOrder: 1,
      x: .49, y: .045, width: .48, height: .085, zIndex: 3, name: "Artist heading", visible: true, locked: false, anchor: "top-right",
      props: { componentKind: "text", elementKind: "text", text: "LOVE & THEFT", textRole: "heading", color: "#f9e9cf", fontFamily: "Georgia, serif", fontSize: 25, fontWeight: 700, lineHeight: 1.05, align: "left", letterSpacing: .08 },
    },
    {
      id: "composition-proof-copy", primitive: "text", compositionKind: "module", parentId: null, siblingOrder: 2,
      x: .49, y: .135, width: .48, height: .105, zIndex: 3, name: "Artist story", visible: true, locked: false, anchor: "top-right",
      props: { componentKind: "text", elementKind: "text", text: "Music brings us closer. Two voices, one road, and a night worth remembering.", textRole: "body", color: "#ead7b7", fontSize: 12, fontWeight: 500, lineHeight: 1.45, align: "left" },
    },
    curatedNode({ id: "composition-proof-listen", name: "Medium Listen Now", presentationId: "everencore-love-and-theft-standard-left", labels: ["Listen Now"], parentId: null, siblingOrder: 3, x: .39, y: .255, width: .59, height: .16, zIndex: 5, anchor: "right", treatment: LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.burgundyPlum }),
    curatedNode({ id: "composition-proof-watch", name: "Compact Watch Now", presentationId: "everencore-love-and-theft-standard-utility", labels: ["Watch Now"], parentId: null, siblingOrder: 4, x: .025, y: .335, width: .48, height: .13, zIndex: 4, anchor: "left", treatment: LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.deepBlue }),
    curatedNode({ id: "composition-proof-website", name: "Utility Website", presentationId: "everencore-love-and-theft-standard-body", labels: ["Website"], parentId: null, siblingOrder: 5, x: .52, y: .425, width: .455, height: .105, zIndex: 4, anchor: "right", treatment: LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.frostedCharcoal }),
    {
      id: lowerContainerId, primitive: "frame", compositionKind: "container", parentId: null, siblingOrder: 6,
      x: .025, y: .56, width: .95, height: .23, zIndex: 2, name: "Tour and social actions", visible: true, locked: false, anchor: "bottom",
      props: { componentKind: "container", elementKind: "container", layout: "flow", compositionDensityMode: "dense", gap: 8, padding: 6, alignment: "stretch", containerTreatment: "transparent", fill: "transparent", borderWidth: 0, radius: 0 },
    },
    curatedNode({ id: "composition-proof-twin", name: "Twin Rail · Tour and Social", presentationId: "everencore-love-and-theft-twin-rail", labels: ["Tour Dates", "Instagram", "Spotify", "Contact"], parentId: lowerContainerId, siblingOrder: 0, x: 0, y: 0, width: 1, height: 1, zIndex: 1, anchor: "top" }),
  ];
  return setCardEdgeMode({
    ...previous,
    id: "studio-layered-composition-proof",
    label: "Love & Theft composed mobile Card",
    nodes,
    parentAuthority: { version: 1, layout: "flow", cardGapPx: 8 },
    compositionMode: { version: 1, mode: "layered", layeredHeightPx: 680, layeredPlacementInitialized: true },
    compositionDensity: { version: 1, mode: "dense" },
    safeAreaPaddingPx: 12,
    background: compositionBackgroundFromMaterialRecipe(leather),
  }, "full_bleed");
}

function nestedResponsiveRoot(previous: CreativeCompositionBlock): CreativeCompositionBlock {
  const leather = getMaterialRecipe("worn_saddle_leather");
  if (!leather) throw new Error("Worn Saddle Leather is unavailable.");
  const heroId = "nested-proof-hero";
  const leftId = "nested-proof-left";
  const rightId = "nested-proof-right";
  const groupId = "nested-proof-actions";
  const actions = [
    curatedNode({ id: "nested-proof-spotify", name: "Spotify", presentationId: "everencore-love-and-theft-standard-body", labels: ["Spotify"], parentId: rightId, siblingOrder: 0, x: .01, y: .02, width: .47, height: .18, zIndex: 1, treatment: LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.smokyBlack }),
    curatedNode({ id: "nested-proof-watch", name: "Watch Now", presentationId: "everencore-love-and-theft-standard-right", labels: ["Watch"], parentId: rightId, siblingOrder: 1, x: .51, y: .02, width: .47, height: .18, zIndex: 2, treatment: LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.deepBlue }),
    curatedNode({ id: "nested-proof-tour", name: "Tour", presentationId: "everencore-love-and-theft-standard-body", labels: ["Tour"], parentId: rightId, siblingOrder: 2, x: .01, y: .21, width: .47, height: .18, zIndex: 3, treatment: LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.frostedCharcoal }),
    curatedNode({ id: "nested-proof-tickets", name: "Tickets", presentationId: "everencore-love-and-theft-standard-body", labels: ["Tickets"], parentId: rightId, siblingOrder: 3, x: .51, y: .21, width: .47, height: .18, zIndex: 4, treatment: LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.burgundyPlum }),
    curatedNode({ id: "nested-proof-merch", name: "Merch", presentationId: "everencore-love-and-theft-standard-left", labels: ["Merch"], parentId: rightId, siblingOrder: 4, x: .01, y: .40, width: .47, height: .18, zIndex: 5, treatment: LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.burgundyPlum }),
    curatedNode({ id: "nested-proof-contact", name: "Contact", presentationId: "everencore-love-and-theft-standard-body", labels: ["Contact"], parentId: rightId, siblingOrder: 5, x: .51, y: .40, width: .47, height: .18, zIndex: 6, treatment: LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.smokyBlack }),
  ].map((node) => ({ ...node, groupId }));
  const nodes: CreativeCompositionNode[] = [
    {
      id: heroId, primitive: "frame", compositionKind: "container", parentId: null, siblingOrder: 0,
      x: .025, y: .025, width: .95, height: .43, zIndex: 2, name: "Hero Container", visible: true, locked: false, anchor: "top",
      props: { componentKind: "container", elementKind: "container", layout: "flow_horizontal", widthPercent: 100, minHeightPx: 320, padding: 5, gap: 6, alignment: "stretch", containerTreatment: "transparent", fill: "transparent", borderWidth: 0, contentFit: "fit_content", clipContent: false },
    },
    {
      id: leftId, primitive: "frame", compositionKind: "container", parentId: heroId, siblingOrder: 0,
      x: 0, y: 0, width: .35, height: 1, zIndex: 1, name: "Left · Artist", visible: true, locked: false, anchor: "left",
      props: { componentKind: "container", elementKind: "container", layout: "flow", widthPercent: 35, minWidthPx: 0, padding: 2, gap: 8, alignment: "stretch", containerTreatment: "transparent", fill: "transparent", borderWidth: 0, contentFit: "fit_content", clipContent: false },
    },
    {
      id: "nested-proof-art", primitive: "image", compositionKind: "module", parentId: leftId, siblingOrder: 0,
      x: 0, y: 0, width: 1, height: .58, zIndex: 1, name: "Artist image", visible: true, locked: false, anchor: "top-left", minHeightPx: 176,
      props: { componentKind: "image", elementKind: "image", src: "/marketing/use-cases/venues.jpg", alt: "Love & Theft live", fit: "cover", flowWidthPercent: 100, radiusPx: 18 },
    },
    {
      id: "nested-proof-logo", primitive: "text", compositionKind: "module", parentId: leftId, siblingOrder: 1,
      x: 0, y: .62, width: 1, height: .18, zIndex: 2, name: "Love & Theft logo", visible: true, locked: false, anchor: "left",
      props: { componentKind: "text", elementKind: "text", text: "LOVE & THEFT", textRole: "heading", color: "#f7e3c0", fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700, lineHeight: 1.05, letterSpacing: .06, flowWidthPercent: 100 },
    },
    {
      id: rightId, primitive: "frame", compositionKind: "container", parentId: heroId, siblingOrder: 1,
      x: 0, y: 0, width: .65, height: 1, zIndex: 2, name: "Right · Compact actions", visible: true, locked: false, anchor: "right",
      props: { componentKind: "container", elementKind: "container", layout: "layered", layeredHeightPx: 310, layeredPlacementInitialized: true, widthPercent: 65, minWidthPx: 0, padding: 2, gap: 4, alignment: "stretch", containerTreatment: "transparent", fill: "transparent", borderWidth: 0, contentFit: "fit_content", clipContent: false },
    },
    ...actions,
    {
      id: "nested-proof-overlap-image", primitive: "image", compositionKind: "module", parentId: null, siblingOrder: 2,
      x: .04, y: .43, width: .5, height: .27, zIndex: 3, name: "Overlapping media", visible: true, locked: false, anchor: "left",
      props: { componentKind: "image", elementKind: "image", src: "/marketing/use-cases/venues.jpg", alt: "Concert crowd", fit: "cover", radiusPx: 18 },
    },
    {
      id: "nested-proof-overlap-text", primitive: "text", compositionKind: "module", parentId: null, siblingOrder: 3,
      x: .32, y: .52, width: .62, height: .11, zIndex: 5, name: "Overlapping headline", visible: true, locked: false, anchor: "right",
      props: { componentKind: "text", elementKind: "text", text: "MUSIC BRINGS US CLOSER", color: "#fff1d6", fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 700, lineHeight: 1.08, align: "right" },
    },
    curatedNode({ id: "nested-proof-twin", name: "Twin Rail", presentationId: "everencore-love-and-theft-twin-rail", labels: ["Tour Dates", "Instagram", "Spotify", "Contact"], parentId: null, siblingOrder: 4, x: .04, y: .76, width: .92, height: .16, zIndex: 4, anchor: "bottom" }),
  ];
  const group: CreativeCompositionGroup = {
    id: groupId, name: "Compact action bank", parentId: rightId,
    x: .01, y: .02, width: .97, height: .56, anchor: "center", zIndex: 2, locked: false,
    layout: "grid", density: "dense", rowGapPx: 4, columnGapPx: 6, internalGapPx: 0, scaleMode: "full",
  };
  return setCardEdgeMode({
    ...previous,
    id: "studio-nested-responsive-proof",
    label: "Love & Theft nested responsive Card",
    nodes,
    groups: [group],
    parentAuthority: { version: 1, layout: "flow", cardGapPx: 6 },
    compositionMode: { version: 1, mode: "layered", layeredHeightPx: 720, layeredPlacementInitialized: true },
    compositionDensity: { version: 1, mode: "dense" },
    safeAreaPaddingPx: 10,
    background: compositionBackgroundFromMaterialRecipe(leather),
  }, "full_bleed");
}

function blankAuthoringRoot(previous: CreativeCompositionBlock): CreativeCompositionBlock {
  return {
    ...previous,
    id: "studio-actual-authoring-journey",
    label: "Actual Studio layered authoring journey",
    nodes: [],
    groups: [],
    parentAuthority: { version: 1, layout: "flow", cardGapPx: 12 },
    compositionMode: { version: 1, mode: "flow", layeredHeightPx: 760, layeredPlacementInitialized: false },
    compositionDensity: { version: 1, mode: "standard" },
    safeAreaPaddingPx: 12,
    background: { kind: "solid", value: "#111111", opacity: 1, source: "local" },
  };
}

test("composes and preserves the Product Owner layered mobile journey", async ({ browser, page }) => {
  test.skip(!enabled, "Set STUDIO_LAYERED_COMPOSITION_ACCEPTANCE=1 for the deterministic local review runtime");
  test.setTimeout(240_000);
  page.setDefaultTimeout(15_000);
  mkdirSync(proofRoot, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/review/studio", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/dashboard\/card\/edit$/);
  const baselineResponse = await page.request.get("/api/card/draft");
  expect(baselineResponse.ok()).toBeTruthy();
  const baseline = await baselineResponse.json() as { draft: TapConnectCardConfig; revision: number };
  const draft = projectDraft(structuredClone(baseline.draft));
  draft.rootComposition = composedRoot(draft.rootComposition);
  let phoneContext: Awaited<ReturnType<typeof browser.newContext>> | undefined;
  try {
    const seeded = await page.request.put("/api/card/draft", { data: { draft: commitDraft(draft), expectedRevision: baseline.revision } });
    expect(seeded.ok()).toBeTruthy();
    await page.reload({ waitUntil: "networkidle" });

    await expect(page.locator('[data-card-surface-layered="true"]')).toBeVisible();
    await expect(page.locator('[data-card-surface-layered="true"]')).toHaveAttribute("data-density", "dense");
    await expect(page.locator('[data-composition-node="composition-proof-lower-flow"]')).not.toHaveAttribute("data-layered-container", "true");
    await expect(page.locator('[data-composition-node="composition-proof-twin"]')).toHaveAttribute("data-parent-id", "composition-proof-lower-flow");
    const editNode = async (node: ReturnType<typeof page.locator>) => {
      await node.click();
      const toolbar = page.getByTestId("studio-composition-object-toolbar");
      const curatedToolbar = page.getByTestId("studio-curated-object-toolbar");
      await expect(toolbar.or(curatedToolbar)).toBeVisible();
      if (await curatedToolbar.isVisible().catch(() => false)) await curatedToolbar.getByRole("button", { name: "Move Curated System" }).click();
      else await toolbar.getByRole("button", { name: /^Edit/ }).click();
      await expect(page.getByTestId("studio-composition-inspector")).toBeVisible();
    };

    const image = page.locator('[data-composition-node="composition-proof-image"]');
    await editNode(image);
    await expect(page.getByTestId("studio-layered-x")).toBeVisible();
    await expect(page.getByTestId("studio-layered-height")).toBeEnabled();
    await page.getByRole("button", { name: "Close Inspector" }).click();
    await image.click();
    const imageLayerControls = page.getByTestId("studio-layer-controls-composition-proof-image");
    await expect(imageLayerControls).toBeVisible();
    await expect(imageLayerControls).toContainText("MoveResizeFrontBackLock");
    await page.screenshot({ path: path.join(proofRoot, "18-layered-selected-item-controls.png") });
    await imageLayerControls.getByRole("button", { name: "Lock" }).click();
    await page.getByTestId("studio-rail-layers").click();
    const lockedImageLayer = page.getByTestId("studio-layer-composition-proof-image");
    await expect(lockedImageLayer).toContainText("Locked");
    await expect(page.getByTestId("studio-layer-unlock-composition-proof-image")).toBeVisible();
    await page.screenshot({ path: path.join(proofRoot, "19-outline-lock-recovery.png") });
    await page.getByTestId("studio-layer-unlock-composition-proof-image").click();
    await page.getByTestId("studio-layer-composition-proof-listen").getByRole("button").first().click();
    await page.getByTestId("studio-rail-layers").click();

    const heading = page.locator('[data-composition-node="composition-proof-heading"]');
    await heading.click();
    const handle = page.getByTestId("studio-canvas-handle-composition-proof-heading");
    const handleBox = await handle.boundingBox();
    if (!handleBox) throw new Error("Layered heading move handle is unavailable.");
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + handleBox.width / 2 - 6, handleBox.y + handleBox.height / 2 + 2, { steps: 4 });
    await expect(page.locator('[data-testid^="composition-guide-"]').first()).toBeVisible();
    await page.mouse.up();
    await expect(page.locator('[data-testid^="composition-guide-"]')).toHaveCount(0);
    await editNode(heading);
    const movedX = Number(await page.getByTestId("studio-layered-x").inputValue());
    await page.getByRole("button", { name: "Close Inspector" }).click();
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await editNode(heading);
    expect(Number(await page.getByTestId("studio-layered-x").inputValue())).toBe(movedX);
    await page.getByRole("button", { name: "Close Inspector" }).click();

    const listen = page.locator('[data-composition-node="composition-proof-listen"]');
    await editNode(listen);
    await expect(page.getByTestId("studio-layered-width")).toBeDisabled();
    await page.getByRole("button", { name: "Bring to front" }).click();
    await page.getByRole("button", { name: "Close Inspector" }).click();
    await editNode(image);
    await page.getByRole("button", { name: "Send to back" }).click();
    await page.getByRole("button", { name: "Close Inspector" }).click();

    await page.getByTestId("card-preview-phone").screenshot({ path: path.join(proofRoot, "05-group-a-independent.png") });
    const watch = page.locator('[data-composition-node="composition-proof-watch"]');
    const website = page.locator('[data-composition-node="composition-proof-website"]');
    await page.getByTestId("studio-select-multiple").click();
    await image.click();
    await listen.click();
    await watch.click();
    await website.click();
    await expect(listen).toHaveAttribute("data-selected", "true");
    await expect(watch).toHaveAttribute("data-selected", "true");
    await expect(listen).toHaveAttribute("data-selected", "true");
    await expect(watch).toHaveAttribute("data-selected", "true");
    await expect(website).toHaveAttribute("data-selected", "true");
    await expect(page.getByTestId("studio-composition-multi-toolbar")).toContainText("3 Modules selected");
    await page.screenshot({ path: path.join(proofRoot, "20-multiselect-desktop.png") });
    await page.getByTestId("studio-composition-group-selected").click();
    const groupEnvelope = page.getByTestId("studio-layered-group-envelope");
    await expect(groupEnvelope).toBeVisible();
    const groupId = await groupEnvelope.getAttribute("data-group-id");
    expect(groupId).toBeTruthy();
    await page.getByTestId("card-preview-phone").screenshot({ path: path.join(proofRoot, "06-group-b-grouped.png") });

    const groupToolbar = page.getByTestId("studio-composition-group-toolbar");
    await expect(groupToolbar).toBeVisible();
    await expect(groupToolbar).toContainText("Move / ResizeLayerLockUngroup");
    await page.screenshot({ path: path.join(proofRoot, "21-group-toolbar.png") });
    await groupToolbar.getByRole("button", { name: "Move / Resize" }).click();
    const groupInspector = page.getByTestId("studio-composition-inspector");
    await expect(groupInspector.getByTestId("studio-composition-group-controls")).toBeVisible();
    await groupInspector.getByRole("button", { name: "flow vertical", exact: true }).click();
    await groupInspector.getByRole("button", { name: "dense", exact: true }).click();
    await groupInspector.getByTestId("studio-group-width").fill("58");
    await page.getByRole("button", { name: "Close Inspector" }).click();
    await expect(groupEnvelope).toBeVisible();
    await page.getByTestId("card-preview-phone").screenshot({ path: path.join(proofRoot, "07-group-c-resized-dense.png") });

    const beforeMove = await groupEnvelope.boundingBox();
    const moveHandle = page.getByTestId("studio-layered-group-move");
    const moveHandleBox = await moveHandle.boundingBox();
    if (!beforeMove || !moveHandleBox) throw new Error("Composition Group move geometry is unavailable.");
    await page.mouse.move(moveHandleBox.x + moveHandleBox.width / 2, moveHandleBox.y + moveHandleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(moveHandleBox.x + moveHandleBox.width / 2 + 46, moveHandleBox.y + moveHandleBox.height / 2 + 28, { steps: 5 });
    await page.mouse.up();
    const afterMove = await groupEnvelope.boundingBox();
    expect(afterMove).not.toBeNull();
    expect(Math.abs(afterMove!.x - beforeMove.x) + Math.abs(afterMove!.y - beforeMove.y)).toBeGreaterThan(20);
    await page.getByTestId("card-preview-phone").screenshot({ path: path.join(proofRoot, "08-group-d-moved.png") });

    await page.getByTestId("studio-rail-layers").click();
    await expect(page.getByTestId("studio-outline-card-surface")).toContainText("Layered composition");
    await expect(page.locator('[data-testid^="studio-outline-group-"]')).toContainText("3 Modules");
    await expect(page.getByTestId("studio-outline-container-composition-proof-lower-flow")).toContainText("Twin Rail");
    await page.keyboard.press("Escape");

    const save = page.getByTestId("studio-save");
    if (await save.isEnabled()) await save.click();
    await expect(save).toBeDisabled();
    const persistedBeforeReload = await page.request.get("/api/card/draft").then((response) => response.json()) as { draft: TapConnectCardConfig };
    const geometryBeforeReload = pageRoot(persistedBeforeReload.draft).nodes.map(({ id, parentId, x, y, width, height, zIndex, anchor }) => ({ id, parentId, x, y, width, height, zIndex, anchor }));
    await page.reload({ waitUntil: "networkidle" });
    const persistedAfterReload = await page.request.get("/api/card/draft").then((response) => response.json()) as { draft: TapConnectCardConfig };
    const persistedAfterRoot = pageRoot(persistedAfterReload.draft);
    const geometryAfterReload = persistedAfterRoot.nodes.map(({ id, parentId, x, y, width, height, zIndex, anchor }) => ({ id, parentId, x, y, width, height, zIndex, anchor }));
    expect(geometryAfterReload).toEqual(geometryBeforeReload);
    const persistedGroup = persistedAfterRoot.nodes.filter((candidate) => candidate.groupId === groupId);
    expect(persistedGroup).toHaveLength(3);
    expect(persistedGroup.every((candidate) => candidate.props.compositionGroupLayout === "flow_vertical" && candidate.props.compositionGroupDensityMode === "dense")).toBe(true);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[data-composition-node="composition-proof-listen"]').click();
    const phoneGroupEnvelope = page.getByTestId("studio-layered-group-envelope");
    await expect(phoneGroupEnvelope).toBeVisible();
    await expect(page.getByTestId("studio-layered-group-move")).toBeVisible();
    await expect(page.getByTestId("studio-layered-group-resize")).toBeVisible();
    const phoneGroupBox = await phoneGroupEnvelope.boundingBox();
    expect(phoneGroupBox).not.toBeNull();
    expect(phoneGroupBox!.x).toBeGreaterThanOrEqual(0);
    expect(phoneGroupBox!.x + phoneGroupBox!.width).toBeLessThanOrEqual(390);
    const phoneToolbar = page.getByTestId("studio-phone-toolbar");
    await expect(phoneToolbar).toBeVisible();
    await phoneToolbar.getByRole("button", { name: "Group", exact: true }).click();
    await page.getByTestId("studio-group-ungroup").click();
    await page.getByRole("button", { name: "Close Inspector" }).click();
    await page.locator('[data-composition-node="composition-proof-listen"]').click();
    await phoneToolbar.getByRole("button", { name: "Select", exact: true }).click();
    await page.locator('[data-composition-node="composition-proof-watch"]').click();
    await page.locator('[data-composition-node="composition-proof-website"]').click();
    await expect(phoneToolbar).toContainText("3 selected");
    await page.screenshot({ path: path.join(proofRoot, "22-multiselect-phone-touch.png") });
    await phoneToolbar.getByRole("button", { name: "Group", exact: true }).click();
    await phoneToolbar.getByRole("button", { name: "Group", exact: true }).click();
    await expect(page.getByTestId("studio-composition-group-controls")).toBeVisible();
    await expect(page.getByTestId("studio-group-width")).toBeVisible();
    await expect(page.getByTestId("studio-group-height")).toBeVisible();
    await page.screenshot({ path: path.join(proofRoot, "10-phone-group-authoring.png") });
    await page.getByRole("button", { name: "Close Inspector" }).click();
    await page.setViewportSize({ width: 1440, height: 960 });

    await page.locator('[data-composition-node="composition-proof-heading"]').scrollIntoViewIfNeeded();
    await page.getByTestId("card-preview-phone").screenshot({ path: path.join(proofRoot, "01-studio-composed-card.png") });
    await page.getByTestId("card-preview-phone").screenshot({ path: path.join(proofRoot, "09-group-e-saved-reloaded.png") });
    await page.getByTestId("studio-preview").click();
    await expect(page.getByTestId("studio-editor-rail")).toHaveCount(0);
    await page.getByTestId("card-preview-phone").screenshot({ path: path.join(proofRoot, "02-preview-composed-card.png") });
    await page.getByTestId("studio-preview").click();
    const closeInspector = page.getByRole("button", { name: /Close (Button )?Inspector/ });
    if (await closeInspector.isVisible().catch(() => false)) await closeInspector.click();
    await page.getByTestId("preview-live-device").click();
    await expect(page.getByTestId("live-device-qr-panel")).toHaveAttribute("data-preview-status", "ready", { timeout: 15_000 });
    const candidate = await page.getByTestId("preview-url-text").getAttribute("href");
    if (!candidate) throw new Error("Live Device URL was not generated.");
    const liveUrl = new URL(candidate);
    phoneContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const phone = await phoneContext.newPage();
    await phone.goto(`http://127.0.0.1:3050${liveUrl.pathname}${liveUrl.search}`, { waitUntil: "networkidle" });
    await expect(phone.getByTestId("preview-live-page")).toBeVisible();
    const fullBleed = phone.locator('[data-card-surface-viewport-backdrop="true"]');
    await expect(fullBleed).toBeVisible();
    const fullBleedBox = await fullBleed.boundingBox();
    expect(fullBleedBox?.x).toBe(0);
    expect(fullBleedBox?.width).toBe(390);
    const phoneSurface = phone.locator('[data-card-surface-layered="true"]');
    await expect(phoneSurface).toBeVisible();
    await expect(phone.locator('[data-composition-node="composition-proof-image"] img')).toBeVisible();
    await expect(phone.getByText("LOVE & THEFT", { exact: true })).toBeVisible();
    const phoneActions = phone.locator(`[data-signature-family="${EVERENCORE_LOVE_AND_THEFT_FAMILY_ID}"][data-signature-classification="live-action"]`).locator("xpath=ancestor::a[1]");
    expect(await phoneActions.count()).toBe(7);
    for (let index = 0; index < await phoneActions.count(); index += 1) {
      const action = phoneActions.nth(index);
      const box = await action.boundingBox();
      expect(await action.getAttribute("href")).toBeTruthy();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.x ?? -1).toBeGreaterThanOrEqual(-1);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(391);
    }
    expect(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await phone.screenshot({ path: path.join(proofRoot, "03-live-device-composed-card-390.png"), fullPage: true });
    const firstContentBox = await phone.locator('[data-composition-node="composition-proof-image"]').boundingBox();
    const lastContentBox = await phone.locator('[data-composition-node="composition-proof-lower-flow"]').boundingBox();
    if (!firstContentBox || !lastContentBox) throw new Error("The composed Card bounds are unavailable.");
    await phone.screenshot({
      path: path.join(proofRoot, "04-composed-card-only-390.png"),
      clip: { x: 0, y: Math.max(0, firstContentBox.y - 20), width: 390, height: Math.min(await phone.evaluate(() => document.documentElement.scrollHeight), lastContentBox.y + lastContentBox.height + 20) - Math.max(0, firstContentBox.y - 20) },
    });

    const surfaceBox = await phoneSurface.boundingBox();
    if (!surfaceBox) throw new Error("Phone layered Card Surface is unavailable.");
    const representativeIds = ["composition-proof-image", "composition-proof-heading", "composition-proof-listen", "composition-proof-watch", "composition-proof-lower-flow"];
    const resolved = await Promise.all(representativeIds.map(async (id) => {
      const node = persistedAfterRoot.nodes.find((candidateNode) => candidateNode.id === id)!;
      const box = await phone.locator(`[data-composition-node="${id}"]`).boundingBox();
      return { id, authored: { x: node.x, y: node.y, width: node.width, height: node.height, anchor: node.anchor, zIndex: node.zIndex }, phone390Viewport: box, phone390Parent: box ? { xPx: box.x - surfaceBox.x, yPx: box.y - surfaceBox.y, widthPx: box.width, heightPx: box.height } : null };
    }));
    for (const item of resolved) {
      expect(item.phone390Viewport).not.toBeNull();
      expect(item.phone390Viewport!.x).toBeGreaterThanOrEqual(-1);
      expect(item.phone390Viewport!.x + item.phone390Viewport!.width).toBeLessThanOrEqual(391);
    }
    const visualOrder = resolved.map((item) => item.phone390Viewport!.y);
    expect(new Set(visualOrder.map((value) => Math.round(value))).size).toBeGreaterThan(2);
    const proof = {
      contract: "studioLayeredCompositionJourney@1.0.0",
      route: "http://127.0.0.1:3050/review/studio",
      viewport: { width: 390, height: 844 },
      parent: { widthPx: surfaceBox.width, heightPx: surfaceBox.height },
      density: persistedAfterRoot.compositionDensity,
      children: resolved,
      group: { id: groupId, memberIds: persistedGroup.map((candidate) => candidate.id), layout: "flow_vertical", density: "dense", movedByPointer: true, savedAndReloaded: true },
      checks: { fullBleed: true, rootLayered: true, lowerFlowContainer: true, snapGuidesTransient: true, oneGestureHistory: true, groupMultiselect: true, groupOutlineHierarchy: true, groupResizeGoverned: true, groupMoveOneGesture: true, phoneGroupAuthoring: true, phoneGroupHandlesReachable: true, undoRedo: true, exactSaveReload: true, previewParity: true, liveDeviceParity: true, phoneActionCount: 7, minimumTouchTargetPx: 44, noHorizontalOverflow: true, productOwnerAcceptance: "pending" },
    };
    writeFileSync(path.join(proofRoot, "geometry-proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
  } finally {
    await phoneContext?.close();
    const currentResponse = await page.request.get("/api/card/draft");
    if (currentResponse.ok()) {
      const current = await currentResponse.json() as { revision: number };
      const restored = await page.request.put("/api/card/draft", { data: { draft: baseline.draft, expectedRevision: current.revision } });
      expect(restored.ok()).toBeTruthy();
    }
  }
});

test("renders nested responsive regions with a persisted compact Group at phone width", async ({ page }) => {
  test.skip(!enabled, "Set STUDIO_LAYERED_COMPOSITION_ACCEPTANCE=1 for the deterministic local review runtime");
  test.setTimeout(180_000);
  page.setDefaultTimeout(15_000);
  mkdirSync(proofRoot, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/review/studio", { waitUntil: "networkidle" });
  const baselineResponse = await page.request.get("/api/card/draft");
  expect(baselineResponse.ok()).toBeTruthy();
  const baseline = await baselineResponse.json() as { draft: TapConnectCardConfig; revision: number };
  const draft = projectDraft(structuredClone(baseline.draft));
  draft.rootComposition = nestedResponsiveRoot(draft.rootComposition);
  try {
    const seeded = await page.request.put("/api/card/draft", { data: { draft: commitDraft(draft), expectedRevision: baseline.revision } });
    expect(seeded.ok()).toBeTruthy();
    await page.reload({ waitUntil: "networkidle" });

    const hero = page.locator('[data-composition-node="nested-proof-hero"]');
    const left = page.locator('[data-composition-node="nested-proof-left"]');
    const right = page.locator('[data-composition-node="nested-proof-right"]');
    const group = page.locator('[data-composition-group="nested-proof-actions"]');
    await expect(hero).toBeVisible();
    await expect(left).toHaveAttribute("data-container-depth", "2");
    await expect(right).toHaveAttribute("data-container-depth", "2");
    await expect(right).toHaveAttribute("data-layered-container", "true");
    await expect(group).toHaveAttribute("data-group-persisted", "true");
    await expect(group).toHaveAttribute("data-group-layout", "grid");
    await expect(group).toHaveAttribute("data-group-scale", "full");
    expect(await group.locator('[data-composition-kind="module"]').count()).toBe(6);

    await page.getByTestId("studio-rail-layers").click();
    const heroOutline = page.getByTestId("studio-outline-container-nested-proof-hero");
    await expect(heroOutline.getByTestId("studio-layer-nested-proof-left")).toBeVisible();
    await expect(heroOutline.getByTestId("studio-layer-nested-proof-right")).toBeVisible();
    await expect(heroOutline.locator('[data-testid="studio-outline-group-nested-proof-actions"]')).toContainText("6 Modules");
    await page.getByTestId("studio-layer-nested-proof-hero").click();
    await page.getByTestId("studio-drawer-close").click();
    await expect(page.getByTestId("studio-composition-object-toolbar")).toBeVisible();
    await page.getByTestId("studio-composition-object-toolbar").getByRole("button", { name: /^Edit/ }).click();
    await expect(page.getByTestId("studio-layered-x")).toBeVisible();
    const originalHeroX = Number(await page.getByTestId("studio-layered-x").inputValue());
    await page.getByTestId("studio-layered-x").fill(String(Math.min(20, originalHeroX + 2)));
    await page.getByRole("button", { name: "Close Inspector" }).click();

    await page.getByTestId("studio-rail-layers").click();
    await page.getByTestId("studio-layer-nested-proof-right").click();
    await page.getByTestId("studio-drawer-close").click();
    await page.getByTestId("studio-composition-object-toolbar").getByRole("button", { name: /^Edit/ }).click();
    await expect(page.getByTestId("studio-container-responsive-size")).toBeVisible();
    await page.getByTestId("studio-container-responsive-size").getByRole("button", { name: "66", exact: true }).click();
    await page.getByRole("button", { name: "Close Inspector" }).click();

    await page.locator('[data-composition-node="nested-proof-spotify"]').click();
    await expect(page.getByTestId("studio-composition-group-toolbar")).toBeVisible();
    await page.getByTestId("studio-composition-group-toolbar").getByRole("button", { name: "Move / Resize" }).click();
    await expect(page.getByTestId("studio-composition-group-controls")).toBeVisible();
    await page.getByRole("button", { name: "compact", exact: true }).click();
    await expect(page.getByRole("button", { name: "compact", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("studio-group-width")).toHaveValue("78");
    await page.getByTestId("card-preview-phone").screenshot({ path: path.join(proofRoot, "13-nested-group-compact-left-390.png") });
    await page.getByTestId("studio-group-left").fill("20");
    await expect(page.getByTestId("studio-group-left")).toHaveValue("20");
    await page.getByTestId("card-preview-phone").screenshot({ path: path.join(proofRoot, "14-nested-group-compact-right-390.png") });
    await page.getByRole("button", { name: "Close Inspector" }).click();

    await page.getByTestId("card-preview-phone").screenshot({ path: path.join(proofRoot, "11-nested-regions-edit-390.png") });
    const save = page.getByTestId("studio-save");
    if (await save.isEnabled()) await save.click();
    await expect(save).toBeDisabled();
    const beforeReload = await page.request.get("/api/card/draft").then((response) => response.json()) as { draft: TapConnectCardConfig };
    await page.reload({ waitUntil: "networkidle" });
    const afterReload = await page.request.get("/api/card/draft").then((response) => response.json()) as { draft: TapConnectCardConfig };
    const beforeReloadRoot = pageRoot(beforeReload.draft);
    const afterReloadRoot = pageRoot(afterReload.draft);
    expect(afterReloadRoot.groups).toEqual(beforeReloadRoot.groups);
    expect(afterReloadRoot.nodes.map(({ id, parentId, x, y, width, height }) => ({ id, parentId, x, y, width, height }))).toEqual(beforeReloadRoot.nodes.map(({ id, parentId, x, y, width, height }) => ({ id, parentId, x, y, width, height })));

    await page.getByTestId("studio-preview").click();
    await expect(page.getByTestId("studio-editor-rail")).toHaveCount(0);
    await expect(page.locator('[data-composition-group="nested-proof-actions"]')).toBeVisible();
    await page.getByTestId("card-preview-phone").screenshot({ path: path.join(proofRoot, "12-nested-regions-preview-390.png") });
    const surface = page.locator('[data-card-surface-layered="true"]');
    const surfaceBox = await surface.boundingBox();
    const groupBox = await page.locator('[data-composition-group="nested-proof-actions"]').boundingBox();
    const heroBox = await page.locator('[data-composition-node="nested-proof-hero"]').boundingBox();
    const rightBox = await page.locator('[data-composition-node="nested-proof-right"]').boundingBox();
    if (!surfaceBox || !groupBox || !heroBox || !rightBox) throw new Error("Nested proof geometry is unavailable.");
    const childBoxes = await Promise.all(actionsForProof().map(async (id) => ({ id, box: await page.locator(`[data-composition-node="${id}"]`).boundingBox() })));
    for (const child of childBoxes) {
      expect(child.box).not.toBeNull();
      expect(child.box!.height).toBeGreaterThanOrEqual(44);
    }
    const persistedGroup = afterReloadRoot.groups?.find((candidate) => candidate.id === "nested-proof-actions");
    const persistedRight = afterReloadRoot.nodes.find((candidate) => candidate.id === "nested-proof-right");
    const persistedHero = afterReloadRoot.nodes.find((candidate) => candidate.id === "nested-proof-hero");
    writeFileSync(path.join(proofRoot, "nested-responsive-geometry-proof.json"), `${JSON.stringify({
      contract: "studioNestedResponsiveComposition@1.0.0",
      route: "http://127.0.0.1:3050/review/studio",
      viewport: { width: 390, height: 844 },
      parent: { widthPx: rightBox.width, heightPx: rightBox.height },
      initialGroup: { x: .01, y: .02, width: .97, height: .56, scaleMode: "full" },
      compactGroup: persistedGroup,
      phoneResolved: { surface: surfaceBox, hero: heroBox, right: rightBox, group: groupBox, children: childBoxes },
      heroAuthored: persistedHero,
      rightAuthored: persistedRight,
      internalRowGapPx: persistedGroup?.rowGapPx,
      internalColumnGapPx: persistedGroup?.columnGapPx,
      savedAndReloaded: true,
      previewParity: true,
      nestedDepth: 2,
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

test("authors the layered Card through the actual Studio Add, drag, group, Text Box, save, Preview, and Live Device path", async ({ browser, page }) => {
  test.skip(!enabled, "Set STUDIO_LAYERED_COMPOSITION_ACCEPTANCE=1 for the deterministic local review runtime");
  test.setTimeout(300_000);
  page.setDefaultTimeout(18_000);
  mkdirSync(proofRoot, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/review/studio", { waitUntil: "domcontentloaded" });
  const baselineResponse = await page.request.get("/api/card/draft");
  expect(baselineResponse.ok()).toBeTruthy();
  const baseline = await baselineResponse.json() as { draft: TapConnectCardConfig; revision: number };
  const draft = projectDraft(structuredClone(baseline.draft));
  draft.rootComposition = blankAuthoringRoot(draft.rootComposition);
  let phoneContext: Awaited<ReturnType<typeof browser.newContext>> | undefined;

  const closePanels = async () => {
    const panels = [
      { id: "studio-composition-inspector", name: "Close Inspector" },
      { id: "studio-assembly-inspector", name: "Close authoring panel" },
      { id: "studio-button-inspector", name: "Close Button Inspector" },
    ];
    for (const panel of panels) {
      const locator = page.getByTestId(panel.id);
      if (await locator.isVisible().catch(() => false)) await locator.getByRole("button", { name: panel.name, exact: true }).click();
    }
  };
  const openAdd = async () => {
    await closePanels();
    await page.getByTestId("studio-rail-add").click();
    await expect(page.getByTestId("studio-add-home")).toBeVisible();
  };
  const addLoveAction = async (presentationId: string) => {
    await openAdd();
    await page.getByTestId("studio-add-buttons").click();
    await page.getByTestId(`studio-button-family-${EVERENCORE_LOVE_AND_THEFT_FAMILY_ID}`).click();
    await page.getByTestId(`studio-governed-resource-${EVERENCORE_LOVE_AND_THEFT_FAMILY_ID}:${presentationId}`).click();
    await expect(page.getByTestId("studio-discovery-drawer")).toHaveCount(0);
  };

  try {
    const seeded = await page.request.put("/api/card/draft", { data: { draft: commitDraft(draft), expectedRevision: baseline.revision } });
    expect(seeded.ok()).toBeTruthy();
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByTestId("studio-reconstitution-shell")).toHaveAttribute("data-session-restored", "true");

    if (!(await page.getByTestId("studio-outline-view").isVisible().catch(() => false))) {
      await page.getByTestId("studio-rail-add").click();
      await expect(page.getByTestId("studio-add-home")).toBeVisible();
      await page.getByTestId("studio-rail-layers").click();
    }
    await expect(page.getByTestId("studio-outline-view")).toBeVisible();
    await page.getByTestId("studio-outline-card-surface").click();
    await page.getByTestId("studio-drawer-close").click();
    await expect(page.getByTestId("studio-card-surface-toolbar")).toBeVisible();
    await page.getByRole("button", { name: "Refine surface" }).click();
    const surfaceInspector = page.getByTestId("studio-card-surface-inspector");
    await surfaceInspector.getByRole("button", { name: "Worn Saddle Leather", exact: true }).click();
    await surfaceInspector.getByTestId("studio-card-composition-mode").getByRole("button", { name: "layered", exact: true }).click();
    await expect(page.locator('[data-card-surface-layered="true"]')).toBeVisible();
    await surfaceInspector.getByRole("button", { name: "Close Inspector", exact: true }).click();

    await openAdd();
    await page.getByTestId("studio-add-image").click();
    await page.getByTestId("studio-choose-image-asset").click();
    const asset = page.getByTestId("media-browser-result").first();
    await expect(asset).toBeVisible();
    await asset.click();
    await page.getByTestId("media-browser-insert").click();
    const image = page.locator('[data-composition-kind="module"][data-primitive="image"][data-parent-id="card-surface"]').last();
    await expect(image).toHaveAttribute("data-position-mode", "absolute");
    const imageId = await image.getAttribute("data-composition-node");
    expect(imageId).toBeTruthy();
    await closePanels();

    await openAdd();
    await page.getByTestId("studio-add-text").click();
    await expect(page.getByTestId("studio-add-resource-text-free")).toBeVisible();
    await page.getByTestId("studio-add-resource-text-heading").click();
    const heading = page.locator('[data-composition-kind="module"][data-primitive="text"][data-selected="true"]');
    const headingId = await heading.getAttribute("data-composition-node");
    expect(headingId).toBeTruthy();
    await page.getByTestId("studio-text-content").fill("LOVE & THEFT");
    await page.getByTestId("studio-layered-x").fill("8");
    await page.getByTestId("studio-layered-y").fill("8");
    await page.getByTestId("studio-layered-width").fill("44");
    const textBoxControls = page.locator('[data-control-group="text-box"]');
    await expect(textBoxControls).toBeVisible();
    await textBoxControls.getByRole("button", { name: "filled", exact: true }).click();
    await closePanels();

    await openAdd();
    await page.getByTestId("studio-add-text").click();
    await page.getByTestId("studio-add-resource-text-body").click();
    const body = page.locator('[data-composition-kind="module"][data-primitive="text"][data-selected="true"]');
    const bodyId = await body.getAttribute("data-composition-node");
    expect(bodyId).toBeTruthy();
    await page.getByTestId("studio-text-content").fill("Two voices, one road, and a night worth remembering.");
    await page.getByTestId("studio-layered-x").fill("52");
    await page.getByTestId("studio-layered-y").fill("8");
    await page.getByTestId("studio-layered-width").fill("44");
    await closePanels();
    await body.click();
    const inlineBody = page.getByTestId(`composition-inline-text-${bodyId}`);
    if (await inlineBody.getAttribute("data-inline-editing") !== "true") await page.getByTestId(`studio-edit-text-${bodyId}`).click();
    await expect(inlineBody).toHaveAttribute("data-inline-editing", "true");
    await inlineBody.press("End");
    await inlineBody.type(" Music brings us closer.");
    await inlineBody.press("Enter");
    await inlineBody.type("Live from your phone.");
    await inlineBody.press("Tab");
    await expect(inlineBody).toContainText("Music brings us closer");

    const actionPresentations = [
      "everencore-love-and-theft-standard-left",
      "everencore-love-and-theft-standard-right",
      "everencore-love-and-theft-standard-utility",
      "everencore-love-and-theft-standard-body",
      "everencore-love-and-theft-standard-left",
      "everencore-love-and-theft-standard-body",
    ];
    for (const presentationId of actionPresentations) await addLoveAction(presentationId);
    await closePanels();
    const actions = page.locator('[data-parent-id="card-surface"][data-element-kind="curated-system"]');
    await expect(actions).toHaveCount(6);
    for (let index = 0; index < 6; index += 1) {
      await expect(actions.nth(index)).toHaveAttribute("data-position-mode", "absolute");
      await expect(actions.nth(index)).toHaveAttribute("data-flow-wrapper", "false");
      await actions.nth(index).click(index === 0 ? undefined : { modifiers: ["Control"] });
    }
    await expect(page.getByTestId("studio-composition-multi-toolbar")).toContainText("6 Modules selected");
    await page.getByTestId("studio-composition-group-selected").click();
    const envelope = page.getByTestId("studio-layered-group-envelope");
    await expect(envelope).toBeVisible();
    await page.getByTestId("studio-composition-group-toolbar").getByRole("button", { name: "Move / Resize" }).click();
    const groupInspector = page.getByTestId("studio-composition-inspector");
    await groupInspector.getByRole("button", { name: "grid", exact: true }).click();
    await groupInspector.getByRole("button", { name: "dense", exact: true }).click();
    await groupInspector.getByTestId("studio-group-width").fill("92");
    await groupInspector.getByRole("button", { name: "Close Inspector", exact: true }).click();

    const beforeMove = await envelope.boundingBox();
    const groupMove = page.getByTestId("studio-layered-group-move");
    const groupMoveBox = await groupMove.boundingBox();
    if (!beforeMove || !groupMoveBox) throw new Error("Actual Group drag handle was unavailable.");
    await page.mouse.move(groupMoveBox.x + groupMoveBox.width / 2, groupMoveBox.y + groupMoveBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(groupMoveBox.x + groupMoveBox.width / 2 + 28, groupMoveBox.y + groupMoveBox.height / 2 + 22, { steps: 5 });
    await page.mouse.up();
    const afterMove = await envelope.boundingBox();
    expect(afterMove && Math.abs(afterMove.x - beforeMove.x) + Math.abs(afterMove.y - beforeMove.y)).toBeGreaterThan(12);

    await openAdd();
    await page.getByTestId("studio-add-container").click();
    await page.getByTestId("studio-add-container-transparent").click();
    const nested = page.locator('[data-composition-kind="container"][data-selected="true"]');
    const nestedId = await nested.getAttribute("data-composition-node");
    expect(nestedId).toBeTruthy();
    await expect(nested).toHaveAttribute("data-position-mode", "absolute");
    await page.getByTestId("studio-container-layout-mode").getByRole("button", { name: "layered", exact: true }).click();
    await closePanels();
    await openAdd();
    await expect(page.getByTestId("studio-add-target")).toContainText("Transparent Container");
    await page.getByTestId("studio-add-text").click();
    await page.getByTestId("studio-add-resource-text-free").click();
    const nestedText = page.locator('[data-composition-kind="module"][data-primitive="text"][data-selected="true"]');
    await expect(nestedText).toHaveAttribute("data-parent-id", nestedId!);
    await expect(nestedText).toHaveAttribute("data-position-mode", "absolute");
    await page.getByTestId("studio-text-content").fill("LOVE & THEFT · OFFICIAL");
    await closePanels();

    await page.getByTestId("studio-rail-layers").click();
    await page.getByTestId(`studio-layer-${headingId}`).click();
    await page.getByTestId("studio-drawer-close").click();
    const moveHandle = page.getByTestId(`studio-canvas-handle-${headingId}`);
    const moveBox = await moveHandle.boundingBox();
    if (!moveBox) throw new Error("Text drag handle was unavailable.");
    await page.mouse.move(moveBox.x + 10, moveBox.y + 10);
    await page.mouse.down();
    await page.mouse.move(moveBox.x + 24, moveBox.y + 16, { steps: 4 });
    await page.mouse.up();
    await heading.click();
    await page.getByTestId("studio-composition-object-toolbar").getByRole("button", { name: /^Edit/ }).click();
    await page.getByRole("button", { name: "Bring to front" }).click();
    await closePanels();

    const save = page.getByTestId("studio-save");
    if (await save.isEnabled()) await save.click();
    await expect(save).toBeDisabled();
    const authoredBeforeReload = await page.request.get("/api/card/draft").then((response) => response.json()) as { draft: TapConnectCardConfig };
    await page.reload({ waitUntil: "domcontentloaded" });
    const authoredAfterReload = await page.request.get("/api/card/draft").then((response) => response.json()) as { draft: TapConnectCardConfig };
    expect(pageRoot(authoredAfterReload.draft).nodes.map(({ id, parentId, x, y, width, height, zIndex }) => ({ id, parentId, x, y, width, height, zIndex }))).toEqual(pageRoot(authoredBeforeReload.draft).nodes.map(({ id, parentId, x, y, width, height, zIndex }) => ({ id, parentId, x, y, width, height, zIndex })));

    const rootRegion = page.locator('[data-layered-region-id="card-surface"]');
    await expect(rootRegion).toHaveAttribute("data-flow-gap-applied", "false");
    const authoredNodes = page.locator('[data-parent-id="card-surface"][data-position-mode="absolute"]');
    expect(await authoredNodes.count()).toBeGreaterThanOrEqual(10);
    const domAudit = await authoredNodes.evaluateAll((elements) => elements.map((element) => {
      const html = element as HTMLElement;
      const style = getComputedStyle(html);
      return {
        id: html.dataset.compositionNode,
        parentId: html.dataset.parentId,
        x: html.dataset.layerX,
        y: html.dataset.layerY,
        width: html.dataset.layerWidth,
        height: html.dataset.layerHeight,
        z: html.dataset.layerZ,
        position: style.position,
        flowWrapper: html.dataset.flowWrapper,
      };
    }));
    expect(domAudit.every((entry) => entry.position === "absolute" && entry.flowWrapper === "false")).toBe(true);
    const groupAudit = await page.locator('[data-composition-group]').evaluate((element) => {
      const html = element as HTMLElement;
      return {
        id: html.dataset.compositionGroup,
        parentId: html.dataset.groupParent,
        layout: html.dataset.groupLayout,
        density: html.dataset.groupDensity,
        x: html.dataset.layerX,
        y: html.dataset.layerY,
        width: html.dataset.layerWidth,
        height: html.dataset.layerHeight,
        z: html.dataset.layerZ,
        position: getComputedStyle(html).position,
        flowWrapper: html.dataset.flowWrapper,
      };
    });
    expect(groupAudit).toMatchObject({ parentId: "card-surface", layout: "grid", density: "dense", position: "absolute", flowWrapper: "false" });
    const nestedChildAudit = await page.locator(`[data-composition-node="${nestedId}"] [data-composition-kind="module"]`).evaluate((element) => {
      const html = element as HTMLElement;
      return {
        id: html.dataset.compositionNode,
        parentId: html.dataset.parentId,
        x: html.dataset.layerX,
        y: html.dataset.layerY,
        width: html.dataset.layerWidth,
        height: html.dataset.layerHeight,
        z: html.dataset.layerZ,
        position: getComputedStyle(html).position,
        flowWrapper: html.dataset.flowWrapper,
      };
    });
    expect(nestedChildAudit).toMatchObject({ parentId: nestedId, position: "absolute", flowWrapper: "false" });
    await page.getByTestId("card-preview-phone").screenshot({ path: path.join(proofRoot, "15-actual-authoring-studio.png") });

    await page.getByTestId("studio-preview").click();
    await expect(page.getByTestId("studio-editor-rail")).toHaveCount(0);
    await expect(page.getByText("LOVE & THEFT", { exact: true }).first()).toBeVisible();
    await page.getByTestId("card-preview-phone").screenshot({ path: path.join(proofRoot, "16-actual-authoring-preview.png") });
    await page.getByTestId("studio-preview").click();
    await page.getByTestId("preview-live-device").click();
    await expect(page.getByTestId("live-device-qr-panel")).toHaveAttribute("data-preview-status", "ready", { timeout: 15_000 });
    const href = await page.getByTestId("preview-url-text").getAttribute("href");
    if (!href) throw new Error("Live Device URL was not generated.");
    const live = new URL(href);
    phoneContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const phone = await phoneContext.newPage();
    await phone.goto(`http://127.0.0.1:3050${live.pathname}${live.search}`, { waitUntil: "domcontentloaded" });
    await expect(phone.getByTestId("preview-live-page")).toBeVisible();
    await expect(phone.locator('[data-card-surface-layered="true"]')).toBeVisible();
    await expect(phone.locator(`[data-composition-node="${nestedId}"] [data-composition-kind="module"]`)).toHaveCount(1);
    await expect(phone.getByText("LOVE & THEFT", { exact: true })).toBeVisible();
    await expect(phone.getByText("LOVE & THEFT · OFFICIAL", { exact: true })).toBeVisible();
    await expect(phone.getByTestId(`composition-inline-text-${bodyId}`)).toContainText("Music brings us closer");
    expect(await phone.locator(`[data-signature-family="${EVERENCORE_LOVE_AND_THEFT_FAMILY_ID}"][data-signature-classification="live-action"]`).count()).toBeGreaterThanOrEqual(6);
    expect(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const backdrop = phone.locator('[data-card-surface-viewport-backdrop="true"]');
    const backdropBox = await backdrop.boundingBox();
    expect(backdropBox?.x).toBe(0);
    expect(backdropBox?.width).toBe(390);
    const phoneSurfaceBox = await phone.locator('[data-layered-region-id="card-surface"]').boundingBox();
    const phoneGroupBox = await phone.locator('[data-composition-group]').boundingBox();
    const phoneNestedBox = await phone.locator(`[data-composition-node="${nestedId}"]`).boundingBox();
    if (!phoneSurfaceBox || !phoneGroupBox || !phoneNestedBox) throw new Error("Live Device geometry audit targets were unavailable.");
    expect(phoneGroupBox.x).toBeGreaterThanOrEqual(phoneSurfaceBox.x - .5);
    expect(phoneGroupBox.x + phoneGroupBox.width).toBeLessThanOrEqual(phoneSurfaceBox.x + phoneSurfaceBox.width + .5);
    await phone.screenshot({ path: path.join(proofRoot, "17-actual-authoring-live-device-390.png"), fullPage: true });
    writeFileSync(path.join(proofRoot, "actual-authoring-dom-audit.json"), `${JSON.stringify({
      contract: "studioActualLayeredAuthoringJourney@1.0.0",
      route: "http://127.0.0.1:3050/review/studio",
      viewport: { width: 390, height: 844 },
      parentMode: "layered",
      flowGapApplied: false,
      nodes: domAudit,
      group: groupAudit,
      nestedChild: nestedChildAudit,
      phoneGeometry: { surface: phoneSurfaceBox, group: phoneGroupBox, nestedContainer: phoneNestedBox, fullBleedBackdrop: backdropBox },
      checks: { leatherAppliedInStudio: true, imageAddedInStudio: true, textBoxesAddedInStudio: true, directTyping: true, sixCuratedActionsAddedInStudio: true, groupedAndDragged: true, nestedContainerAddedInStudio: true, nestedTextTargetedCorrectly: true, saveReloadExact: true, previewParity: true, liveDeviceParity: true, noHorizontalOverflow: true },
      productOwnerAcceptance: "pending",
    }, null, 2)}\n`);
  } finally {
    await phoneContext?.close();
    const current = await page.request.get("/api/card/draft");
    if (current.ok()) {
      const state = await current.json() as { revision: number };
      await page.request.put("/api/card/draft", { data: { draft: baseline.draft, expectedRevision: state.revision } });
    }
  }
});

function actionsForProof() {
  return ["nested-proof-spotify", "nested-proof-watch", "nested-proof-tour", "nested-proof-tickets", "nested-proof-merch", "nested-proof-contact"];
}
