import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { TapConnectCardConfig } from "@/lib/brand/tap-card";
import { canonicalizeExperienceConfig, projectExperiencePage } from "@/lib/fusion/card/experience-pages";
import type { CreativeCompositionBlock, CreativeCompositionNode } from "@/lib/fusion/creative-studio/composition";

const enabled = process.env.STUDIO_LAYERED_PRECISION_ACCEPTANCE === "1";
const leaveFixture = process.env.STUDIO_LAYERED_PRECISION_LEAVE_FIXTURE === "1";
const proofRoot = path.join("docs", "product-reconstitution", "creative-studio-platform", "proofs", "phase1-slice1-layered-precision");

function moduleNode(input: Partial<CreativeCompositionNode> & Pick<CreativeCompositionNode, "id" | "primitive" | "x" | "y" | "width" | "height" | "zIndex">): CreativeCompositionNode {
  return {
    compositionKind: "module",
    parentId: null,
    siblingOrder: input.zIndex,
    visible: true,
    locked: false,
    props: {},
    ...input,
  };
}

function precisionFixture(previous: CreativeCompositionBlock): CreativeCompositionBlock {
  const containerId = "precision-nested-container";
  return {
    ...previous,
    id: "phase1-slice1-layered-precision",
    label: "Phase 1 Slice 1 · Layered Precision Acceptance",
    nodes: [
      moduleNode({ id: "precision-text", primitive: "text", name: "Precision Text", x: .08, y: .08, width: .25, height: .12, zIndex: 1, props: { elementKind: "text", text: "Placement", textHeightMode: "fixed", textFixedHeightPx: 72, effectPreset: "glow" } }),
      moduleNode({ id: "precision-image", primitive: "image", name: "Precision Image", x: .4, y: .22, width: .22, height: .16, zIndex: 2, props: { elementKind: "image", src: "/marketing/use-cases/venues.jpg", alt: "Precision fixture", fit: "cover" } }),
      moduleNode({ id: "precision-button", primitive: "button", name: "Precision Button", x: .7, y: .46, width: .2, height: .11, zIndex: 3, props: { elementKind: "button", text: "Open", actionType: "url", url: "https://example.com", placementFrameHeightMode: "custom" } }),
      {
        id: containerId,
        primitive: "frame",
        compositionKind: "container",
        parentId: null,
        siblingOrder: 4,
        name: "Nested Layered Container",
        x: .08,
        y: .64,
        width: .84,
        height: .29,
        zIndex: 4,
        visible: true,
        locked: false,
        props: { componentKind: "container", elementKind: "container", layout: "layered", layeredHeightPx: 220, padding: 8 },
      },
      moduleNode({ id: "precision-nested-text", primitive: "text", name: "Nested Text", parentId: containerId, x: .07, y: .12, width: .25, height: .2, zIndex: 1, props: { elementKind: "text", text: "Nested", textHeightMode: "fixed", textFixedHeightPx: 44 } }),
      moduleNode({ id: "precision-nested-image", primitive: "image", name: "Nested Image", parentId: containerId, x: .4, y: .35, width: .2, height: .2, zIndex: 2, props: { elementKind: "image", src: "/tap-connect-mark.png", alt: "Nested fixture", fit: "cover" } }),
      moduleNode({ id: "precision-nested-button", primitive: "button", name: "Nested Button", parentId: containerId, x: .7, y: .58, width: .2, height: .2, zIndex: 3, props: { elementKind: "button", text: "Nested action", actionType: "url", url: "https://example.com/nested", placementFrameHeightMode: "custom" } }),
    ],
    groups: [],
    parentAuthority: { version: 1, layout: "flow", cardGapPx: 12 },
    compositionMode: { version: 1, mode: "layered", layeredHeightPx: 760, layeredPlacementInitialized: true, bounds: "constrain" },
    compositionDensity: { version: 1, mode: "standard" },
    safeAreaPaddingPx: 12,
    background: { kind: "solid", value: "#111827", opacity: 1, source: "local" },
    mobileFallback: "scale",
  };
}

function seedDraft(draft: TapConnectCardConfig): TapConnectCardConfig {
  const pageId = draft.experience?.defaultPageId;
  const projected = projectExperiencePage(draft, pageId);
  if (!projected.rootComposition) throw new Error("Acceptance draft has no root composition.");
  return canonicalizeExperienceConfig({ ...projected, rootComposition: precisionFixture(projected.rootComposition) }, pageId);
}

async function chooseToolbarItem(page: Page, menu: string, itemTestId: string) {
  await page.getByRole("button", { name: menu }).click();
  await page.getByTestId(itemTestId).click();
}

test("proves Layered precision and selection truth in the canonical desktop and phone Studio", async ({ page }) => {
  test.skip(!enabled, "Set STUDIO_LAYERED_PRECISION_ACCEPTANCE=1 for the isolated local fixture journey");
  test.setTimeout(180_000);
  page.setDefaultTimeout(15_000);
  mkdirSync(proofRoot, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/dashboard/card/edit", { waitUntil: "networkidle" });
  const baselineResponse = await page.request.get("/api/card/draft");
  expect(baselineResponse.ok()).toBeTruthy();
  const baseline = await baselineResponse.json() as { draft: TapConnectCardConfig; revision: number };

  try {
    const seeded = await page.request.put("/api/card/draft", { data: { draft: seedDraft(structuredClone(baseline.draft)), expectedRevision: baseline.revision } });
    expect(seeded.ok()).toBeTruthy();
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByTestId("studio-reconstitution-shell")).toBeVisible();
    await expect(page.locator('[data-card-surface-layered="true"]')).toBeVisible();

    await page.getByTestId("studio-select-multiple").click();
    for (const id of ["precision-text", "precision-image", "precision-button"]) await page.locator(`[data-composition-node="${id}"]`).click();
    await expect(page.getByTestId("studio-composition-multi-toolbar")).toContainText("3 Modules selected · same parent");

    await page.getByRole("button", { name: "Outline", exact: true }).click();
    for (const id of ["precision-text", "precision-image", "precision-button"]) await expect(page.getByTestId(`studio-layer-${id}`).getByRole("button").first()).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("studio-drawer-close").click();

    const beforeAlign = await page.locator('[data-composition-node="precision-image"]').boundingBox();
    await chooseToolbarItem(page, "Align selection", "studio-multi-align-left");
    const textAligned = await page.locator('[data-composition-node="precision-text"]').boundingBox();
    const imageAligned = await page.locator('[data-composition-node="precision-image"]').boundingBox();
    const buttonAligned = await page.locator('[data-composition-node="precision-button"]').boundingBox();
    expect(textAligned && imageAligned && buttonAligned).toBeTruthy();
    expect(Math.max(textAligned!.x, imageAligned!.x, buttonAligned!.x) - Math.min(textAligned!.x, imageAligned!.x, buttonAligned!.x)).toBeLessThan(2);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    expect((await page.locator('[data-composition-node="precision-image"]').boundingBox())!.x).toBeCloseTo(beforeAlign!.x, 0);
    await page.getByRole("button", { name: "Redo", exact: true }).click();

    await chooseToolbarItem(page, "Distribute selection", "studio-multi-distribute-vertical");
    await chooseToolbarItem(page, "Match selection size", "studio-multi-match-both");
    await chooseToolbarItem(page, "More selection actions", "studio-multi-tidy");
    await page.screenshot({ path: path.join(proofRoot, "01-desktop-multiselect-toolbar.png") });

    await page.getByTestId("studio-composition-multi-toolbar").getByRole("button", { name: "Cancel" }).click();
    await page.locator('[data-composition-node="precision-button"]').click();
    await page.getByTestId("studio-composition-object-toolbar").getByRole("button", { name: "Open Position" }).click();
    await expect(page.getByTestId("studio-layered-x")).toBeVisible();
    const beforeUnitSwitch = await page.request.get("/api/card/draft").then((response) => response.json()) as { draft: TapConnectCardConfig; revision: number };
    await page.getByRole("button", { name: "px", exact: true }).click();
    const afterUnitSwitch = await page.request.get("/api/card/draft").then((response) => response.json()) as { draft: TapConnectCardConfig; revision: number };
    expect(afterUnitSwitch.revision).toBe(beforeUnitSwitch.revision);
    expect(afterUnitSwitch.draft).toEqual(beforeUnitSwitch.draft);
    const xPx = Number(await page.getByTestId("studio-layered-x").inputValue());
    await page.getByTestId("studio-layered-x").fill(String(xPx + 8));
    await page.getByTestId("studio-layered-x").blur();
    await page.getByTestId("studio-layered-rotation").fill("30");
    await page.getByTestId("studio-layered-rotation").blur();
    await expect(page.getByTestId("studio-layered-rotation")).toHaveValue("30");
    await page.getByTestId("studio-composition-inspector").getByRole("button", { name: "Reset", exact: true }).click();
    await expect(page.getByTestId("studio-layered-rotation")).toHaveValue("0");
    await page.getByTestId("studio-layered-rotation").fill("30");
    await page.getByTestId("studio-layered-rotation").blur();
    await page.getByTestId("studio-frame-diagnostics-control").getByRole("checkbox").check();
    await expect(page.getByTestId("studio-frame-diagnostics-precision-button").locator('[data-frame="placement"]')).toBeVisible();
    await expect(page.getByTestId("studio-frame-diagnostics-precision-button").locator('[data-frame="visual"]')).toBeVisible();
    await expect(page.getByTestId("studio-frame-diagnostics-precision-button").locator('[data-frame="touch"]')).toBeVisible();
    await page.getByRole("button", { name: "Close Inspector" }).click();

    const rotateHandle = page.getByTestId("studio-layer-rotate-precision-button");
    const handleBox = await rotateHandle.boundingBox();
    if (!handleBox) throw new Error("Rotation handle unavailable.");
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + 52, handleBox.y + 18, { steps: 5 });
    await page.keyboard.down("Shift");
    await page.mouse.move(handleBox.x + 58, handleBox.y + 44, { steps: 3 });
    await page.mouse.up();
    await page.keyboard.up("Shift");
    await page.getByTestId("studio-composition-object-toolbar").getByRole("button", { name: "Open Position" }).click();
    const snappedRotation = Number(await page.getByTestId("studio-layered-rotation").inputValue());
    expect(snappedRotation % 15).toBe(0);
    await page.getByRole("button", { name: "Close Inspector" }).click();

    await page.getByTestId("studio-select-multiple").click();
    await page.locator('[data-composition-node="precision-button"]').click();
    for (const id of ["precision-text", "precision-image", "precision-button"]) await page.locator(`[data-composition-node="${id}"]`).click();
    await page.getByTestId("studio-composition-group-selected").click();
    await expect(page.getByTestId("studio-layered-group-envelope")).toBeVisible();
    await page.getByTestId("studio-composition-group-toolbar").getByRole("button", { name: "Move / Resize" }).click();
    await page.getByTestId("studio-group-rotation").fill("45");
    await page.getByTestId("studio-group-rotation").blur();
    await page.getByRole("button", { name: "Close Inspector" }).click();

    await page.getByTestId("studio-rail-layers").click();
    await page.getByTestId("studio-layer-precision-nested-text").getByRole("button").first().click();
    await page.getByTestId("studio-drawer-close").click();
    await page.getByTestId("studio-select-multiple").click();
    await page.getByTestId("studio-rail-layers").click();
    for (const id of ["precision-nested-image", "precision-nested-button"]) await page.getByTestId(`studio-layer-${id}`).getByRole("button").first().click();
    await page.getByTestId("studio-drawer-close").click();
    await expect(page.getByTestId("studio-composition-multi-toolbar")).toContainText("3 Modules selected · same parent");
    await chooseToolbarItem(page, "Align selection", "studio-multi-align-top");
    await chooseToolbarItem(page, "Distribute selection", "studio-multi-distribute-horizontal");
    await page.getByTestId("studio-composition-multi-toolbar").getByRole("button", { name: "Cancel" }).click();

    await page.getByTestId("studio-rail-layers").click();
    await page.getByTestId("studio-layer-precision-nested-image").getByRole("button").first().click();
    await page.getByTestId("studio-drawer-close").click();
    await page.getByTestId("studio-composition-object-toolbar").getByRole("button", { name: /^Edit/ }).click();
    await expect(page.getByTestId("studio-selection-breadcrumb")).toContainText("Nested Layered Container › Nested Image");
    await page.getByRole("button", { name: "px", exact: true }).click();
    await expect(page.getByTestId("studio-layered-x")).toBeVisible();
    await page.getByTestId("studio-layered-rotation").fill("15");
    await page.getByTestId("studio-layered-rotation").blur();
    await page.getByRole("button", { name: "Close Inspector" }).click();

    const save = page.getByTestId("studio-save");
    if (await save.isEnabled()) await save.click();
    await expect(save).toBeDisabled();
    const saved = await page.request.get("/api/card/draft").then((response) => response.json()) as { draft: TapConnectCardConfig };
    const serializedDraft = JSON.stringify(saved.draft);
    expect(serializedDraft).not.toMatch(/frameDiagnostics|geometryUnit|visualFrame|touchFrame/);
    for (const id of ["precision-text", "precision-image", "precision-button", "precision-nested-container", "precision-nested-text", "precision-nested-image", "precision-nested-button"]) expect(serializedDraft).toContain(id);
    expect(serializedDraft).toContain("https://example.com/nested");
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator('[data-composition-node="precision-button"]')).toBeVisible();
    await page.getByTestId("studio-preview").click();
    await expect(page.getByTestId("studio-preview")).toContainText("Edit");
    await page.getByTestId("studio-preview").click();
    await expect(page.getByTestId("studio-preview")).toContainText("Preview");

    await page.setViewportSize({ width: 430, height: 900 });
    await expect(page.getByTestId("studio-select-multiple-mobile")).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId("studio-select-multiple-mobile")).toBeVisible();
    await page.getByRole("button", { name: "Outline", exact: true }).click();
    await page.getByTestId("studio-layer-precision-nested-text").getByRole("button").first().click();
    await page.getByTestId("studio-drawer-close").click();
    await page.getByTestId("studio-select-multiple-mobile").click();
    await page.getByRole("button", { name: "Outline", exact: true }).click();
    await page.getByTestId("studio-layer-precision-nested-image").getByRole("button").first().click();
    await page.getByTestId("studio-drawer-close").click();
    await expect(page.getByTestId("studio-mobile-selection-strip")).toContainText("2 selected");
    await expect(page.getByTestId("studio-composition-multi-toolbar")).toBeVisible();
    await page.screenshot({ path: path.join(proofRoot, "02-phone-multiselect-visible.png") });
  } finally {
    if (!leaveFixture) {
      const current = await page.request.get("/api/card/draft");
      if (current.ok()) {
        const currentPayload = await current.json() as { revision: number };
        const restored = await page.request.put("/api/card/draft", { data: { draft: baseline.draft, expectedRevision: currentPayload.revision } });
        expect(restored.ok()).toBeTruthy();
      }
    }
  }
});
